import { NextRequest, NextResponse } from 'next/server';
import { getPublicEta } from '@/lib/shiprocket/publicRates';

export const dynamic = 'force-dynamic';

// In-memory per-IP limiter: 30 lookups / minute.
const hits = new Map<string, { count: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  const r = hits.get(ip);
  if (!r || now > r.reset) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (r.count >= 30) return true;
  r.count += 1;
  return false;
}

/**
 * Live courier ETA by pincode (Shiprocket). Informational only: the charged shipping fee is always resolved
 * server-side by computeCheckout; client input never sets a price. When Shiprocket is not configured or errors,
 * `live` is false and callers keep using the flat-fee estimate from /api/shipping/pincode-check.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  if (limited(ip)) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  const pincode = (req.nextUrl.searchParams.get('pincode') || '').trim();
  if (!/^\d{6}$/.test(pincode)) return NextResponse.json({ error: 'Enter a valid 6-digit pincode.' }, { status: 400 });
  const units = parseInt(req.nextUrl.searchParams.get('units') || '1', 10) || 1;
  const eta = await getPublicEta(pincode, units);
  return NextResponse.json({ success: true, ...eta });
}
