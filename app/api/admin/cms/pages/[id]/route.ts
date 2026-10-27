import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { getCmsPageById, updateCmsPage, deleteCmsPage, archiveCmsPage } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

const updatePageSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(100).optional(),
  parentPageId: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  sortOrder: z.number().int().optional(),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(1000).nullable().optional(),
  ogImage: z.string().trim().nullable().optional(),
  canonicalUrl: z.string().trim().nullable().optional(),
  noIndex: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const page = await getCmsPageById(id);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ page });
  } catch (err) {
    return serverError(err, 'GET /api/admin/cms/pages/[id]');
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, updatePageSchema);
  if (!p.ok) return p.response;

  try {
    const { id } = await params;
    const page = await updateCmsPage(id, p.data, g.admin.email);
    await logAdminAction(g.admin, 'CMS_PAGE_UPDATED', 'CmsPage', page.id, {
      title: page.title,
      slug: page.slug,
      status: page.status,
    });
    return NextResponse.json({ page });
  } catch (err: any) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('reserved'))) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return serverError(err, 'PATCH /api/admin/cms/pages/[id]');
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
    const { searchParams } = new URL(req.url);
    const archiveOnly = searchParams.get('archive') === 'true';

    if (archiveOnly) {
      const page = await archiveCmsPage(id);
      await logAdminAction(g.admin, 'CMS_PAGE_ARCHIVED', 'CmsPage', id, { title: page.title });
      return NextResponse.json({ success: true, page });
    }

    const page = await deleteCmsPage(id);
    await logAdminAction(g.admin, 'CMS_PAGE_DELETED', 'CmsPage', id, { title: page.title });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message && err.message.includes('System pages cannot be')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return serverError(err, 'DELETE /api/admin/cms/pages/[id]');
  }
}
