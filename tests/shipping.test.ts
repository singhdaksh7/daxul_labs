import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COD_SETTINGS,
  codEligibility,
  computeTotal,
  evaluateCoupon,
  resolveShippingMethod,
  shippingCharge,
  type CouponLike,
  type ShippingSettings,
} from '@/lib/shipping';

const S: ShippingSettings = { standardEnabled: true, expressEnabled: true, standardFee: 99, expressFee: 199, freeThreshold: 1999 };
const now = new Date('2026-06-01T00:00:00Z');
const coupon = (o: Partial<CouponLike> = {}): CouponLike => ({
  id: 'c1', code: 'SAVE10', discountType: 'percentage', discountValue: 10, minOrderValue: 0,
  startDate: null, expiryDate: null, usageLimit: null, usedCount: 0, isActive: true, ...o,
});

describe('resolveShippingMethod', () => {
  it('defaults to STANDARD, then EXPRESS when standard is off', () => {
    expect(resolveShippingMethod(undefined, S)).toEqual({ ok: true, method: 'STANDARD' });
    expect(resolveShippingMethod(null, { ...S, standardEnabled: false })).toEqual({ ok: true, method: 'EXPRESS' });
  });
  it('rejects disabled, unknown and all-disabled', () => {
    expect(resolveShippingMethod('EXPRESS', { ...S, expressEnabled: false }).ok).toBe(false);
    expect(resolveShippingMethod('DRONE', S).ok).toBe(false);
    expect(resolveShippingMethod(undefined, { ...S, standardEnabled: false, expressEnabled: false }).ok).toBe(false);
  });
});

describe('shippingCharge', () => {
  it('waives STANDARD at the threshold on the post-discount subtotal, never EXPRESS', () => {
    expect(shippingCharge('STANDARD', 1998.99, S).fee).toBe(99);
    expect(shippingCharge('STANDARD', 1999, S)).toMatchObject({ fee: 0, freeApplied: true });
    expect(shippingCharge('EXPRESS', 5000, S)).toMatchObject({ fee: 199, freeApplied: false });
  });
});

describe('evaluateCoupon', () => {
  it('applies percentage and caps fixed discounts at the subtotal', () => {
    expect(evaluateCoupon(coupon(), 1000, now)).toMatchObject({ valid: true, discountAmount: 100 });
    expect(evaluateCoupon(coupon({ discountType: 'fixed', discountValue: 5000 }), 1000, now)).toMatchObject({ valid: true, discountAmount: 1000 });
  });
  it('collapses not found / inactive / expired / not started into one generic reason', () => {
    const invalid = { valid: false, reason: 'invalid' };
    expect(evaluateCoupon(null, 100, now)).toMatchObject(invalid);
    expect(evaluateCoupon(coupon({ isActive: false }), 100, now)).toMatchObject(invalid);
    expect(evaluateCoupon(coupon({ expiryDate: new Date('2026-05-01') }), 100, now)).toMatchObject(invalid);
    expect(evaluateCoupon(coupon({ startDate: new Date('2026-07-01') }), 100, now)).toMatchObject(invalid);
  });
  it('reports usage limit and minimum order', () => {
    expect(evaluateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), 100, now)).toMatchObject({ valid: false, reason: 'exhausted' });
    expect(evaluateCoupon(coupon({ minOrderValue: 500 }), 100, now)).toMatchObject({ valid: false, reason: 'min_order', minOrderValue: 500 });
  });
});

describe('codEligibility', () => {
  const line = { productName: 'Lamp', prepaidOnly: false, codEnabled: true, customizable: false, hasCustomizations: false };
  it('allows plain products and returns the fee', () => {
    expect(codEligibility([line], DEFAULT_COD_SETTINGS)).toEqual({ eligible: true, reason: null, fee: 50 });
  });
  it('blocks globally, prepaid-only, customizable, and customized lines', () => {
    expect(codEligibility([line], { ...DEFAULT_COD_SETTINGS, globalCodEnabled: false }).eligible).toBe(false);
    expect(codEligibility([{ ...line, prepaidOnly: true }], DEFAULT_COD_SETTINGS).eligible).toBe(false);
    expect(codEligibility([{ ...line, codEnabled: false }], DEFAULT_COD_SETTINGS).eligible).toBe(false);
    expect(codEligibility([{ ...line, customizable: true }], DEFAULT_COD_SETTINGS).eligible).toBe(false);
    expect(codEligibility([{ ...line, hasCustomizations: true }], DEFAULT_COD_SETTINGS).eligible).toBe(false);
    expect(codEligibility([{ ...line, hasCustomizations: true }], { ...DEFAULT_COD_SETTINGS, customProductsPrepaidOnly: false }).eligible).toBe(true);
  });
  it('fee is 0 when disabled', () => {
    expect(codEligibility([line], { ...DEFAULT_COD_SETTINGS, codFeeEnabled: false }).fee).toBe(0);
  });
});

describe('computeTotal', () => {
  it('adds up and never goes negative', () => {
    expect(computeTotal({ subtotal: 1000, discountAmount: 100, shippingFee: 99, codFee: 50 })).toBe(1049);
    expect(computeTotal({ subtotal: 10, discountAmount: 10, shippingFee: 0, codFee: 0 })).toBe(0);
  });
});
