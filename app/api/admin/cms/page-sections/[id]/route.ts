import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { updatePageSection, deletePageSection } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

const updateSectionSchema = z.object({
  name: z.string().trim().max(100).optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  draftContent: z.any().optional(),
  settings: z.any().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, updateSectionSchema);
  if (!p.ok) return p.response;

  try {
    const { id } = await params;
    const section = await updatePageSection(id, p.data);
    await logAdminAction(g.admin, 'PAGE_SECTION_UPDATED', 'PageSection', section.id, {
      name: section.name,
      visible: section.visible,
    });
    return NextResponse.json({ section });
  } catch (err) {
    return serverError(err, 'PATCH /api/admin/cms/page-sections/[id]');
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    await deletePageSection(id);
    await logAdminAction(g.admin, 'PAGE_SECTION_DELETED', 'PageSection', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'DELETE /api/admin/cms/page-sections/[id]');
  }
}
