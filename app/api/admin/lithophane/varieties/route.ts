import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { varietyCreateSchema } from '@/lib/lithophaneAdminSchema';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const p = await parseBody(req, varietyCreateSchema);
  if (!p.ok) return p.response;
  try {
    const exists = await prisma.lithophaneVariety.findUnique({ where: { key: p.data.key } });
    if (exists) return NextResponse.json({ error: 'A product type with that key already exists.' }, { status: 409 });
    const { optionGroups, ...rest } = p.data;
    const v = await prisma.lithophaneVariety.create({ data: { ...rest, ...(optionGroups ? { optionGroups: optionGroups as unknown as Prisma.InputJsonValue } : {}) } });
    await logAdminAction(g.admin, 'lithophane.variety.create', 'LithophaneVariety', v.id, { key: v.key });
    return NextResponse.json({ success: true, variety: v });
  } catch (err) {
    return serverError(err, 'Admin POST lithophane variety:');
  }
}
