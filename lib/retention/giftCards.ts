import { prisma } from '@/lib/db';
import { getRetentionSettings } from './settings';
import type { Prisma } from '@prisma/client';
import crypto from 'node:crypto';

/**
 * Generates a high-entropy cryptographically secure gift card code.
 * Format: DXL-XXXX-XXXX-XXXX
 */
export function generateGiftCardCode(): { fullCode: string; codeHash: string; maskedCode: string } {
  // 12 uppercase alphanumeric characters with high entropy
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous 0, O, 1, I
  let randomPart = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    randomPart += chars[bytes[i] % chars.length];
  }

  const p1 = randomPart.slice(0, 4);
  const p2 = randomPart.slice(4, 8);
  const p3 = randomPart.slice(8, 12);
  const fullCode = `DXL-${p1}-${p2}-${p3}`;

  const codeHash = crypto.createHash('sha256').update(fullCode).digest('hex');
  const maskedCode = `DXL-••••-••••-${p3}`;

  return { fullCode, codeHash, maskedCode };
}

/**
 * Hash raw code for lookup and comparison.
 */
export function hashGiftCardCode(rawCode: string): string {
  const normalized = rawCode.trim().toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Issue a new gift card.
 */
export async function issueGiftCard(
  params: {
    amount: number;
    purchaserUserId?: string | null;
    recipientName?: string | null;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    personalMessage?: string | null;
    deliveryDate?: Date | null;
    orderId?: string | null;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const settings = await getRetentionSettings();
  const { fullCode, codeHash, maskedCode } = generateGiftCardCode();

  const expiresAt =
    settings.giftCardExpiryDays > 0
      ? new Date(Date.now() + settings.giftCardExpiryDays * 24 * 60 * 60 * 1000)
      : null;

  const card = await txClient.giftCard.create({
    data: {
      codeHash,
      maskedCode,
      originalAmount: params.amount,
      remainingBalance: params.amount,
      currency: 'INR',
      status: 'ACTIVE',
      purchaserUserId: params.purchaserUserId,
      recipientName: params.recipientName,
      recipientEmail: params.recipientEmail,
      recipientPhone: params.recipientPhone,
      personalMessage: params.personalMessage,
      deliveryDate: params.deliveryDate,
      orderId: params.orderId,
      expiresAt,
    },
  });

  // Record initial ISSUE transaction in ledger
  await txClient.giftCardTransaction.create({
    data: {
      giftCardId: card.id,
      type: 'ISSUE',
      amount: params.amount,
      orderId: params.orderId,
      note: 'Initial issuance',
    },
  });

  return { card, rawCode: fullCode };
}

/**
 * Check balance of a gift card by raw code.
 */
export async function getGiftCardByCode(rawCode: string) {
  const codeHash = hashGiftCardCode(rawCode);
  const card = await prisma.giftCard.findUnique({
    where: { codeHash },
  });

  if (!card) return null;
  if (card.status !== 'ACTIVE') return null;
  if (card.expiresAt && card.expiresAt < new Date()) {
    return null;
  }
  return card;
}

/**
 * Atomically redeems gift card balance during checkout.
 */
export async function redeemGiftCard(
  params: {
    rawCode: string;
    amountToSpend: number;
    orderId?: string;
    note?: string;
  },
  txClient: Prisma.TransactionClient = prisma as any,
): Promise<{ success: boolean; appliedAmount: number; remainingBalance: number; error?: string }> {
  const settings = await getRetentionSettings();
  if (!settings.giftCardsEnabled) {
    return { success: false, appliedAmount: 0, remainingBalance: 0, error: 'Gift cards are currently inactive.' };
  }

  const codeHash = hashGiftCardCode(params.rawCode);
  const card = await txClient.giftCard.findUnique({
    where: { codeHash },
  });

  if (!card || card.status !== 'ACTIVE') {
    return { success: false, appliedAmount: 0, remainingBalance: 0, error: 'Invalid or inactive gift card code.' };
  }

  if (card.expiresAt && card.expiresAt < new Date()) {
    return { success: false, appliedAmount: 0, remainingBalance: 0, error: 'This gift card has expired.' };
  }

  if (card.remainingBalance <= 0) {
    return { success: false, appliedAmount: 0, remainingBalance: 0, error: 'Gift card has zero balance.' };
  }

  // Allow partial or full redemption
  const appliedAmount = Math.min(card.remainingBalance, params.amountToSpend);
  const newBalance = card.remainingBalance - appliedAmount;
  const newStatus = newBalance <= 0 ? 'USED' : 'ACTIVE';

  await txClient.giftCard.update({
    where: { id: card.id },
    data: {
      remainingBalance: newBalance,
      status: newStatus,
    },
  });

  await txClient.giftCardTransaction.create({
    data: {
      giftCardId: card.id,
      type: 'DEBIT',
      amount: appliedAmount,
      orderId: params.orderId,
      note: params.note || 'Checkout redemption',
    },
  });

  return {
    success: true,
    appliedAmount,
    remainingBalance: newBalance,
  };
}

/**
 * Restores gift card balance in the event of an order cancellation or refund.
 */
export async function restoreGiftCardBalance(
  params: {
    giftCardId: string;
    amountToRestore: number;
    orderId?: string;
    reason: string;
  },
  txClient: Prisma.TransactionClient = prisma as any,
) {
  const card = await txClient.giftCard.findUnique({
    where: { id: params.giftCardId },
  });
  if (!card) return;

  const newBalance = Math.min(card.originalAmount, card.remainingBalance + params.amountToRestore);

  await txClient.giftCard.update({
    where: { id: card.id },
    data: {
      remainingBalance: newBalance,
      status: 'ACTIVE',
    },
  });

  await txClient.giftCardTransaction.create({
    data: {
      giftCardId: card.id,
      type: 'REFUND_CREDIT',
      amount: params.amountToRestore,
      orderId: params.orderId,
      note: `Refund restoration: ${params.reason}`,
    },
  });
}

