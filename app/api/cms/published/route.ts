import { NextResponse } from 'next/server';
import { getPublishedCmsData } from '@/lib/cmsService';

export const revalidate = 60; // Cache revalidation

export async function GET() {
  try {
    const data = await getPublishedCmsData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch published CMS data' }, { status: 500 });
  }
}
