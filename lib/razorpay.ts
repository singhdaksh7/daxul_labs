import crypto from 'crypto';
import Razorpay from 'razorpay';

export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.warn('Razorpay keys missing in environment variables.');
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

export async function createRazorpayOrder(
  amountInRupees: number,
  receiptId: string,
  notes?: Record<string, string>
) {
  const amountInPaise = Math.round(amountInRupees * 100);
  const razorpay = getRazorpayClient();
  if (!razorpay) {
    return {
      id: `order_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      status: 'created',
      notes: notes || {},
    };
  }

  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId,
    notes: notes || {},
  };

  return await razorpay.orders.create(options);
}

export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return generatedSignature === razorpaySignature;
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  webhookSignature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === webhookSignature;
}
