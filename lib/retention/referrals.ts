import { prisma } from '@/lib/db';
import { getRetentionSettings } from './settings';
import type { Prisma } from '@prisma/client';
import crypto from 'node:crypto';

/**
 * Generates an alphanumeric secure referral code.
 */
export function generateReferralCodeString(emailPrefix: string): string {
  const clean = emailPrefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'DX';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${clean}-${rand}`;
}

/**
 * Gets or creates the unique referral code for a user.
 */
export async function getOrCreateReferralCode(
  userId: string,
  userEmail: string,
  txClient: Prisma.TransactionClient | typeof prisma = prisma,
) {
  let refCode = await txClient.referralCode.findUnique({
    where: { userId },
  });
  if (!refCode) {
    const code = generateReferralCodeString(userEmail.split('@')[0]);
    refCode = await txClient.referralCode.create({
      data: {
        userId,
        code,
        active: true,
      },
    });
  }
  return refCode;
}

/**
 * Attaches a referral to a new user account upon signup/first order, with anti-fraud safeguards.
 */
export async function registerReferralAttribution(
  params: {
    code: string;
    referredUserId: string;
    referredEmail: string;
    referredPhone?: string | null;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const settings = await getRetentionSettings();
  if (!settings.referralsEnabled) return { success: false, reason: 'Referral program inactive' };

  const refCode = await txClient.referralCode.findUnique({
    where: { code: params.code.trim().toUpperCase() },
    include: { user: true },
  });

  if (!refCode || !refCode.active) {
    return { success: false, reason: 'Invalid or inactive referral code' };
  }

  // Prevent self referral
  if (refCode.userId === params.referredUserId) {
    return { success: false, reason: 'Self-referral is not permitted' };
  }

  // Prevent same email address abuse
  if (refCode.user.email.toLowerCase() === params.referredEmail.toLowerCase()) {
    return { success: false, reason: 'Self-referral with same email detected' };
  }

  // Prevent duplicate referral between same users
  const existing = await txClient.referral.findUnique({
    where: {
      referrerUserId_referredUserId: {
        referrerUserId: refCode.userId,
        referredUserId: params.referredUserId,
      },
    },
  });
  if (existing) {
    return { success: false, reason: 'Referral already recorded' };
  }

  const referral = await txClient.referral.create({
    data: {
      referrerUserId: refCode.userId,
      referredUserId: params.referredUserId,
      codeId: refCode.id,
      status: 'PENDING',
    },
  });

  return { success: true, referral };
}

/**
 * Evaluates whether an order qualifies a pending referral and issues the configured reward.
 */
export async function qualifyAndRewardReferral(
  params: {
    orderId: string;
    userId: string;
    orderAmount: number;
    orderStatus: string; // PAID or DELIVERED
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const settings = await getRetentionSettings();
  if (!settings.referralsEnabled) return null;

  // Check if user has a pending referral as the referred customer
  const referral = await txClient.referral.findFirst({
    where: {
      referredUserId: params.userId,
      status: 'PENDING',
    },
    include: {
      referrerUser: true,
      referredUser: true,
    },
  });

  if (!referral) return null;

  // Verification 1: Minimum order spend
  if (params.orderAmount < settings.referralMinOrderSpend) {
    return null; // Has not met minimum spend yet
  }

  // Verification 2: Qualifying event satisfied (PAID vs DELIVERED)
  if (settings.referralQualifyEvent === 'DELIVERED' && params.orderStatus !== 'delivered') {
    return null; // Must wait for delivery
  }

  // Mark as QUALIFIED and REWARDED
  const now = new Date();
  await txClient.referral.update({
    where: { id: referral.id },
    data: {
      status: 'REWARDED',
      qualifyingOrderId: params.orderId,
      qualifiedAt: now,
      rewardedAt: now,
    },
  });

  // Record Reward
  await txClient.referralReward.create({
    data: {
      referralId: referral.id,
      rewardType: settings.referralRewardType,
      amount: settings.referralRewardAmount,
      status: 'ISSUED',
    },
  });

  // Grant the configured reward to the Referrer
  if (settings.referralRewardType === 'points') {
    let account = await txClient.loyaltyAccount.findUnique({
      where: { userId: referral.referrerUserId },
    });
    if (!account) {
      account = await txClient.loyaltyAccount.create({
        data: { userId: referral.referrerUserId },
      });
    }

    const points = Math.round(settings.referralRewardAmount);
    await txClient.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'REFERRAL_REWARD',
        points,
        status: 'AVAILABLE',
        reason: `Referral reward for introducing ${referral.referredUser.email}`,
        referralId: referral.id,
      },
    });

    await txClient.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        availablePoints: { increment: points },
        lifetimeEarned: { increment: points },
      },
    });
  } else if (settings.referralRewardType === 'credit') {
    let creditAcc = await txClient.storeCreditAccount.findUnique({
      where: { userId: referral.referrerUserId },
    });
    if (!creditAcc) {
      creditAcc = await txClient.storeCreditAccount.create({
        data: { userId: referral.referrerUserId },
      });
    }

    const amount = settings.referralRewardAmount;
    await txClient.storeCreditTransaction.create({
      data: {
        accountId: creditAcc.id,
        type: 'CREDIT',
        amount,
        balanceAfter: creditAcc.availableBalance + amount,
        reason: `Referral reward for introducing ${referral.referredUser.email}`,
      },
    });

    await txClient.storeCreditAccount.update({
      where: { id: creditAcc.id },
      data: {
        availableBalance: { increment: amount },
        lifetimeCredited: { increment: amount },
      },
    });
  }

  return referral;
}

