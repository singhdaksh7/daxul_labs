import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { sizeCreateSchema } from '@/lib/lithophaneAdminSchema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  const p = await parseBody(req, sizeCreateSchema);
  if (!p.ok) return p.response;
  try {
    const variety = await prisma.lithophaneVariety.findUnique({ where: { id: p.data.varietyId }, include: { sizes: true } });
    if (!variety) return NextResponse.json({ error: 'Product type not found' }, { status: 404 });
    const makeDefault = p.data.isDefault === true || variety.sizes.length === 0;
    if (makeDefault) await prisma.lithophaneSize.updateMany({ where: { varietyId: variety.id }, data: { isDefault: false } });
    const size = await prisma.lithophaneSize.create({ data: { ...p.data, isDefault: makeDefault } });
    if (makeDefault) await prisma.lithophaneVariety.update({ where: { id: variety.id }, data: { defaultSizeId: size.id } });
    await logAdminAction(g.admin, 'lithophane.size.create', 'LithophaneSize', size.id, { varietyId: variety.id, name: size.name });
    return NextResponse.json({ success: true, size });
  } catch (err) {
    return serverError(err, 'Admin POST lithophane size:');
  }
}
