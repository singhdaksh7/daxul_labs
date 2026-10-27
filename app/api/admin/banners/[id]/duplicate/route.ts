import { NextResponse } from 'next/server';
import { guardAdmin, logAdminAction, serverError } from '@/lib/adminApi';
import { duplicateBanner } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const banner = await duplicateBanner(id);
    await logAdminAction(g.admin, 'BANNER_DUPLICATED', 'Banner', banner.id, {
      originalId: id,
      name: banner.name,
    });
    return NextResponse.json({ banner }, { status: 201 });
  } catch (err) {
    return serverError(err, 'POST /api/admin/banners/[id]/duplicate');
  }
}
