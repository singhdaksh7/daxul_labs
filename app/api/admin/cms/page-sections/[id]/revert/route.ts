import { NextResponse } from 'next/server';
import { guardAdmin, logAdminAction, serverError } from '@/lib/adminApi';
import { revertPageSection } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const reverted = await revertPageSection(id);
    await logAdminAction(g.admin, 'PAGE_SECTION_REVERTED', 'PageSection', id);
    return NextResponse.json({ section: reverted });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/page-sections/[id]/revert');
  }
}
