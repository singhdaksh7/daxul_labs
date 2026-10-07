import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { SITE_SETTINGS_CREATE_DEFAULTS } from '@/lib/siteSettingsDefaults';

export const dynamic = 'force-dynamic';

const schema = z
  .object({
    seoTitle: z.string().trim().min(1).max(120),
    seoDescription: z.string().trim().max(320),
    defaultOgImage: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https:\/\//i.test(v) || /^\/(?!\/)[^\s]*$/.test(v), 'Use an https:// URL or an app path')
      .transform((v) => (v === '' ? null : v)),
    instagramHandle: z.string().trim().max(60).regex(/^@?[A-Za-z0-9._]*$/, 'Invalid handle'),
    searchIndexingEnabled: z.boolean(),
  })
  .partial();

const KEYS = ['seoTitle', 'seoDescription', 'defaultOgImage', 'instagramHandle', 'searchIndexingEnabled'] as const;

function pick(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of KEYS) out[k] = row[k];
  return out;
}

async function loadOrCreate() {
  return (await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', ...SITE_SETTINGS_CREATE_DEFAULTS },
  })) as unknown as Record<string, unknown>;
}

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const [row, products, collections] = await Promise.all([
      loadOrCreate(),
      prisma.product.findMany({
        where: { isArchived: false },
        select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true, ogImage: true },
        orderBy: { name: 'asc' },
      }),
      prisma.collection.findMany({
        select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true, ogImage: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    const mark = (r: { seoTitle: string | null; seoDescription: string | null; ogImage: string | null }) => ({
      hasTitle: Boolean(r.seoTitle?.trim()),
      hasDescription: Boolean(r.seoDescription?.trim()),
      hasOgImage: Boolean(r.ogImage?.trim()),
    });
    return NextResponse.json({
      seo: pick(row),
      products: products.map((p) => ({ id: p.id, name: p.name, slug: p.slug, ...mark(p) })),
      collections: collections.map((c) => ({ id: c.id, name: c.name, slug: c.slug, ...mark(c) })),
    });
  } catch (err) {
    return serverError(err, 'GET /api/admin/seo');
  }
}

export async function PUT(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const p = await parseBody(req, schema);
  if (!p.ok) return p.response;

  try {
    const before = await loadOrCreate();
    const data: Record<string, unknown> = {};
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of Object.entries(p.data)) {
      if (v === undefined) continue;
      data[k] = v;
      if (before[k] !== v) diff[k] = { from: before[k], to: v };
    }
    const row = (await prisma.siteSettings.update({ where: { id: 'default' }, data })) as unknown as Record<string, unknown>;
    if (Object.keys(diff).length > 0) {
      await logAdminAction(g.admin, 'SEO_UPDATED', 'SiteSettings', 'default', { changedKeys: Object.keys(diff), diff });
    }
    return NextResponse.json({ seo: pick(row) });
  } catch (err) {
    return serverError(err, 'PUT /api/admin/seo');
  }
}
