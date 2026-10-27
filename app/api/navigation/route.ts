import { NextResponse } from 'next/server';
import { getNavigationMenu } from '@/lib/cms/pageService';
import { ensureDefaultCmsData } from '@/lib/cms/seedCms';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureDefaultCmsData();
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle') || 'header';
    const menu = await getNavigationMenu(handle);
    return NextResponse.json({ menu });
  } catch (err) {
    return NextResponse.json({ menu: null });
  }
}
