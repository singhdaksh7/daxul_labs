import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRetentionSettings } from '@/lib/retention/settings';

export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (!check.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  const settings = await getRetentionSettings();

  const [totalReferrals, rewardedReferrals, pendingReferrals] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'REWARDED' } }),
    prisma.referral.count({ where: { status: 'PENDING' } }),
  ]);

  const referrals = await prisma.referral.findMany({
    where: q
      ? {
          OR: [
            { referrerUser: { email: { contains: q, mode: 'insensitive' } } },
            { referredUser: { email: { contains: q, mode: 'insensitive' } } },
            { code: { code: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {},
    include: {
      referrerUser: { select: { id: true, name: true, email: true } },
      referredUser: { select: { id: true, name: true, email: true } },
      code: true,
      rewards: true,
      qualifyingOrder: { select: { id: true, orderNumber: true, totalAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    enabled: settings.referralsEnabled,
    metrics: {
      totalReferrals,
      rewardedReferrals,
      pendingReferrals,
      conversionRate: totalReferrals > 0 ? (rewardedReferrals / totalReferrals) * 100 : 0,
    },
    referrals,
  });
}

