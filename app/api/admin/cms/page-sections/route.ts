import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { addPageSection } from '@/lib/cms/pageService';
import { PageSectionType } from '@/lib/cms/pageTypes';

export const dynamic = 'force-dynamic';

const addSectionSchema = z.object({
  pageId: z.string().min(1),
  type: z.string().min(1),
  name: z.string().trim().max(100).optional(),
});

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, addSectionSchema);
  if (!p.ok) return p.response;

  try {
    const section = await addPageSection(p.data.pageId, p.data.type as PageSectionType, p.data.name);
    await logAdminAction(g.admin, 'PAGE_SECTION_ADDED', 'PageSection', section.id, {
      pageId: p.data.pageId,
      type: p.data.type,
    });
    return NextResponse.json({ section }, { status: 201 });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/page-sections');
  }
}
