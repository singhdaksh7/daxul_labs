import { NextResponse } from 'next/server';
import { getActiveHeroBanners } from '@/lib/cms/pageService';
import { ensureDefaultCmsData } from '@/lib/cms/seedCms';

import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureDefaultCmsData();
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get('preview') === 'true';
    const banners = await getActiveHeroBanners({ preview: isPreview });

    const heroSection = await prisma.homepageSection.findUnique({
      where: { sectionKey: 'HERO' },
    });
    const content = (heroSection?.publishedContent || {}) as any;
    const settings = {
      autoplay: content.carouselAutoplay !== false,
      interval: typeof content.carouselInterval === 'number' ? content.carouselInterval : 5500,
      showArrows: content.carouselShowArrows !== false,
      showDots: content.carouselShowDots !== false,
      transitionStyle: content.carouselTransitionStyle || 'subtle',
    };

    return NextResponse.json({ banners, slides: banners, settings });
  } catch (err) {
    return NextResponse.json({
      banners: [],
      slides: [],
      settings: {
        autoplay: true,
        interval: 5500,
        showArrows: true,
        showDots: true,
        transitionStyle: 'subtle',
      },
    });
  }
}
