import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { ensureLithophaneSetup } from '@/lib/lithophaneServer';

export const dynamic = 'force-dynamic';

/** GET /api/admin/lithophane: settings + every variety (incl. inactive) with every size. */
export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    await ensureLithophaneSetup();
    const [settings, varieties] = await Promise.all([
      prisma.lithophaneSettings.findUnique({ where: { id: 'default' } }),
      prisma.lithophaneVariety.findMany({ orderBy: { sortOrder: 'asc' }, include: { sizes: { orderBy: { sortOrder: 'asc' } } } }),
    ]);
    return NextResponse.json({ success: true, settings, varieties });
  } catch (err) {
    return serverError(err, 'Admin GET lithophane:');
  }
}

const settingsSchema = z.object({
  defaultVarietyId: z.string().max(64).nullable().optional(),
  defaultOrientation: z.enum(['portrait', 'landscape']).optional(),
  defaultCropStrategy: z.enum(['center', 'smart']).optional(),
  defaultThicknessMm: z.number().min(0.5).max(20).optional(),
  minThicknessMm: z.number().min(0.2).max(10).optional(),
  previewResolution: z.number().int().min(40).max(400).optional(),
  productionResolution: z.number().int().min(100).max(4000).optional(),
  allowCustomDimensions: z.boolean().optional(),
  customMinMm: z.number().min(20).max(1000).optional(),
  customMaxMm: z.number().min(20).max(1000).optional(),
  customPricePer100Cm2: z.number().min(0).max(100000).optional(),
  headline: z.string().trim().min(1).max(160).optional(),
  subheadline: z.string().trim().max(400).optional(),
  uploadGuidance: z.string().trim().max(400).optional(),
  previewDisclaimer: z.string().trim().max(600).optional(),
  leadTimeText: z.string().trim().max(200).optional(),
});

export async function PUT(req: NextRequest) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const p = await parseBody(req, settingsSchema);
  if (!p.ok) return p.response;
  try {
    const d = p.data;
    if (d.customMinMm !== undefined && d.customMaxMm !== undefined && d.customMinMm >= d.customMaxMm) {
      return NextResponse.json({ error: 'Custom minimum must be smaller than the maximum.' }, { status: 400 });
    }
    if (d.defaultVarietyId) {
      const v = await prisma.lithophaneVariety.findUnique({ where: { id: d.defaultVarietyId } });
      if (!v || !v.isActive) return NextResponse.json({ error: 'Default product type must exist and be active.' }, { status: 400 });
    }
    await ensureLithophaneSetup();
    const settings = await prisma.lithophaneSettings.update({ where: { id: 'default' }, data: d });
    await logAdminAction(g.admin, 'lithophane.settings.update', 'LithophaneSettings', 'default', { fields: Object.keys(d) });
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    return serverError(err, 'Admin PUT lithophane settings:');
  }
}
