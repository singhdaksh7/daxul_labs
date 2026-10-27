import { NextResponse } from 'next/server';
import { getActiveHeroBanners } from '@/lib/cms/pageService';
import { ensureDefaultCmsData } from '@/lib/cms/seedCms';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureDefaultCmsData();
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get('preview') === 'true';
    const banners = await getActiveHeroBanners({ preview: isPreview });
    return NextResponse.json({ banners, slides: banners });
  } catch (err) {
    return NextResponse.json({ banners: [], slides: [] });
  }
}
