import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { calculateRetentionAnalytics } from '@/lib/retention/analytics';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await calculateRetentionAnalytics();
  return NextResponse.json(data);
}

