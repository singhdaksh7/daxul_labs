import { NextResponse } from 'next/server';
import { guardAdmin, logAdminAction, serverError } from '@/lib/adminApi';
import { publishCmsPage } from '@/lib/cms/pageService';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const published = await publishCmsPage(id, g.admin.email);
    await logAdminAction(g.admin, 'CMS_PAGE_PUBLISHED', 'CmsPage', published.id, {
      title: published.title,
      slug: published.slug,
      sectionsCount: published.sections.length,
    });

    // Revalidate paths
    try {
      if (published.slug === 'home') {
        revalidatePath('/');
      } else {
        revalidatePath(`/${published.slug}`);
      }
    } catch (e) {
      // ignore in tests or offline
    }

    return NextResponse.json({ page: published });
  } catch (err) {
    return serverError(err, 'POST /api/admin/cms/pages/[id]/publish');
  }
}
