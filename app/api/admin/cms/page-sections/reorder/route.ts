import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { reorderPageSections } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

const reorderSchema = z.object({
  pageId: z.string().min(1),
  sectionIds: z.array(z.string().min(1)),
});

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, reorderSchema);
  if (!p.ok) return p.response;

  try {
    await reorderPageSections(p.data.pageId, p.data.sectionIds);
    await logAdminAction(g.admin, 'PAGE_SECTIONS_REORDERED', 'CmsPage', p.data.pageId, {
      sectionIds: p.data.sectionIds,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/page-sections/reorder');
  }
}
