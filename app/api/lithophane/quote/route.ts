import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LithophaneError, publicResolved, resolveLithophane } from '@/lib/lithophaneServer';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  varietyKey: z.string().min(1).max(64),
  sizeId: z.string().max(64).optional().nullable(),
  customWidthMm: z.number().finite().optional().nullable(),
  customHeightMm: z.number().finite().optional().nullable(),
  orientation: z.enum(['portrait', 'landscape']).optional().nullable(),
  crop: z.object({ cx: z.number().finite(), cy: z.number().finite(), zoom: z.number().finite() }).partial().optional().nullable(),
  options: z.record(z.string(), z.string().max(80)).optional().nullable(),
  quantity: z.number().int().min(1).max(100).default(1),
});

/** POST /api/lithophane/quote: authoritative price for any config + quantity. Client prices are never trusted. */
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid quote request' }, { status: 400 });
  try {
    const r = await resolveLithophane(parsed.data);
    return NextResponse.json({ price: r.price, config: publicResolved(r) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof LithophaneError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/lithophane/quote', err);
    return NextResponse.json({ error: 'Could not calculate price' }, { status: 500 });
  }
}
