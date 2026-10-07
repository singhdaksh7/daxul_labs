import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { prisma } from '@/lib/db';
import { markOrderPaid } from '@/lib/reservations';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // 1. Verify Webhook HMAC Signature
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const eventData = JSON.parse(rawBody);
    const eventId = eventData.event_id || eventData.id || `evt_${Date.now()}`;
    const eventName = eventData.event;

    // 2. Check Webhook Idempotency (ProcessedWebhook Table)
    const existingWebhook = await prisma.processedWebhook.findUnique({
      where: { id: eventId },
    });

    if (existingWebhook) {
      // Event already processed safely, return 200 OK to prevent double processing
      return NextResponse.json({ status: 'ok', idempotent: true });
    }

    // 3. Process payment.captured or order.paid events
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = eventData.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      if (razorpayOrderId) {
        await prisma.$transaction(async (tx) => {
          // Record Webhook Idempotency Token
          await tx.processedWebhook.create({
            data: {
              id: eventId,
              event: eventName,
            },
          });

          // Race-safe paid transition (handles payments arriving after reservation expiry)
          await markOrderPaid(tx, { razorpayOrderId }, { razorpayPaymentId, source: `webhook ${eventId}` });
        });
      }
    } else {
      // Log event into ProcessedWebhook table to prevent re-processing
      await prisma.processedWebhook.create({
        data: {
          id: eventId,
          event: eventName,
        },
      });
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('Razorpay Webhook Error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
