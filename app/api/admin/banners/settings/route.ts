import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin, parseBody, serverError } from '@/lib/adminApi';
import { prisma } from '@/lib/db';
import { updateCmsDraft, publishCmsSection } from '@/lib/cmsService';
import { ensureDefaultCmsData } from '@/lib/cms/seedCms';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  autoplay: z.boolean().optional(),
  interval: z.number().min(1000).max(60000).optional(),
  showArrows: z.boolean().optional(),
  showDots: z.boolean().optional(),
  transitionStyle: z.literal('subtle').optional(),
});

export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    await ensureDefaultCmsData();
    const heroSection = await prisma.homepageSection.findUnique({
      where: { sectionKey: 'HERO' },
    });
    const content = (heroSection?.publishedContent || {}) as any;

    return NextResponse.json({
      settings: {
        autoplay: content.carouselAutoplay !== false,
        interval: typeof content.carouselInterval === 'number' ? content.carouselInterval : 5500,
        showArrows: content.carouselShowArrows !== false,
        showDots: content.carouselShowDots !== false,
        transitionStyle: content.carouselTransitionStyle || 'subtle',
      },
    });
  } catch (err) {
    return serverError(err, 'GET /api/admin/banners/settings');
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const p = await parseBody(req, settingsSchema);
  if (!p.ok) return p.response;

  try {
    await ensureDefaultCmsData();
    const heroSection = await prisma.homepageSection.findUnique({
      where: { sectionKey: 'HERO' },
    });

    const currentDraft = (heroSection?.draftContent || {}) as any;
    const updatedDraft = {
      ...currentDraft,
      carouselAutoplay: p.data.autoplay !== undefined ? p.data.autoplay : (currentDraft.carouselAutoplay !== false),
      carouselInterval: p.data.interval !== undefined ? p.data.interval : (currentDraft.carouselInterval || 5500),
      carouselShowArrows: p.data.showArrows !== undefined ? p.data.showArrows : (currentDraft.carouselShowArrows !== false),
      carouselShowDots: p.data.showDots !== undefined ? p.data.showDots : (currentDraft.carouselShowDots !== false),
      carouselTransitionStyle: p.data.transitionStyle || currentDraft.carouselTransitionStyle || 'subtle',
    };

    await updateCmsDraft('HERO', updatedDraft, g.admin.email);
    await publishCmsSection('HERO', g.admin.email);

    return NextResponse.json({
      success: true,
      settings: {
        autoplay: updatedDraft.carouselAutoplay,
        interval: updatedDraft.carouselInterval,
        showArrows: updatedDraft.carouselShowArrows,
        showDots: updatedDraft.carouselShowDots,
        transitionStyle: updatedDraft.carouselTransitionStyle,
      },
    });
  } catch (err) {
    return serverError(err, 'POST /api/admin/banners/settings');
  }
}
