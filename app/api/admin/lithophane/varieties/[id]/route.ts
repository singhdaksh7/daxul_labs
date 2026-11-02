import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { varietyUpdateSchema } from '@/lib/lithophaneAdminSchema';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const { id } = await params;
  const p = await parseBody(req, varietyUpdateSchema);
  if (!p.ok) return p.response;
  try {
    const cur = await prisma.lithophaneVariety.findUnique({ where: { id }, include: { sizes: true } });
    if (!cur) return NextResponse.json({ error: 'Product type not found' }, { status: 404 });
    const { optionGroups, defaultSizeId, ...rest } = p.data;
    if (defaultSizeId) {
      const s = cur.sizes.find((x) => x.id === defaultSizeId);
      if (!s || !s.isActive) return NextResponse.json({ error: 'Default size must be an active size of this product type.' }, { status: 400 });
    }
    if (rest.isActive === false) {
      const settings = await prisma.lithophaneSettings.findUnique({ where: { id: 'default' } });
      if (settings?.defaultVarietyId === id) {
        return NextResponse.json({ error: 'This is the default product type. Choose another default first.' }, { status: 400 });
      }
    }
    const data: Prisma.LithophaneVarietyUpdateInput = { ...rest };
    if (optionGroups) data.optionGroups = optionGroups as unknown as Prisma.InputJsonValue;
    if (defaultSizeId !== undefined) {
      data.defaultSizeId = defaultSizeId;
      if (defaultSizeId) {
        await prisma.lithophaneSize.updateMany({ where: { varietyId: id }, data: { isDefault: false } });
        await prisma.lithophaneSize.update({ where: { id: defaultSizeId }, data: { isDefault: true } });
      }
    }
    const v = await prisma.lithophaneVariety.update({ where: { id }, data, include: { sizes: true } });
    await logAdminAction(g.admin, 'lithophane.variety.update', 'LithophaneVariety', id, { fields: Object.keys(p.data) });
    return NextResponse.json({ success: true, variety: v });
  } catch (err) {
    return serverError(err, 'Admin PATCH lithophane variety:');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const { id } = await params;
  try {
    const settings = await prisma.lithophaneSettings.findUnique({ where: { id: 'default' } });
    if (settings?.defaultVarietyId === id) {
      return NextResponse.json({ error: 'This is the default product type. Choose another default first.' }, { status: 400 });
    }
    // Existing orders keep a frozen snapshot, so deleting never alters past orders.
    await prisma.lithophaneVariety.delete({ where: { id } });
    await logAdminAction(g.admin, 'lithophane.variety.delete', 'LithophaneVariety', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'Admin DELETE lithophane variety:');
  }
}
