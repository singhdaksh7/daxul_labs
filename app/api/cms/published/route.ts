import { NextResponse } from 'next/server';
import { getPublishedCmsData } from '@/lib/cmsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublishedCmsData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch published CMS data' }, { status: 500 });
  }
}
