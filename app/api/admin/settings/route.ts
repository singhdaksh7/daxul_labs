import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

import { SITE_SETTINGS_CREATE_DEFAULTS as CREATE_DEFAULTS } from '@/lib/siteSettingsDefaults';

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(v), 'Must be an https:// URL')
  .transform((v) => (v === '' ? null : v));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v));

const money = z.number().finite().min(0).max(1_000_000);

const schema = z
  .object({
    brandName: z.string().trim().min(1).max(80),
    brandTagline: z.string().trim().max(160),
    brandDescription: z.string().trim().max(2000),
    contactEmail: z.union([z.literal(''), z.email().max(200)]),
    contactPhone: z.string().trim().max(40),
    whatsAppNumber: z.string().trim().max(25).refine((v) => v === '' || /^\+?[0-9 ()-]{7,20}$/.test(v), 'Invalid phone number'),
    businessAddress: optionalText(500),
    supportHours: optionalText(160),
    currencySymbol: z.string().trim().min(1).max(4),
    currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO code'),
    standardShippingFee: money,
    expressShippingFee: money,
    freeShippingThreshold: money,
    globalCodEnabled: z.boolean(),
    codFeeEnabled: z.boolean(),
    codFee: money,
    customProductsPrepaidOnly: z.boolean(),
    orderPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/, '2-8 letters/digits'),
    announcementBarEnabled: z.boolean(),
    announcementBarText: z.string().trim().max(240),
    gstEnabled: z.boolean(),
    gstNumber: z
      .string()
      .trim()
      .toUpperCase()
      .max(15)
      .refine((v) => v === '' || /^[0-9A-Z]{15}$/.test(v), 'GSTIN must be 15 characters')
      .transform((v) => (v === '' ? null : v)),
    footerText: z.string().trim().max(240),
    instagramUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https:\/\//i.test(v), 'Must be an https:// URL'),
    instagramHandle: z.string().trim().max(60).regex(/^@?[A-Za-z0-9._]*$/, 'Invalid handle'),
    whatsAppUrl: httpsUrl,
    youtubeUrl: httpsUrl,
    facebookUrl: httpsUrl,
  })
  .partial();

const FIELD_KEYS = Object.keys(schema.shape) as (keyof z.infer<typeof schema>)[];

function pick(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of FIELD_KEYS) out[k as string] = row[k as string];
  return out;
}

/** Booleans only. Never values of secrets. */
function integrationsStatus() {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  return {
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID),
    storageProvider: provider,
    s3Configured: Boolean(
      process.env.S3_BUCKET_NAME && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
    ),
  };
}

async function loadOrCreate() {
  return prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', ...CREATE_DEFAULTS },
  });
}

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const row = await loadOrCreate();
    return NextResponse.json({ settings: pick(row as unknown as Record<string, unknown>), integrations: integrationsStatus() });
  } catch (err) {
    return serverError(err, 'GET /api/admin/settings');
  }
}

export async function PUT(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const p = await parseBody(req, schema);
  if (!p.ok) return p.response;

  try {
    const before = (await loadOrCreate()) as unknown as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of Object.entries(p.data)) {
      if (v === undefined) continue;
      data[k] = v;
      if (before[k] !== v) {
        const trunc = (x: unknown) => (typeof x === 'string' && x.length > 200 ? x.slice(0, 200) + '…' : x);
        diff[k] = { from: trunc(before[k]), to: trunc(v) };
      }
    }
    const row = await prisma.siteSettings.update({ where: { id: 'default' }, data });
    if (Object.keys(diff).length > 0) {
      await logAdminAction(g.admin, 'SETTINGS_UPDATED', 'SiteSettings', 'default', {
        changedKeys: Object.keys(diff),
        diff,
      });
    }
    return NextResponse.json({
      settings: pick(row as unknown as Record<string, unknown>),
      integrations: integrationsStatus(),
      changedKeys: Object.keys(diff),
    });
  } catch (err) {
    return serverError(err, 'PUT /api/admin/settings');
  }
}
