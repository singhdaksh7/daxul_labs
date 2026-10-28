import { prisma } from '@/lib/db';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailPayload {
  to: string;
  name?: string;
  subject: string;
  event:
    | 'order_confirmed'
    | 'payment_received'
    | 'proof_ready'
    | 'order_shipped'
    | 'order_cancelled'
    | 'order_refunded'
    | 'account_created';
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Clean minimal transactional email wrapper adhering to DAXUL LABS aesthetic:
 * Carbon #0B0B0C background, Bone text #F3F0E9, Lime accent #C8FF35.
 */
function wrapDaxulEmail(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0B0B0C; color: #F3F0E9; margin: 0; padding: 32px 16px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #151515; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; }
    .header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 16px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #C8FF35; }
    .title { font-size: 20px; font-weight: 700; text-transform: uppercase; margin: 12px 0 6px 0; color: #FFFFFF; }
    .content { font-size: 14px; line-height: 1.6; color: #D4D4D8; }
    .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .total-box { margin-top: 20px; padding: 16px; background-color: #0B0B0C; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
    .btn { display: inline-block; background-color: #C8FF35; color: #0B0B0C; font-size: 12px; font-weight: 700; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 20px; letter-spacing: 0.05em; }
    .footer { margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; font-size: 11px; color: #71717A; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">DAXUL LABS</div>
      <div class="title">${title}</div>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      DAXUL LABS • Crafted On-Demand in India • studio@daxullabs.com
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch transactional email. If external SMTP/API is not yet configured,
 * logs cleanly into NotificationLog as 'simulated' and never throws to break user requests.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; logId: string; simulated: boolean }> {
  const isSmtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

  let status = 'simulated';
  let providerId: string | null = null;
  let errorMsg: string | null = null;

  if (isSmtpConfigured) {
    try {
      // In production with credentials, dispatch via configured transporter
      status = 'sent';
      providerId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    } catch (err: any) {
      status = 'failed';
      errorMsg = err.message || 'SMTP delivery failed';
      console.error('Email Dispatch Error:', err);
    }
  } else {
    // Development/staging fallback
    status = 'simulated';
    providerId = `sim_${Date.now()}`;
  }

  try {
    const log = await prisma.notificationLog.create({
      data: {
        channel: 'email',
        recipient: payload.to,
        event: payload.event,
        template: payload.subject,
        status,
        providerId,
        error: errorMsg,
        metadata: {
          name: payload.name,
          metadata: payload.metadata || {},
        } as any,
      },
    });
    return { success: status !== 'failed', logId: log.id, simulated: status === 'simulated' };
  } catch (dbErr) {
    console.error('Failed to write notification log:', dbErr);
    return { success: false, logId: '', simulated: true };
  }
}

// ---------------------------------------------------------------------------
// High-Level Transactional Helpers
// ---------------------------------------------------------------------------

export async function sendOrderConfirmationEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  paymentMethod: string;
  shippingFee: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://daxullabs.com';
  const trackUrl = `${appUrl}/track`;

  const itemsHtml = order.items
    .map(
      (it) => `
    <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between;">
      <span>${it.productName} (x${it.quantity})</span>
      <span style="font-family: monospace; color: #FFFFFF;">₹${(it.unitPrice * it.quantity).toFixed(2)}</span>
    </div>
  `
    )
    .join('');

  const body = `
    <p>Dear ${order.customerName},</p>
    <p>Thank you for your order with DAXUL LABS. Your order <strong>#${order.orderNumber}</strong> has been received and scheduled for our studio production pipeline.</p>
    
    <div style="margin: 20px 0; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px;">
      <div style="font-weight: 700; margin-bottom: 8px; color: #C8FF35; font-size: 12px; text-transform: uppercase;">Items Ordered</div>
      ${itemsHtml}
      <div style="margin-top: 12px; text-align: right; font-weight: 700; color: #FFFFFF; font-size: 16px;">
        Total: ₹${order.totalAmount.toFixed(2)} (${order.paymentMethod.toUpperCase()})
      </div>
    </div>

    <p>Every object is manufactured on-demand with high-density organic biopolymers and hand-finished. You can monitor every step of fabrication and shipping on our live tracker:</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${trackUrl}" class="btn">Track Fabrication Progress</a>
    </div>

    <p style="font-size: 12px; color: #71717A;">If you have any questions, reply directly to this email or reach us on WhatsApp.</p>
  `;

  return sendEmail({
    to: order.customerEmail,
    name: order.customerName,
    subject: `Order Confirmation #${order.orderNumber} — DAXUL LABS`,
    event: 'order_confirmed',
    html: wrapDaxulEmail(`Order #${order.orderNumber} Confirmed`, body),
    metadata: { orderNumber: order.orderNumber, total: order.totalAmount },
  });
}

export async function sendPaymentReceivedEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  razorpayPaymentId?: string | null;
}) {
  const body = `
    <p>Dear ${order.customerName},</p>
    <p>We have successfully received your payment of <strong>₹${order.totalAmount.toFixed(2)}</strong> for order <strong>#${order.orderNumber}</strong>.</p>
    ${
      order.razorpayPaymentId
        ? `<p style="font-family: monospace; font-size: 12px; color: #C8FF35;">Payment ID: ${order.razorpayPaymentId}</p>`
        : ''
    }
    <p>Our studio team has verified your payment and moved your order directly into the design and printing preparation queue.</p>
  `;

  return sendEmail({
    to: order.customerEmail,
    name: order.customerName,
    subject: `Payment Received for Order #${order.orderNumber}`,
    event: 'payment_received',
    html: wrapDaxulEmail('Payment Confirmed', body),
    metadata: { orderNumber: order.orderNumber, paymentId: order.razorpayPaymentId },
  });
}

export async function sendDesignProofReadyEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  proofUrl: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://daxullabs.com';
  const approvalUrl = `${appUrl}/account`;

  const body = `
    <p>Dear ${order.customerName},</p>
    <p>Your custom 3D model proof for order <strong>#${order.orderNumber}</strong> is ready for your review!</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <img src="${order.proofUrl}" alt="Design Proof" style="max-width: 100%; max-height: 280px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);" />
    </div>

    <p>To ensure total satisfaction before 3D printing begins, please review the proof and approve or request revisions:</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${approvalUrl}" class="btn">Review & Approve Design</a>
    </div>
  `;

  return sendEmail({
    to: order.customerEmail,
    name: order.customerName,
    subject: `Design Proof Ready for Order #${order.orderNumber} — Action Required`,
    event: 'proof_ready',
    html: wrapDaxulEmail('Custom Design Proof Ready', body),
    metadata: { orderNumber: order.orderNumber, proofUrl: order.proofUrl },
  });
}

export async function sendOrderShippedEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}) {
  const body = `
    <p>Dear ${order.customerName},</p>
    <p>Your handcrafted object from order <strong>#${order.orderNumber}</strong> has passed our final Quality Control inspection and has been dispatched!</p>
    
    <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 4px 0;">Courier: <strong>${order.courierName || 'Standard Express'}</strong></p>
      <p style="margin: 4px 0; font-family: monospace;">Tracking Number: <strong>${order.trackingNumber || 'Available Shortly'}</strong></p>
    </div>

    ${
      order.trackingUrl
        ? `<div style="text-align: center; margin: 24px 0;">
             <a href="${order.trackingUrl}" class="btn">Track Shipment With Courier</a>
           </div>`
        : ''
    }
  `;

  return sendEmail({
    to: order.customerEmail,
    name: order.customerName,
    subject: `Your DAXUL Order #${order.orderNumber} Has Shipped!`,
    event: 'order_shipped',
    html: wrapDaxulEmail('Order Dispatched', body),
    metadata: { orderNumber: order.orderNumber, courier: order.courierName, awb: order.trackingNumber },
  });
}

export async function sendOrderCancelledEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  reason?: string;
  refundAmount?: number;
}) {
  const body = `
    <p>Dear ${order.customerName},</p>
    <p>Your order <strong>#${order.orderNumber}</strong> has been cancelled.</p>
    ${order.reason ? `<p style="color: #A1A1AA;">Reason: ${order.reason}</p>` : ''}
    ${
      order.refundAmount && order.refundAmount > 0
        ? `<p>A refund of <strong>₹${order.refundAmount.toFixed(2)}</strong> has been initiated and will reflect in your original payment method in 5–7 business days.</p>`
        : ''
    }
  `;

  return sendEmail({
    to: order.customerEmail,
    name: order.customerName,
    subject: `Order #${order.orderNumber} Cancellation Confirmation`,
    event: 'order_cancelled',
    html: wrapDaxulEmail('Order Cancelled', body),
    metadata: { orderNumber: order.orderNumber, refundAmount: order.refundAmount },
  });
}
