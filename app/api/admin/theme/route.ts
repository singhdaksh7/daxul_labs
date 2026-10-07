import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use #RRGGBB').transform((v) => v.toUpperCase());
const radius = z.enum(['none', 'sm', 'md', 'lg', 'full']);

// Only these fields are editable: no arbitrary CSS/JS/font injection.
const schema = z
  .object({
    accentColor: hex,
    carbonColor: hex,
    boneColor: hex,
    graphiteColor: hex,
    buttonRadius: radius,
    borderRadius: radius,
  })
  .partial();

const SELECT = {
  accentColor: true,
  carbonColor: true,
  boneColor: true,
  graphiteColor: true,
  buttonRadius: true,
  borderRadius: true,
  buttonColor: true,
  secondaryTextColor: true,
} as const;

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const theme = await prisma.themeSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
      select: SELECT,
    });
    return NextResponse.json({ theme });
  } catch (err) {
    return serverError(err, 'GET /api/admin/theme');
  }
}

export async function PUT(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const p = await parseBody(req, schema);
  if (!p.ok) return p.response;

  try {
    const before = await prisma.themeSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
      select: SELECT,
    });
    const data: Record<string, string> = {};
    const diff: Record<string, { from: string; to: string }> = {};
    for (const [k, v] of Object.entries(p.data)) {
      if (v === undefined) continue;
      data[k] = v;
      const prev = (before as Record<string, string>)[k];
      if (prev !== v) diff[k] = { from: prev, to: v };
    }
    // Keep the button colour following the accent unless it was customised separately.
    if (data.accentColor && before.buttonColor.toUpperCase() === before.accentColor.toUpperCase()) {
      data.buttonColor = data.accentColor;
    }
    const theme = await prisma.themeSettings.update({ where: { id: 'default' }, data, select: SELECT });
    if (Object.keys(diff).length > 0) {
      await logAdminAction(g.admin, 'THEME_UPDATED', 'ThemeSettings', 'default', { changedKeys: Object.keys(diff), diff });
    }
    return NextResponse.json({ theme });
  } catch (err) {
    return serverError(err, 'PUT /api/admin/theme');
  }
}
