import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createRazorpayOrder } from '@/lib/razorpay';
import { priceCart, PricingError, type PricedLine } from '@/lib/pricing';

/**
 * Request payload (client prices are NEVER trusted; optional price hints are only
 * compared against the server result and rejected on mismatch):
 * {
 *   items: [{ productId, quantity, variantSelections: [{groupId, variantId}], customizations: {fieldId: value} }],
 *   couponCode?, paymentMethod?: 'prepaid' | 'cod',
 *   customer: { name, email, phone, street, city, state, pincode, country? },
 *   expectedTotal?: number   // optional; 400 if it differs from the server total
 * }
 */
const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  variantSelections: z.array(z.object({ groupId: z.string().min(1), variantId: z.string().min(1) })).optional(),
  customizations: z.record(z.string(), z.unknown()).optional(),
  // optional client hints, verified only
  unitPrice: z.number().optional(),
  price: z.number().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1, 'Order must contain at least one item').max(50),
  couponCode: z.string().max(64).optional().nullable(),
  paymentMethod: z.enum(['prepaid', 'cod']).default('prepaid'),
  customer: z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().min(5).max(20),
    street: z.string().trim().min(1),
    city: z.string().trim().default(''),
    state: z.string().trim().default(''),
    pincode: z.string().trim().default(''),
    country: z.string().trim().optional(),
  }),
  expectedTotal: z.number().optional(),
  totalAmount: z.number().optional(),
});

class CheckoutError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const money = (n: number) => Math.round(n * 100) / 100;

