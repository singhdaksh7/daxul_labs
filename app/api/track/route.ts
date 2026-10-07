import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Public order tracking. The caller must supply the order number AND either the
 * email or the phone number used at checkout. Any mismatch (unknown order,
 * wrong email/phone) yields the same generic 404 so the endpoint cannot be
 * used to discover which order numbers exist.
 *
 * Only customer-safe fields are returned: status, status timeline (status +
 * timestamp only; admin notes are never exposed), courier/tracking details and
 * item names/quantities/selections. No internal notes, QC notes, costs, prices,
 * addresses or payment data.
 */

const GENERIC_NOT_FOUND = 'We could not find an order matching those details. Please check your order number and email or phone.';

// Simple in-memory rate limiter: max 10 attempts per minute per IP.
const trackAttempts = new Map<string, { count: number; resetTime: number }>();
const LIMIT_PER_MINUTE = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (trackAttempts.size > 5000) {
    for (const [k, v] of trackAttempts) if (now > v.resetTime) trackAttempts.delete(k);
  }
  const record = trackAttempts.get(ip);
  if (!record || now > record.resetTime) {
    trackAttempts.set(ip, { count: 1, resetTime: now + 60000 });
    return false;
  }
  if (record.count >= LIMIT_PER_MINUTE) return true;
  record.count += 1;
  return false;
}

function digits(s: string): string {
  return s.replace(/\D/g, '');
}

/** Phone numbers match on their last 10 digits (ignores +91 / spaces / dashes). */
function phonesMatch(a: string, b: string): boolean {
  const da = digits(a);
  const db = digits(b);
  if (da.length < 7 || db.length < 7) return false;
  return da.slice(-10) === db.slice(-10);
}

function safeUrl(u: string | null): string | null {
  return u && /^https?:\/\//i.test(u) ? u : null;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many order tracking attempts. Please wait 1 minute.' },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim().toUpperCase() : '';
    // Accept `verificationInput` (legacy) or explicit `email` / `phone`.
    const verification = [body.verificationInput, body.email, body.phone]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim());

    if (!orderNumber || orderNumber.length > 64 || verification.length === 0 || verification.some((v) => v.length > 254)) {
      return NextResponse.json(
        { error: 'Both Order Number and matching Email or Phone are required to track an order.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        customerEmail: true,
        customerPhone: true,
        courierName: true,
        trackingNumber: true,
        trackingUrl: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            selectedFinish: true,
            selectedColor: true,
            selectedSize: true,
            variantSelections: true,
          },
        },
        statusHistory: {
          select: { status: true, timestamp: true }, // notes / adminEmail deliberately excluded
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    const verified =
      !!order &&
      verification.some(
        (v) =>
          v.toLowerCase() === order.customerEmail.trim().toLowerCase() || phonesMatch(v, order.customerPhone)
      );

    if (!order || !verified) {
      return NextResponse.json({ error: GENERIC_NOT_FOUND }, { status: 404 });
    }

    const items = order.items.map((it) => {
      const selections: { label: string; value: string }[] = [];
      if (Array.isArray(it.variantSelections)) {
        for (const raw of it.variantSelections as unknown[]) {
          if (raw && typeof raw === 'object') {
            const r = raw as Record<string, unknown>;
            const label = typeof r.group === 'string' ? r.group : '';
            const value = typeof r.variant === 'string' ? r.variant : '';
            if (value) selections.push({ label, value });
          }
        }
      }
      if (it.selectedFinish) selections.push({ label: 'Finish', value: it.selectedFinish });
      if (it.selectedColor) selections.push({ label: 'Color', value: it.selectedColor });
      if (it.selectedSize) selections.push({ label: 'Size', value: it.selectedSize });
      return { name: it.productName, quantity: it.quantity, selections };
    });

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        courierName: order.courierName,
        trackingNumber: order.trackingNumber,
        trackingUrl: safeUrl(order.trackingUrl),
        items,
        statusHistory: order.statusHistory.map((h) => ({ status: h.status, timestamp: h.timestamp })),
      },
    });
  } catch (err) {
    console.error('Order tracking API error:', err);
    return NextResponse.json({ error: 'Failed to process tracking request' }, { status: 500 });
  }
}
