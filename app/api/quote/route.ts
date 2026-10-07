import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeCheckout } from '@/lib/pricing';
import { toQuoteResponse } from '@/lib/quoteResponse';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quote (public, no auth). Same computation as create-order (lib/pricing.ts computeCheckout).
 *
 * Request:
 * {
 *   items: [{ productId, quantity, variantSelections?: [{groupId, variantId}], customizations?: {fieldId: value} }],
 *   couponCode?: string, paymentMethod?: 'prepaid'|'cod', shippingMethod?: 'STANDARD'|'EXPRESS',
 *   pincode?: string   // accepted and format-checked; no pincode-based pricing exists yet
 * }
 * Response 200 (business problems are reported in `issues`, not thrown): see lib/quoteResponse.ts.
 * No cost data is ever returned.
 */
const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(100),
        variantSelections: z.array(z.object({ groupId: z.string().min(1), variantId: z.string().min(1) })).max(20).optional(),
        customizations: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(50),
  couponCode: z.string().max(64).optional().nullable(),
  paymentMethod: z.enum(['prepaid', 'cod']).optional(),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS']).optional().nullable(),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Invalid pincode').optional().or(z.literal('')),
});

// Light per-IP in-memory limiter: 90 quotes / minute / process.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: `Invalid quote request: ${first.path.join('.') || 'body'} - ${first.message}` }, { status: 400 });
  }
  try {
    const { items, couponCode, paymentMethod, shippingMethod } = parsed.data;
    const comp = await computeCheckout({ items, couponCode, paymentMethod, shippingMethod });
    return NextResponse.json(toQuoteResponse(comp), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('POST /api/quote', err);
    return NextResponse.json({ error: 'Could not calculate quote' }, { status: 500 });
  }
}
