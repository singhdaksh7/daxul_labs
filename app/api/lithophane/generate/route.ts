import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getLithophaneCaller } from '@/lib/lithophaneOwner';
import {
  LithophaneError,
  publicResolved,
  requireOwnedUpload,
  resolveLithophane,
  upsertPreviewGeneration,
} from '@/lib/lithophaneServer';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  filename: z.string().min(1).max(200),
  varietyKey: z.string().min(1).max(64),
  sizeId: z.string().max(64).optional().nullable(),
  customWidthMm: z.number().finite().optional().nullable(),
  customHeightMm: z.number().finite().optional().nullable(),
  orientation: z.enum(['portrait', 'landscape']).optional().nullable(),
  crop: z.object({ cx: z.number().finite(), cy: z.number().finite(), zoom: z.number().finite() }).partial().optional().nullable(),
  options: z.record(z.string(), z.string().max(80)).optional().nullable(),
  quantity: z.number().int().min(1).max(100).default(1),
});

const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 120) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

/**
 * POST /api/lithophane/generate. Validates ownership of the photo, resolves the configuration from
 * database rules, computes the geometry hash and upserts the PREVIEW generation row (unique hash+kind).
 * The relief itself is computed in the browser from the photo; the server is the source of truth for
 * the hash, the resolved dimensions and the price.
 */
export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid generation request' }, { status: 400 });
  try {
    const caller = await getLithophaneCaller();
    await requireOwnedUpload(parsed.data.filename, caller);
    const r = await resolveLithophane(parsed.data);
    const { generation, cached } = await upsertPreviewGeneration(r, parsed.data.filename, caller);
    return NextResponse.json(
      { generationId: generation.id, hash: generation.hash, cached, config: publicResolved(r), price: r.price },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (err instanceof LithophaneError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/lithophane/generate', err);
    return NextResponse.json({ error: 'Could not generate the lithophane' }, { status: 500 });
  }
}
