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
  text: z.string().trim().max(500).optional(),
  eyebrow: z.string().trim().max(100).nullable().optional(),
  headline: z.string().trim().max(200).nullable().optional(),
  subheadline: z.string().trim().max(300).nullable().optional(),
  body: z.string().trim().max(1000).nullable().optional(),
  buttonText: z.string().trim().max(100).nullable().optional(),
  linkUrl: z.string().trim().max(500).nullable().optional(),
  secondaryCtaLabel: z.string().trim().max(100).nullable().optional(),
  secondaryCtaUrl: z.string().trim().max(500).nullable().optional(),
  desktopImage: z.string().trim().nullable().optional(),
  mobileImage: z.string().trim().nullable().optional(),
  videoUrl: z.string().trim().max(500).nullable().optional(),
  desktopImageMediaId: z.string().nullable().optional(),
  mobileImageMediaId: z.string().nullable().optional(),
  videoMediaId: z.string().nullable().optional(),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  textMode: z.enum(['dark', 'light']).default('dark'),
  overlay: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
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
    const status = searchParams.get('status') || undefined;
    const banners = await listBanners({ placement, status });
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
      text: p.data.text || p.data.headline || p.data.name,
      eyebrow: p.data.eyebrow,
      headline: p.data.headline,
      subheadline: p.data.subheadline,
      body: p.data.body,
      buttonText: p.data.buttonText,
      linkUrl: p.data.linkUrl,
      secondaryCtaLabel: p.data.secondaryCtaLabel,
      secondaryCtaUrl: p.data.secondaryCtaUrl,
      desktopImage: p.data.desktopImage,
      mobileImage: p.data.mobileImage,
      videoUrl: p.data.videoUrl,
      desktopImageMediaId: p.data.desktopImageMediaId,
      mobileImageMediaId: p.data.mobileImageMediaId,
      videoMediaId: p.data.videoMediaId,
      textAlign: p.data.textAlign,
      textMode: p.data.textMode,
      overlay: p.data.overlay,
      status: p.data.status,
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
