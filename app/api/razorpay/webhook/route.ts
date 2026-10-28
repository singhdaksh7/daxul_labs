import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { prisma } from '@/lib/db';
import { markOrderPaid } from '@/lib/reservations';
import { sendPaymentReceivedEmail } from '@/lib/notifications/email';

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
      // Event already processed safely, return 200 OK
      return NextResponse.json({ status: 'ok', idempotent: true });
    }

    // 3. Process events
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = eventData.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount || 0;
      const paymentMethod = paymentEntity?.method;

      if (razorpayOrderId) {
        await prisma.$transaction(async (tx) => {
          await tx.processedWebhook.create({
            data: { id: eventId, event: eventName },
          });

          // Mark order paid race-safely
          const res = await markOrderPaid(tx, { razorpayOrderId }, { razorpayPaymentId, source: `webhook ${eventId}` });

          if (res.orderId) {
            // Record payment transaction for reconciliation
            await tx.paymentTransaction.create({
              data: {
                orderId: res.orderId,
                gateway: 'razorpay',
                gatewayOrderId: razorpayOrderId,
                gatewayPaymentId: razorpayPaymentId,
                amount: amountPaise / 100,
                status: 'captured',
                method: paymentMethod || 'online',
                isReconciled: true,
                metadata: { eventId, fee: paymentEntity?.fee, tax: paymentEntity?.tax },
              },
            });
          }
        });

        // Send payment confirmation email asynchronously (do not fail webhook)
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
      }
    } else if (eventName === 'payment.failed') {
      const paymentEntity = eventData.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;
      const errorDesc = paymentEntity?.error_description || 'Payment failed';

      await prisma.$transaction(async (tx) => {
        await tx.processedWebhook.create({
          data: { id: eventId, event: eventName },
        });

        if (razorpayOrderId) {
          const order = await tx.order.findUnique({ where: { razorpayOrderId } });
          if (order) {
            await tx.paymentTransaction.create({
              data: {
                orderId: order.id,
                gateway: 'razorpay',
                gatewayOrderId: razorpayOrderId,
                gatewayPaymentId: razorpayPaymentId,
                amount: (paymentEntity?.amount || 0) / 100,
                status: 'failed',
                errorDescription: errorDesc,
                method: paymentEntity?.method,
                isReconciled: false,
                metadata: { error: paymentEntity?.error_code, description: errorDesc },
              },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                status: order.status,
                note: `Payment attempt failed via gateway: ${errorDesc}`,
              },
            });
          }
        }
      });
    } else if (eventName === 'refund.processed' || eventName === 'refund.created') {
      const refundEntity = eventData.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;
      const amountPaise = refundEntity?.amount || 0;

      await prisma.$transaction(async (tx) => {
        await tx.processedWebhook.create({
          data: { id: eventId, event: eventName },
        });

        if (paymentId) {
          const order = await tx.order.findFirst({ where: { razorpayPaymentId: paymentId } });
          if (order) {
            await tx.orderRefund.create({
              data: {
                orderId: order.id,
                amount: amountPaise / 100,
                gatewayRefundId: refundId,
                reason: 'Webhook refund confirmed',
                status: 'completed',
                adminEmail: 'razorpay-webhook',
              },
            });
            await tx.order.update({
              where: { id: order.id },
              data: {
                refundStatus: 'full',
                refundedAmount: { increment: amountPaise / 100 },
              },
            });
          }
        }
      });
    } else {
      // Other events, record webhook as processed
      await prisma.processedWebhook.create({
        data: { id: eventId, event: eventName },
      });
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('Razorpay Webhook Error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
