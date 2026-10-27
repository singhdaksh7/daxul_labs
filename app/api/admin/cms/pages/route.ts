import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { listCmsPages, createCmsPage } from '@/lib/cms/pageService';
import { ensureDefaultCmsData } from '@/lib/cms/seedCms';

export const dynamic = 'force-dynamic';

const createPageSchema = z.object({
  title: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
  parentPageId: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(1000).nullable().optional(),
  ogImage: z.string().trim().nullable().optional(),
  canonicalUrl: z.string().trim().nullable().optional(),
  noIndex: z.boolean().optional(),
});

export async function GET(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    await ensureDefaultCmsData();
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('archived') === 'true';
    const pages = await listCmsPages({ includeArchived });
    return NextResponse.json({ pages });
  } catch (err) {
    return serverError(err, 'GET /api/admin/cms/pages');
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, createPageSchema);
  if (!p.ok) return p.response;

  try {
    const page = await createCmsPage(p.data);
    await logAdminAction(g.admin, 'CMS_PAGE_CREATED', 'CmsPage', page.id, {
      title: page.title,
      slug: page.slug,
    });
    return NextResponse.json({ page }, { status: 201 });
  } catch (err: any) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('reserved'))) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return serverError(err, 'POST /api/admin/cms/pages');
  }
}
