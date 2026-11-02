import { describe, it, expect, vi } from 'vitest';
import {
  calculateOrderEarningPoints,
  redeemLoyaltyPoints,
} from '@/lib/retention/loyalty';
import * as settingsMod from '@/lib/retention/settings';

describe('Loyalty Ledger & Calculation Engine', () => {
  it('calculates order earning points properly according to ratio', () => {
    // ₹100 = 1 pt
    expect(calculateOrderEarningPoints(99, 1, 0)).toBe(0);
    expect(calculateOrderEarningPoints(100, 1, 0)).toBe(1);
    expect(calculateOrderEarningPoints(250, 1, 0)).toBe(2);
    expect(calculateOrderEarningPoints(1500, 2, 0)).toBe(30);

    // minimum order spend enforcement
    expect(calculateOrderEarningPoints(499, 1, 500)).toBe(0);
    expect(calculateOrderEarningPoints(500, 1, 500)).toBe(5);
  });

  it('rejects redemption when loyalty feature is disabled', async () => {
    vi.spyOn(settingsMod, 'getRetentionSettings').mockResolvedValueOnce({
      ...settingsMod.DEFAULT_RETENTION_SETTINGS,
      loyaltyEnabled: false,
    });

    const fakeTx: any = {};
    const res = await redeemLoyaltyPoints(
      {
        userId: 'u1',
        pointsToRedeem: 100,
        orderSubtotal: 1000,
      },
      fakeTx,
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inactive/i);
  });

  it('validates minimum redemption and max percentage rules when enabled', async () => {
    vi.spyOn(settingsMod, 'getRetentionSettings').mockResolvedValue({
      ...settingsMod.DEFAULT_RETENTION_SETTINGS,
      loyaltyEnabled: true,
      minimumRedemptionPoints: 50,
      maxOrderRedemptionPercent: 20, // Max 20%
      redemptionValuePerPoint: 1.0,
    });

    const fakeTx: any = {
      loyaltyAccount: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'acc_1',
          userId: 'u1',
          availablePoints: 500,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      loyaltyTransaction: {
        create: vi.fn().mockResolvedValue({ id: 'tx_1' }),
      },
    };

    // Subtotal 1000 => max discount 20% = ₹200.
    // 1. Below minimum points (e.g. 20 points)
    const resLow = await redeemLoyaltyPoints(
      { userId: 'u1', pointsToRedeem: 20, orderSubtotal: 1000 },
      fakeTx,
    );
    expect(resLow.success).toBe(false);
    expect(resLow.error).toMatch(/Minimum 50 points/);

    // 2. Above max percentage (e.g. 250 points = ₹250 > ₹200)
    const resHigh = await redeemLoyaltyPoints(
      { userId: 'u1', pointsToRedeem: 250, orderSubtotal: 1000 },
      fakeTx,
    );
    expect(resHigh.success).toBe(false);
    expect(resHigh.error).toMatch(/up to 20%/);

    // 3. Valid redemption (e.g. 100 points = ₹100 <= ₹200)
    const resValid = await redeemLoyaltyPoints(
      { userId: 'u1', pointsToRedeem: 100, orderSubtotal: 1000, orderNumber: 'ORD-999' },
      fakeTx,
    );
    expect(resValid.success).toBe(true);
    expect(resValid.discountAmount).toBe(100);
    expect(fakeTx.loyaltyTransaction.create).toHaveBeenCalled();
    expect(fakeTx.loyaltyAccount.update).toHaveBeenCalled();
  });
});
