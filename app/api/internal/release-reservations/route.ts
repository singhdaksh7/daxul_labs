import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { releaseExpiredReservations } from '@/lib/reservations';

export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/release-reservations
 * Authorization: Bearer <CRON_SECRET>
 * 503 when CRON_SECRET is not configured (never an open endpoint), 401 on a wrong/missing token.
 * Intended for the host cron (see docs/RESERVATIONS.md).
 */
function tokenMatches(provided: string, secret: string): boolean {
  // Hash both sides so lengths are equal and the comparison is constant-time.
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(secret).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  const header = req.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!provided || !tokenMatches(provided, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const r = await releaseExpiredReservations(new Date());
    return NextResponse.json({ ok: true, released: r.released, failed: r.failed });
  } catch (err) {
    console.error('release-reservations failed', err);
    return NextResponse.json({ error: 'Release failed' }, { status: 500 });
  }
}
