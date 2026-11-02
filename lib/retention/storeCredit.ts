import { prisma } from '@/lib/db';
import { getRetentionSettings } from './settings';
import type { Prisma } from '@prisma/client';

export type StoreCreditTxType = 'CREDIT' | 'DEBIT' | 'REVERSAL' | 'EXPIRY';

/**
 * Gets or creates the store credit account for a user.
 */
export async function getOrCreateStoreCreditAccount(
  userId: string,
  txClient: Prisma.TransactionClient | typeof prisma = prisma,
) {
  let account = await txClient.storeCreditAccount.findUnique({
    where: { userId },
  });
  if (!account) {
    account = await txClient.storeCreditAccount.create({
      data: {
        userId,
        availableBalance: 0,
        lifetimeCredited: 0,
        lifetimeDebited: 0,
      },
    });
  }
  return account;
}

/**
 * Credits store credit balance with audit entry.
 */
export async function creditStoreCredit(
  params: {
    userId: string;
    amount: number;
    reason: string;
    orderId?: string | null;
    adminUserId?: string | null;
    expiresAt?: Date | null;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  if (params.amount <= 0) throw new Error('Credit amount must be positive');

  const account = await getOrCreateStoreCreditAccount(params.userId, txClient);
  const newBalance = account.availableBalance + params.amount;

  const transaction = await txClient.storeCreditTransaction.create({
    data: {
      accountId: account.id,
      type: 'CREDIT',
      amount: params.amount,
      balanceAfter: newBalance,
      reason: params.reason,
      orderId: params.orderId,
      adminUserId: params.adminUserId,
      expiresAt: params.expiresAt,
    },
  });

  await txClient.storeCreditAccount.update({
    where: { id: account.id },
    data: {
      availableBalance: newBalance,
      lifetimeCredited: { increment: params.amount },
    },
  });

  return transaction;
}

/**
 * Redeems store credit balance atomically during checkout.
 */
export async function debitStoreCredit(
  params: {
    userId: string;
    amountToSpend: number;
    orderId?: string;
    reason: string;
  },
  txClient: Prisma.TransactionClient = prisma as any,
): Promise<{ success: boolean; appliedAmount: number; remainingBalance: number; error?: string }> {
  const settings = await getRetentionSettings();
  if (!settings.storeCreditEnabled) {
    return { success: false, appliedAmount: 0, remainingBalance: 0, error: 'Store credit is currently inactive.' };
  }

  const account = await txClient.storeCreditAccount.findUnique({
    where: { userId: params.userId },
  });

  if (!account || account.availableBalance <= 0) {
    return { success: false, appliedAmount: 0, remainingBalance: 0, error: 'No available store credit.' };
  }

  // Deduct up to available balance
  const appliedAmount = Math.min(account.availableBalance, params.amountToSpend);
  const newBalance = account.availableBalance - appliedAmount;

  await txClient.storeCreditTransaction.create({
    data: {
      accountId: account.id,
      type: 'DEBIT',
      amount: appliedAmount,
      balanceAfter: newBalance,
      reason: params.reason,
      orderId: params.orderId,
    },
  });

  await txClient.storeCreditAccount.update({
    where: { id: account.id },
    data: {
      availableBalance: newBalance,
      lifetimeDebited: { increment: appliedAmount },
    },
  });

  return {
    success: true,
    appliedAmount,
    remainingBalance: newBalance,
  };
}

/**
 * Restores store credit in the event of an order refund.
 */
export async function restoreStoreCredit(
  params: {
    userId: string;
    amountToRestore: number;
    orderId: string;
    reason: string;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  if (params.amountToRestore <= 0) return;

  const account = await getOrCreateStoreCreditAccount(params.userId, txClient);
  const newBalance = account.availableBalance + params.amountToRestore;

  await txClient.storeCreditTransaction.create({
    data: {
      accountId: account.id,
      type: 'REVERSAL',
      amount: params.amountToRestore,
      balanceAfter: newBalance,
      reason: `Refund restoration: ${params.reason}`,
      orderId: params.orderId,
    },
  });

  await txClient.storeCreditAccount.update({
    where: { id: account.id },
    data: {
      availableBalance: newBalance,
      lifetimeDebited: { decrement: params.amountToRestore },
    },
  });
}

