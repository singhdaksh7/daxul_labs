import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createRazorpayOrder } from '@/lib/razorpay';

const retrySchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
  email: z.string().trim().email(),
});

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = retrySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Valid Order Number and matching Email are required to retry payment.' },
        { status: 400 }
      );
    }

    const { orderNumber, email } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order || order.customerEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Order not found matching those details.' },
        { status: 404 }
      );
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'This order has already been paid for.', alreadyPaid: true },
        { status: 400 }
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This order was cancelled. Please place a new order.' },
        { status: 400 }
      );
    }

    // Initialize fresh Razorpay Order for this existing order
    const razorpayOrder = await createRazorpayOrder(order.totalAmount, order.orderNumber, {
      orderId: order.id,
      customerEmail: order.customerEmail,
      retry: 'true',
    });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: razorpayOrder.id },
      });

      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          gateway: 'razorpay',
          gatewayOrderId: razorpayOrder.id,
          amount: order.totalAmount,
          currency: 'INR',
          status: 'created',
          method: 'online',
          metadata: { isRetry: true },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: `New payment attempt initialized (Razorpay Order ${razorpayOrder.id})`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Retry Payment Error:', err);
    return NextResponse.json(
      { error: 'Failed to initialize payment retry. Please try again.' },
      { status: 500 }
    );
  }
}
