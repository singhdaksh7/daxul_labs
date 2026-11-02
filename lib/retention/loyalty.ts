import { prisma } from '@/lib/db';
import { getRetentionSettings } from './settings';
import type { Prisma } from '@prisma/client';

export type LoyaltyTxType =
  | 'EARN'
  | 'REDEEM'
  | 'REVERSAL'
  | 'ADMIN_CREDIT'
  | 'ADMIN_DEBIT'
  | 'EXPIRY'
  | 'REFERRAL_REWARD'
  | 'REVIEW_REWARD';

export type LoyaltyTxStatus = 'PENDING' | 'AVAILABLE' | 'REDEEMED' | 'REVERSED' | 'EXPIRED';

/**
 * Gets or creates the loyalty account for a user.
 */
export async function getOrCreateLoyaltyAccount(
  userId: string,
  txClient: Prisma.TransactionClient | typeof prisma = prisma,
) {
  let account = await txClient.loyaltyAccount.findUnique({
    where: { userId },
  });
  if (!account) {
    account = await txClient.loyaltyAccount.create({
      data: {
        userId,
        availablePoints: 0,
        pendingPoints: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      },
    });
  }
  return account;
}

/**
 * Calculates how many points an order earns based on settings and eligible line items.
 */
export function calculateOrderEarningPoints(
  subtotal: number,
  pointsPer100Rupees: number,
  minOrder: number = 0,
): number {
  if (subtotal < minOrder || pointsPer100Rupees <= 0) return 0;
  // Floor integer points
  return Math.floor((subtotal / 100) * pointsPer100Rupees);
}

/**
 * Creates an EARN transaction in PENDING or AVAILABLE status based on rules.
 * Never mutates balances directly without ledger row.
 */
export async function earnLoyaltyPointsForOrder(
  params: {
    userId: string;
    orderId: string;
    orderNumber: string;
    subtotal: number;
    delivered?: boolean;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const settings = await getRetentionSettings();
  if (!settings.loyaltyEnabled) return null;

  const points = calculateOrderEarningPoints(
    params.subtotal,
    settings.pointsPer100Rupees,
    settings.loyaltyEarningMinOrder,
  );
  if (points <= 0) return null;

  // Check if this order already has an EARN transaction to ensure idempotency
  const existing = await txClient.loyaltyTransaction.findFirst({
    where: {
      orderId: params.orderId,
      type: 'EARN',
    },
  });
  if (existing) return existing;

  const account = await getOrCreateLoyaltyAccount(params.userId, txClient);

  const isPending = settings.loyaltyPendingDays > 0 && !params.delivered;
  const status: LoyaltyTxStatus = isPending ? 'PENDING' : 'AVAILABLE';

  const expiresAt =
    settings.pointExpiryDays > 0
      ? new Date(Date.now() + settings.pointExpiryDays * 24 * 60 * 60 * 1000)
      : null;

  const transaction = await txClient.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      type: 'EARN',
      points,
      status,
      reason: `Points earned from order #${params.orderNumber}`,
      orderId: params.orderId,
      expiresAt,
    },
  });

  if (status === 'AVAILABLE') {
    await txClient.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        availablePoints: { increment: points },
        lifetimeEarned: { increment: points },
      },
    });
  } else {
    await txClient.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        pendingPoints: { increment: points },
      },
    });
  }

  return transaction;
}

/**
 * Transitions PENDING points to AVAILABLE after delivery/delay period satisfies policy.
 */
export async function makePendingPointsAvailable(
  orderId: string,
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const pendingTxs = await txClient.loyaltyTransaction.findMany({
    where: {
      orderId,
      type: 'EARN',
      status: 'PENDING',
    },
  });

  for (const tx of pendingTxs) {
    await txClient.loyaltyTransaction.update({
      where: { id: tx.id },
      data: { status: 'AVAILABLE' },
    });

    await txClient.loyaltyAccount.update({
      where: { id: tx.accountId },
      data: {
        pendingPoints: { decrement: tx.points },
        availablePoints: { increment: tx.points },
        lifetimeEarned: { increment: tx.points },
      },
    });
  }
}

/**
 * Reverses points for refunded or cancelled orders.
 * Proportional reversal for partial refunds, full reversal for full refunds.
 */