async function releaseOrder(orderId: string, lines: PricedLine[], couponId: string | null) {
  // Compensating transaction when Razorpay order creation fails: restore reserved stock + coupon use.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled', paymentStatus: 'failed' },
      });
      await tx.orderStatusHistory.create({
        data: { orderId, status: 'cancelled', note: 'Payment gateway order creation failed; stock released' },
      });
      for (const l of lines) {
        for (const vid of l.stockPlan.variantIds) {
          const v = await tx.productVariant.update({ where: { id: vid }, data: { stock: { increment: l.quantity } } });
          await tx.inventoryAdjustment.create({
            data: { productId: l.productId, variantId: vid, delta: l.quantity, quantityAfter: v.stock ?? 0, reason: 'returned', note: 'Order creation failed' },
          });
        }
        if (l.stockPlan.productId) {
          const p = await tx.product.update({ where: { id: l.productId }, data: { stock: { increment: l.quantity } } });
          await tx.inventoryAdjustment.create({
            data: { productId: l.productId, delta: l.quantity, quantityAfter: p.stock, reason: 'returned', note: 'Order creation failed' },
          });
        }
      }
      if (couponId) {
        await tx.coupon.updateMany({ where: { id: couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
    });
  } catch (e) {
    console.error('Failed to release order after gateway error:', orderId, e);
  }
}

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: `Invalid checkout payload: ${first.path.join('.') || 'body'} - ${first.message}` },
        { status: 400 },
      );
    }
    const { items, couponCode, paymentMethod, customer } = parsed.data;
    const clientTotal = parsed.data.expectedTotal ?? parsed.data.totalAmount;

    // 1. Authoritative pricing from PostgreSQL
    const cart = await priceCart(items);

    // Reject mismatched client price hints
    for (let i = 0; i < items.length; i++) {
      const hint = items[i].unitPrice ?? items[i].price;
      if (hint !== undefined && Math.abs(hint - cart.lines[i].unitPrice) > 0.01) {
        return NextResponse.json(
          { error: `The price of "${cart.lines[i].productName}" has changed. Please refresh your cart.` },
          { status: 400 },
        );
      }
    }

    // 2. Settings: shipping, COD
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const freeShippingThreshold = settings?.freeShippingThreshold ?? 1999;
    const standardShippingFee = settings?.standardShippingFee ?? 99;

    if (paymentMethod === 'cod') {
      if (settings && !settings.globalCodEnabled) {
        return NextResponse.json({ error: 'Cash on delivery is currently unavailable. Please pay online.' }, { status: 400 });
      }
      const customPrepaid = settings?.customProductsPrepaidOnly ?? true;
      for (const l of cart.lines) {
        if (l.prepaidOnly || !l.codEnabled || l.customizable || (customPrepaid && l.customizations)) {
          return NextResponse.json(
            { error: `"${l.productName}" requires prepaid payment (COD not available).` },
            { status: 400 },
          );
        }
      }
    }

    const shippingFee = cart.subtotal >= freeShippingThreshold ? 0 : standardShippingFee;
    const codFee = paymentMethod === 'cod' && (settings?.codFeeEnabled ?? true) ? settings?.codFee ?? 50 : 0;

    // 3. Coupon (server-side; same semantics as before: invalid coupons are ignored)
    let discountAmount = 0;
    let appliedCouponId: string | null = null;
    let appliedCouponCode: string | null = null;
    let couponUsageLimit: number | null = null;
    if (couponCode && couponCode.trim()) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
      const now = new Date();
      if (
        coupon &&
        coupon.isActive &&
        cart.subtotal >= coupon.minOrderValue &&
        (!coupon.startDate || coupon.startDate <= now) &&
        (!coupon.expiryDate || coupon.expiryDate >= now) &&
        (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
      ) {
        discountAmount =
          coupon.discountType === 'percentage' ? (cart.subtotal * coupon.discountValue) / 100 : coupon.discountValue;
        discountAmount = money(Math.min(discountAmount, cart.subtotal));
        appliedCouponId = coupon.id;
        appliedCouponCode = coupon.code;
        couponUsageLimit = coupon.usageLimit;
      }
    }

    const finalTotal = money(Math.max(0, cart.subtotal - discountAmount + shippingFee + codFee));

    if (clientTotal !== undefined && Math.abs(clientTotal - finalTotal) > 0.01) {
      return NextResponse.json(
        { error: 'Order total does not match current prices. Please refresh your cart and try again.', serverTotal: finalTotal },
        { status: 400 },
      );
    }

    const prefix = (settings?.orderPrefix || 'DX').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'DX';
    const orderNumber = `${prefix}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

    // 4. Transaction: create order, reserve stock (+ ledger), count coupon use
    const createdOrder = await prisma.$transaction(async (tx) => {
      if (appliedCouponId) {
        const res = await tx.coupon.updateMany({
          where: {
            id: appliedCouponId,
            isActive: true,
            ...(couponUsageLimit ? { usedCount: { lt: couponUsageLimit } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (res.count === 0) throw new CheckoutError('This coupon has reached its usage limit.');
      }

      for (const l of cart.lines) {
        for (const vid of l.stockPlan.variantIds) {
          const res = await tx.productVariant.updateMany({
            where: { id: vid, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (res.count === 0) throw new CheckoutError(`Insufficient stock for "${l.productName}". Please reduce the quantity.`);
          const v = await tx.productVariant.findUniqueOrThrow({ where: { id: vid } });
          await tx.inventoryAdjustment.create({
            data: {
              productId: l.productId,
              variantId: vid,
              delta: -l.quantity,
              quantityAfter: v.stock ?? 0,
              reason: 'order',
              note: orderNumber,
            },
          });
        }
        if (l.stockPlan.productId) {
          const res = await tx.product.updateMany({
            where: { id: l.productId, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (res.count === 0) throw new CheckoutError(`Insufficient stock for "${l.productName}". Please reduce the quantity.`);
          const p = await tx.product.findUniqueOrThrow({ where: { id: l.productId }, select: { stock: true } });
          await tx.inventoryAdjustment.create({
            data: { productId: l.productId, delta: -l.quantity, quantityAfter: p.stock, reason: 'order', note: orderNumber },
          });
        }
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerName: customer.name,
          customerEmail: customer.email.toLowerCase(),
          customerPhone: customer.phone,
          street: customer.street,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          country: customer.country || 'India',
          totalAmount: finalTotal,
          discountAmount,
          shippingFee,
          codFee,
          couponCode: appliedCouponCode,
          paymentMethod,
          paymentStatus: 'pending',
          status: 'new',
          items: {
            create: cart.lines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              productImage: l.productImage,
              productSku: l.productSku,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              selectedFinish: l.selectedFinish,
              selectedColor: l.selectedColor,
              selectedSize: l.selectedSize,
              customizations: (l.customizations ?? undefined) as Prisma.InputJsonValue | undefined,
              customizationFee: l.customizationFee,
              variantSelections: (l.variantSelections.length ? l.variantSelections : undefined) as Prisma.InputJsonValue | undefined,
            })),
          },
          statusHistory: {
            create: { status: 'new', note: `Order initialized via ${paymentMethod.toUpperCase()} checkout` },
          },
        },
        include: { items: true },
      });
    });

    // 5. Razorpay order for prepaid
    let razorpayOrder: any = null;
    if (paymentMethod === 'prepaid' && finalTotal > 0) {
      try {
        razorpayOrder = await createRazorpayOrder(finalTotal, createdOrder.orderNumber, {
          orderId: createdOrder.id,
          customerEmail: createdOrder.customerEmail,
        });
        await prisma.order.update({ where: { id: createdOrder.id }, data: { razorpayOrderId: razorpayOrder.id } });
      } catch (gatewayErr) {
        await releaseOrder(createdOrder.id, cart.lines, appliedCouponId);
        throw gatewayErr;
      }
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
    if (err instanceof PricingError || err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Order Creation Transaction Error:', err);
    return NextResponse.json({ error: 'Failed to initialize secure checkout order' }, { status: 500 });
  }
}
