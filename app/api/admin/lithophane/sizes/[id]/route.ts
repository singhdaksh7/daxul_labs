import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { sizeUpdateSchema } from '@/lib/lithophaneAdminSchema';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const { id } = await params;
  const p = await parseBody(req, sizeUpdateSchema);
  if (!p.ok) return p.response;
  try {
    const cur = await prisma.lithophaneSize.findUnique({ where: { id } });
    if (!cur) return NextResponse.json({ error: 'Size not found' }, { status: 404 });
    if (p.data.isActive === false && cur.isDefault && p.data.isDefault !== true) {
      return NextResponse.json({ error: 'This is the default size. Make another size the default first.' }, { status: 400 });
    }
    if (p.data.isDefault === true) {
      await prisma.lithophaneSize.updateMany({ where: { varietyId: cur.varietyId }, data: { isDefault: false } });
      await prisma.lithophaneVariety.update({ where: { id: cur.varietyId }, data: { defaultSizeId: id } });
      p.data.isActive = true;
    }
    if (p.data.isDefault === false && cur.isDefault) {
      return NextResponse.json({ error: 'Pick a different default size instead of unsetting this one.' }, { status: 400 });
    }
    const size = await prisma.lithophaneSize.update({ where: { id }, data: p.data });
    await logAdminAction(g.admin, 'lithophane.size.update', 'LithophaneSize', id, { fields: Object.keys(p.data) });
    return NextResponse.json({ success: true, size });
  } catch (err) {
    return serverError(err, 'Admin PATCH lithophane size:');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const { id } = await params;
  try {
    const cur = await prisma.lithophaneSize.findUnique({ where: { id } });
    if (!cur) return NextResponse.json({ error: 'Size not found' }, { status: 404 });
    if (cur.isDefault) return NextResponse.json({ error: 'This is the default size. Make another size the default first.' }, { status: 400 });
    await prisma.lithophaneSize.delete({ where: { id } });
    await logAdminAction(g.admin, 'lithophane.size.delete', 'LithophaneSize', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'Admin DELETE lithophane size:');
  }
}
