import { describe, it, expect, vi } from 'vitest';
import {
  generateGiftCardCode,
  hashGiftCardCode,
  redeemGiftCard,
} from '@/lib/retention/giftCards';
import { debitStoreCredit } from '@/lib/retention/storeCredit';
import { renderTemplate } from '@/lib/retention/automation';
import * as settingsMod from '@/lib/retention/settings';

describe('Phase C: Gift Cards, Store Credit & Automation Engine', () => {
  it('generates high entropy gift card code with masked representation', () => {
    const card = generateGiftCardCode();
    expect(card.fullCode).toMatch(/^DXL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(card.maskedCode).toMatch(/^DXL-••••-••••-[A-Z0-9]{4}$/);
    expect(card.codeHash).toHaveLength(64); // SHA-256 length
  });

  it('correctly hashes raw gift card code case-insensitively', () => {
    const hash1 = hashGiftCardCode('dxl-abcd-1234-efgh');
    const hash2 = hashGiftCardCode('DXL-ABCD-1234-EFGH');
    expect(hash1).toBe(hash2);
  });

  it('rejects gift card redemption when feature flag is disabled', async () => {
    vi.spyOn(settingsMod, 'getRetentionSettings').mockResolvedValueOnce({
      ...settingsMod.DEFAULT_RETENTION_SETTINGS,
      giftCardsEnabled: false,
    });

    const fakeTx: any = {};
    const res = await redeemGiftCard(
      { rawCode: 'DXL-1111-2222-3333', amountToSpend: 500 },
      fakeTx,
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inactive/i);
  });

  it('supports partial and full gift card redemption atomically', async () => {
    vi.spyOn(settingsMod, 'getRetentionSettings').mockResolvedValue({
      ...settingsMod.DEFAULT_RETENTION_SETTINGS,
      giftCardsEnabled: true,
    });

    const fakeTx: any = {
      giftCard: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'gc_1',
          status: 'ACTIVE',
          remainingBalance: 2000,
          originalAmount: 2000,
          expiresAt: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      giftCardTransaction: {
        create: vi.fn().mockResolvedValue({ id: 'gtx_1' }),
      },
    };

    // Partial use: ₹1200 out of ₹2000
    const resPartial = await redeemGiftCard(
      { rawCode: 'DXL-AAAA-BBBB-CCCC', amountToSpend: 1200 },
      fakeTx,
    );
    expect(resPartial.success).toBe(true);
    expect(resPartial.appliedAmount).toBe(1200);
    expect(resPartial.remainingBalance).toBe(800);
    expect(fakeTx.giftCard.update).toHaveBeenCalledWith({
      where: { id: 'gc_1' },
      data: { remainingBalance: 800, status: 'ACTIVE' },
    });
  });

  it('debited store credit respects available balance and active flag', async () => {
    vi.spyOn(settingsMod, 'getRetentionSettings').mockResolvedValue({
      ...settingsMod.DEFAULT_RETENTION_SETTINGS,
      storeCreditEnabled: true,
    });

    const fakeTx: any = {
      storeCreditAccount: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'sc_1',
          availableBalance: 400,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      storeCreditTransaction: {
        create: vi.fn().mockResolvedValue({ id: 'stx_1' }),
      },
    };

    // Spending 500 when available is 400 -> applies 400, leaves 0
    const res = await debitStoreCredit(
      { userId: 'u1', amountToSpend: 500, reason: 'Checkout test' },
      fakeTx,
    );
    expect(res.success).toBe(true);
    expect(res.appliedAmount).toBe(400);
    expect(res.remainingBalance).toBe(0);
  });

  it('sanitizes lifecycle notification template variables safely', () => {
    const template = 'Hello {{customer_name}}, order #{{order_number}} is confirmed!';
    const rendered = renderTemplate(template, {
      customer_name: '<script>alert(1)</script>John',
      order_number: 'DX-1001',
    });
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).toContain('DX-1001');
  });
});

