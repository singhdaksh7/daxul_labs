import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRazorpayOrder } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, couponCode, paymentMethod = 'prepaid', customer } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    if (!customer || !customer.name || !customer.email || !customer.phone || !customer.street) {
      return NextResponse.json({ error: 'Complete customer shipping details required' }, { status: 400 });
    }

    // 1. Fetch products & custom field definitions from DB to compute authoritative prices
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { customFields: true },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    const validatedOrderItems: Array<{
      productId: string;
      productName: string;
      productImage: string;
      unitPrice: number;
      quantity: number;
      selectedFinish?: string;
      selectedColor?: string;
      selectedSize?: string;
      customizations?: any;
      customizationFee: number;
    }> = [];

    // 2. Validate stock & compute exact line item prices
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || product.isArchived) {
        return NextResponse.json(
          { error: `Product not found or no longer available: ${item.productId}` },
          { status: 400 }
        );
      }

      // Check COD constraints
      if (paymentMethod === 'cod' && (product.prepaidOnly || !product.codEnabled)) {
        return NextResponse.json(
          { error: `Item "${product.name}" requires prepaid payment (COD not available).` },
          { status: 400 }
        );
      }

      // Inventory check
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Only ${product.stock} left in stock.` },
          { status: 400 }
        );
      }

      // Compute customization fees from server customField registry
      let itemCustomizationFee = 0;
      if (item.customizations && typeof item.customizations === 'object') {
        for (const [fieldKey, fieldValue] of Object.entries(item.customizations)) {
          if (fieldValue) {
            const fieldDef = product.customFields.find(
              (cf) => cf.id === fieldKey || cf.label.toLowerCase() === fieldKey.toLowerCase()
            );
            if (fieldDef && fieldDef.fee > 0) {
              itemCustomizationFee += fieldDef.fee;
            }
          }
        }
      }

      const unitPrice = product.price;
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const lineTotal = (unitPrice + itemCustomizationFee) * quantity;
      calculatedSubtotal += lineTotal;

      validatedOrderItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || '',
        unitPrice,
        quantity,
        selectedFinish: item.selectedFinish || null,
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
        customizations: item.customizations || null,
        customizationFee: itemCustomizationFee,
      });
    }

    // 3. Load Site Settings for shipping & COD fees
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const freeShippingThreshold = siteSettings?.freeShippingThreshold ?? 1999;
    const standardShippingFee = siteSettings?.standardShippingFee ?? 99;
    const codFeeAmount = siteSettings?.codFee ?? 50;

    let shippingFee = calculatedSubtotal >= freeShippingThreshold ? 0 : standardShippingFee;
    let codFee = paymentMethod === 'cod' ? codFeeAmount : 0;

    // 4. Validate Coupon Server-side
    let discountAmount = 0;
    if (couponCode && typeof couponCode === 'string') {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      const now = new Date();
      if (
        coupon &&
        coupon.isActive &&
        calculatedSubtotal >= coupon.minOrderValue &&
        (!coupon.startDate || coupon.startDate <= now) &&
        (!coupon.expiryDate || coupon.expiryDate >= now) &&
        (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
      ) {
        if (coupon.discountType === 'percentage') {
          discountAmount = (calculatedSubtotal * coupon.discountValue) / 100;
        } else {
          discountAmount = coupon.discountValue;
        }
      }
    }

    // Enforce non-negative total
    const finalTotal = Math.max(0, calculatedSubtotal - discountAmount + shippingFee + codFee);
    const orderNumber = `DX-${Date.now().toString().slice(-6)}`;

    // 5. Wrap Order & Items Creation in PostgreSQL Transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: customer.name.trim(),
          customerEmail: customer.email.trim().toLowerCase(),
          customerPhone: customer.phone.trim(),
          street: customer.street.trim(),
          city: customer.city.trim(),
          state: customer.state.trim(),
          pincode: customer.pincode.trim(),
          country: customer.country || 'India',
          totalAmount: finalTotal,
          discountAmount,
          shippingFee,
          codFee,
          paymentMethod: paymentMethod === 'cod' ? 'cod' : 'prepaid',
          paymentStatus: 'pending',
          status: 'new',
          items: {
            create: validatedOrderItems,
          },
          statusHistory: {
            create: {
              status: 'new',
              note: `Order initialized via ${paymentMethod.toUpperCase()} checkout`,
            },
          },
        },
        include: { items: true },
      });

      return order;
    });

    // 6. Create Razorpay order if prepaid
    let razorpayOrder: any = null;
    if (paymentMethod === 'prepaid' && finalTotal > 0) {
      razorpayOrder = await createRazorpayOrder(
        finalTotal,
        createdOrder.orderNumber,
        {
          orderId: createdOrder.id,
          customerEmail: createdOrder.customerEmail,
        }
      );

      // Save razorpayOrderId to internal order
      await prisma.order.update({
        where: { id: createdOrder.id },
        data: { razorpayOrderId: razorpayOrder.id },
      });
    }

    return NextResponse.json({
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      totalAmount: finalTotal,
      razorpayOrderId: razorpayOrder ? razorpayOrder.id : null,
      amount: razorpayOrder ? razorpayOrder.amount : Math.round(finalTotal * 100),
      currency: razorpayOrder ? razorpayOrder.currency : 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Order Creation Transaction Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize secure checkout order' },
      { status: 500 }
    );
  }
}
