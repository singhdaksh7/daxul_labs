import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { prisma } from '@/lib/db';
import { markOrderPaid } from '@/lib/reservations';

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
    const result = await prisma.$transaction((tx) =>
      markOrderPaid(tx, { razorpayOrderId }, { razorpayPaymentId, razorpaySignature, source: 'verify-payment' }),
    );

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
