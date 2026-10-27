import { NextResponse } from 'next/server';
import { getActiveAnnouncementBanner } from '@/lib/cms/pageService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const banner = await getActiveAnnouncementBanner();
    return NextResponse.json({ banner });
  } catch (err) {
    return NextResponse.json({ banner: null });
  }
}
