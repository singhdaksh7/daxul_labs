import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, serverError } from '@/lib/adminApi';
import { getAnalytics } from '@/lib/adminQueries';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  try {
    const granularity = req.nextUrl.searchParams.get('granularity') === 'monthly' ? 'monthly' : 'daily';
    return NextResponse.json({ success: true, ...(await getAnalytics(granularity)) });
  } catch (err) {
    return serverError(err, 'Admin GET Analytics Error:');
  }
}
