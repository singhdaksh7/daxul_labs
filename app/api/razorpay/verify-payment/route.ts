import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing Razorpay signature parameters' },
        { status: 400 }
      );
    }

    // 1. Verify HMAC Signature
    const isValid = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Razorpay payment signature' },
        { status: 400 }
      );
    }

    // 2. Load order from DB and verify status & expected amount
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order record not found for payment' }, { status: 404 });
    }

    // Check if order is already marked paid (idempotency check)
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified and recorded',
        orderNumber: order.orderNumber,
      });
    }

    // 3. Perform Transactional State Update & Atomic Stock Decrement
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Mark Order Paid
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: 'design_pending',
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      // Atomic Stock Decrement for each product in order (concurrency safe)
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Record Order Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'design_pending',
          note: `Prepaid payment verified via Razorpay Payment ID: ${razorpayPaymentId}`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order status updated successfully',
      orderNumber: updatedOrder.orderNumber,
    });
  } catch (err: any) {
    console.error('Razorpay Signature Verification Error:', err);
    return NextResponse.json(
      { error: err.message || 'Signature verification and order update failed' },
      { status: 500 }
    );
  }
}
