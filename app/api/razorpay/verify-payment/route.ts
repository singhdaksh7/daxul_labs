import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { prisma } from '@/lib/db';
import { markOrderPaid } from '@/lib/reservations';
import { sendPaymentReceivedEmail } from '@/lib/notifications/email';

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

    // 2. Atomically mark paid (race-safe against reservation expiry; see lib/reservations.ts markOrderPaid)
    const result = await prisma.$transaction(async (tx) => {
      const res = await markOrderPaid(tx, { razorpayOrderId }, { razorpayPaymentId, razorpaySignature, source: 'verify-payment' });
      if (res.orderId) {
        // Record PaymentTransaction for reconciliation
        const existingTx = await tx.paymentTransaction.findFirst({
          where: { gatewayPaymentId: razorpayPaymentId },
        });
        if (!existingTx) {
          const ord = await tx.order.findUnique({ where: { id: res.orderId }, select: { totalAmount: true } });
          await tx.paymentTransaction.create({
            data: {
              orderId: res.orderId,
              gateway: 'razorpay',
              gatewayOrderId: razorpayOrderId,
              gatewayPaymentId: razorpayPaymentId,
              amount: ord?.totalAmount ?? 0,
              status: 'captured',
              isReconciled: true,
              method: 'online',
            },
          });
        }
      }
      return res;
    });

    if (result.outcome === 'not_found') {
      return NextResponse.json({ error: 'Order record not found for payment' }, { status: 404 });
    }
    if (result.outcome === 'already_paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified and recorded',
        orderNumber: result.orderNumber,
      });
    }

    // Trigger confirmation email
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { orderNumber: true, customerName: true, customerEmail: true, totalAmount: true },
    });
    if (order) {
      sendPaymentReceivedEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount,
        razorpayPaymentId,
      }).catch((e) => console.error('Failed to send payment email:', e));
    }

    return NextResponse.json({
      success: true,
      message:
        result.outcome === 'paid_after_release_needs_attention'
          ? 'Payment received. Your order needs a quick manual check by our team; we will contact you shortly.'
          : 'Payment verified and order status updated successfully',
      orderNumber: result.orderNumber,
    });
  } catch (err: any) {
    console.error('Razorpay Signature Verification Error:', err);
    return NextResponse.json(
      { error: err.message || 'Signature verification and order update failed' },
      { status: 500 }
    );
  }
}
