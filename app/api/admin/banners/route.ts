import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, logAdminAction, serverError } from '@/lib/adminApi';
import { listBanners, upsertBanner, deleteBanner } from '@/lib/cms/pageService';
import { ensureDefaultCmsData } from '@/lib/cms/seedCms';

export const dynamic = 'force-dynamic';

const bannerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  placement: z.string().trim().default('ANNOUNCEMENT'),
  text: z.string().trim().min(1).max(500),
  buttonText: z.string().trim().max(100).nullable().optional(),
  linkUrl: z.string().trim().max(500).nullable().optional(),
  desktopImage: z.string().trim().nullable().optional(),
  mobileImage: z.string().trim().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  priority: z.number().int().default(0),
  visible: z.boolean().default(true),
});

export async function GET(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    await ensureDefaultCmsData();
    const { searchParams } = new URL(req.url);
    const placement = searchParams.get('placement') || undefined;
    const banners = await listBanners({ placement });
    return NextResponse.json({ banners });
  } catch (err) {
    return serverError(err, 'GET /api/admin/banners');
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, bannerSchema);
  if (!p.ok) return p.response;

  try {
    const banner = await upsertBanner({
      id: p.data.id,
      name: p.data.name,
      placement: p.data.placement,
      text: p.data.text,
      buttonText: p.data.buttonText,
      linkUrl: p.data.linkUrl,
      desktopImage: p.data.desktopImage,
      mobileImage: p.data.mobileImage,
      startDate: p.data.startDate ? new Date(p.data.startDate) : null,
      endDate: p.data.endDate ? new Date(p.data.endDate) : null,
      priority: p.data.priority,
      visible: p.data.visible,
    });

    await logAdminAction(
      g.admin,
      p.data.id ? 'BANNER_UPDATED' : 'BANNER_CREATED',
      'Banner',
      banner.id,
      { name: banner.name, placement: banner.placement }
    );

    return NextResponse.json({ banner });
  } catch (err) {
    return serverError(err, 'POST /api/admin/banners');
  }
}

export async function DELETE(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing banner ID' }, { status: 400 });
    }

    await deleteBanner(id);
    await logAdminAction(g.admin, 'BANNER_DELETED', 'Banner', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, 'DELETE /api/admin/banners');
  }
}
