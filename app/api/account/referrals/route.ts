import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateReferralCode } from '@/lib/retention/referrals';
import { getRetentionSettings } from '@/lib/retention/settings';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [settings, codeRecord] = await Promise.all([
    getRetentionSettings(),
    getOrCreateReferralCode(user.id, user.email),
  ]);

  const referrals = await prisma.referral.findMany({
    where: { referrerUserId: user.id },
    include: {
      referredUser: {
        select: { name: true, email: true, createdAt: true },
      },
      rewards: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const successfulCount = referrals.filter((r) => r.status === 'REWARDED').length;
  const pendingCount = referrals.filter((r) => r.status === 'PENDING' || r.status === 'QUALIFIED').length;

  return NextResponse.json({
    enabled: settings.referralsEnabled,
    code: codeRecord.code,
    referralLink: `${process.env.NEXTAUTH_URL || 'https://daxullabs.com'}/shop?ref=${codeRecord.code}`,
    stats: {
      totalInvited: referrals.length,
      successfulCount,
      pendingCount,
    },
    config: {
      rewardType: settings.referralRewardType,
      rewardAmount: settings.referralRewardAmount,
      referredRewardAmount: settings.referralReferredRewardAmount,
      minOrderSpend: settings.referralMinOrderSpend,
    },
    referrals: referrals.map((r) => ({
      id: r.id,
      referredCustomer: r.referredUser.email.replace(/(.{2})(.*)(?=@)/, '$1***'),
      status: r.status,
      createdAt: r.createdAt,
      rewardedAt: r.rewardedAt,
    })),
  });
}

