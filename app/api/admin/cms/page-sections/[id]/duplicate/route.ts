import { NextResponse } from 'next/server';
import { guardAdmin, logAdminAction, serverError } from '@/lib/adminApi';
import { duplicatePageSection } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const duplicated = await duplicatePageSection(id);
    await logAdminAction(g.admin, 'PAGE_SECTION_DUPLICATED', 'PageSection', duplicated.id, {
      fromSectionId: id,
    });
    return NextResponse.json({ section: duplicated }, { status: 201 });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/page-sections/[id]/duplicate');
  }
}
