import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createRazorpayOrder } from '@/lib/razorpay';
import { computeCheckout, PricingError, type PricedLine } from '@/lib/pricing';
import { maybeReleaseExpiredReservations } from '@/lib/reservations';
import { reservationExpiry } from '@/lib/reservationPlan';

/**
 * Request payload (client prices are NEVER trusted; optional price hints are only
 * compared against the server result and rejected on mismatch):
 * {
 *   items: [{ productId, quantity, variantSelections: [{groupId, variantId}], customizations: {fieldId: value} }],
 *   couponCode?, paymentMethod?: 'prepaid' | 'cod', shippingMethod?: 'STANDARD' | 'EXPRESS',
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
  shippingMethod: z.enum(['STANDARD', 'EXPRESS']).optional().nullable(),
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

async function releaseOrder(orderId: string, lines: PricedLine[], couponId: string | null) {
  // Compensating transaction when Razorpay order creation fails: restore reserved stock + coupon use.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled', paymentStatus: 'failed', stockReleasedAt: new Date(), reservationExpiresAt: null },
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
    const { items, couponCode, paymentMethod, customer, shippingMethod } = parsed.data;
    const clientTotal = parsed.data.expectedTotal ?? parsed.data.totalAmount;

    // Free any expired prepaid reservations first so their stock is purchasable (throttled, never throws).
    await maybeReleaseExpiredReservations();

    // 1. Authoritative computation: the SAME function /api/quote uses.
    const comp = await computeCheckout({ items, couponCode, paymentMethod, shippingMethod });
    if (comp.issues.length) {
      return NextResponse.json({ error: comp.issues[0].message, issues: comp.issues }, { status: 400 });
    }
    const cart = { lines: comp.lines, subtotal: comp.subtotal };

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

    const { settings } = comp;
    const shippingFee = comp.shipping.fee;
    const shippingMethodFinal = comp.shipping.method!;
    const codFee = comp.codFee;
    const discountAmount = comp.discountAmount;
    const appliedCouponId = comp.appliedCoupon?.id ?? null;
    const appliedCouponCode = comp.appliedCoupon?.code ?? null;
    const couponUsageLimit = comp.appliedCoupon?.usageLimit ?? null;
    const finalTotal = comp.total;

    if (clientTotal !== undefined && Math.abs(clientTotal - finalTotal) > 0.01) {
      return NextResponse.json(
        { error: 'Order total does not match current prices. Please refresh your cart and try again.', serverTotal: finalTotal },
        { status: 400 },
      );
    }

    const now = new Date();
    // Only unpaid prepaid orders hold stock on a timer. COD (and zero-total) orders keep stock.
    const reservationExpiresAt = reservationExpiry(paymentMethod, finalTotal, now, settings.reservationMinutes);

    const prefix = (settings.orderPrefix || 'DX').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'DX';
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
          shippingMethod: shippingMethodFinal,
          reservationExpiresAt,
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
      subtotal: comp.subtotal,
      discountAmount,
      shippingFee,
      shippingMethod: shippingMethodFinal,
      codFee,
      reservationExpiresAt: reservationExpiresAt ? reservationExpiresAt.toISOString() : null,
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