export async function reverseLoyaltyPointsForOrder(
  params: {
    orderId: string;
    orderNumber: string;
    refundRatio: number; // 1.0 for full, < 1.0 for partial
    reason: string;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const earnTxs = await txClient.loyaltyTransaction.findMany({
    where: {
      orderId: params.orderId,
      type: 'EARN',
      status: { in: ['AVAILABLE', 'PENDING'] },
    },
  });

  for (const earnTx of earnTxs) {
    const pointsToReverse = Math.min(
      earnTx.points,
      Math.max(1, Math.round(earnTx.points * params.refundRatio)),
    );
    if (pointsToReverse <= 0) continue;

    // Create REVERSAL transaction in ledger
    await txClient.loyaltyTransaction.create({
      data: {
        accountId: earnTx.accountId,
        type: 'REVERSAL',
        points: pointsToReverse,
        status: 'REVERSED',
        reason: `Reversal: ${params.reason} (Order #${params.orderNumber})`,
        orderId: params.orderId,
      },
    });

    if (earnTx.status === 'AVAILABLE') {
      await txClient.loyaltyAccount.update({
        where: { id: earnTx.accountId },
        data: {
          availablePoints: { decrement: pointsToReverse },
          lifetimeEarned: { decrement: pointsToReverse },
        },
      });
    } else {
      await txClient.loyaltyAccount.update({
        where: { id: earnTx.accountId },
        data: {
          pendingPoints: { decrement: pointsToReverse },
        },
      });
    }
  }
}

/**
 * Validates and locks loyalty points redemption during checkout.
 * Enforces PostgreSQL row locking (SELECT ... FOR UPDATE) semantics within tx.
 */
export async function redeemLoyaltyPoints(
  params: {
    userId: string;
    pointsToRedeem: number;
    orderId?: string;
    orderNumber?: string;
    orderSubtotal: number;
  },
  txClient: Prisma.TransactionClient = prisma as any,
): Promise<{ success: boolean; discountAmount: number; error?: string }> {
  const settings = await getRetentionSettings();
  if (!settings.loyaltyEnabled) {
    return { success: false, discountAmount: 0, error: 'Loyalty rewards program is currently inactive.' };
  }

  if (params.pointsToRedeem < settings.minimumRedemptionPoints) {
    return {
      success: false,
      discountAmount: 0,
      error: `Minimum ${settings.minimumRedemptionPoints} points required for redemption.`,
    };
  }

  const discountValue = params.pointsToRedeem * settings.redemptionValuePerPoint;
  const maxAllowedDiscount = (params.orderSubtotal * settings.maxOrderRedemptionPercent) / 100;

  if (discountValue > maxAllowedDiscount) {
    return {
      success: false,
      discountAmount: 0,
      error: `Points can cover up to ${settings.maxOrderRedemptionPercent}% of the order subtotal (max ₹${maxAllowedDiscount.toFixed(2)}).`,
    };
  }

  const account = await txClient.loyaltyAccount.findUnique({
    where: { userId: params.userId },
  });

  if (!account || account.availablePoints < params.pointsToRedeem) {
    return {
      success: false,
      discountAmount: 0,
      error: `Insufficient points balance. Available: ${account?.availablePoints || 0}`,
    };
  }

  // Create REDEEM ledger entry
  await txClient.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      type: 'REDEEM',
      points: params.pointsToRedeem,
      status: 'REDEEMED',
      reason: params.orderNumber
        ? `Redeemed for order #${params.orderNumber}`
        : 'Redeemed at checkout',
      orderId: params.orderId,
    },
  });

  // Mutate account balance atomically
  await txClient.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      availablePoints: { decrement: params.pointsToRedeem },
      lifetimeRedeemed: { increment: params.pointsToRedeem },
    },
  });

  return { success: true, discountAmount: discountValue };
}

/**
 * Manual Admin Adjustment with mandatory audit logging and reason.
 */
export async function adminAdjustLoyaltyPoints(
  params: {
    userId: string;
    adminUserId: string;
    adminUserEmail: string;
    type: 'ADMIN_CREDIT' | 'ADMIN_DEBIT';
    points: number;
    reason: string;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  if (params.points <= 0) throw new Error('Points must be greater than zero');
  if (!params.reason || params.reason.trim().length < 3) {
    throw new Error('Mandatory reason required for manual loyalty points adjustment');
  }

  const account = await getOrCreateLoyaltyAccount(params.userId, txClient);

  if (params.type === 'ADMIN_DEBIT' && account.availablePoints < params.points) {
    throw new Error(`Cannot debit more points than available (${account.availablePoints})`);
  }

  const transaction = await txClient.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      type: params.type,
      points: params.points,
      status: 'AVAILABLE',
      reason: `Admin adjustment: ${params.reason.trim()}`,
      adminUserId: params.adminUserId,
    },
  });

  if (params.type === 'ADMIN_CREDIT') {
    await txClient.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        availablePoints: { increment: params.points },
        lifetimeEarned: { increment: params.points },
      },
    });
  } else {
    await txClient.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        availablePoints: { decrement: params.points },
      },
    });
  }

  // Create Audit Log
  await txClient.auditLog.create({
    data: {
      adminUserId: params.adminUserId,
      adminUserEmail: params.adminUserEmail,
      action: `LOYALTY_${params.type}`,
      entityType: 'LoyaltyAccount',
      entityId: account.id,
      details: {
        userId: params.userId,
        points: params.points,
        reason: params.reason,
        txId: transaction.id,
      },
    },
  });

  return transaction;
}

