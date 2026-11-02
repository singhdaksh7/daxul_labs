import { NextResponse } from 'next/server';
import { getPublicConfig, LithophaneError } from '@/lib/lithophaneServer';

export const dynamic = 'force-dynamic';

/** Public builder configuration (settings + active varieties + sizes). Seeds defaults lazily on first call. */
export async function GET() {
  try {
    const cfg = await getPublicConfig();
    return NextResponse.json(cfg, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof LithophaneError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('GET /api/lithophane/config', err);
    return NextResponse.json({ error: 'Could not load the lithophane builder.' }, { status: 500 });
  }
}
