import { NextResponse } from 'next/server';
import { guardAdmin, logAdminAction, serverError } from '@/lib/adminApi';
import { duplicateCmsPage } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const duplicated = await duplicateCmsPage(id);
    await logAdminAction(g.admin, 'CMS_PAGE_DUPLICATED', 'CmsPage', duplicated.id, {
      fromPageId: id,
      newSlug: duplicated.slug,
    });
    return NextResponse.json({ page: duplicated }, { status: 201 });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/pages/[id]/duplicate');
  }
}
