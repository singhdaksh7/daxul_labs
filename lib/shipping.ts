/**
 * Pure (no DB, no React) checkout arithmetic shared by /api/quote and create-order:
 * shipping method resolution + charge, coupon evaluation, COD eligibility, totals.
 *
 * Rules (documented, deliberate):
 *  - Free-shipping threshold is compared with the subtotal AFTER coupon discount.
 *  - The free-shipping threshold waives the STANDARD charge only. EXPRESS is always charged.
 *  - A threshold <= 0 behaves like the legacy code (`subtotal >= 0` => standard is free).
 */

export type ShippingMethod = 'STANDARD' | 'EXPRESS';
export const SHIPPING_METHODS: readonly ShippingMethod[] = ['STANDARD', 'EXPRESS'] as const;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ShippingSettings {
  standardEnabled: boolean;
  expressEnabled: boolean;
  standardFee: number;
  expressFee: number;
  freeThreshold: number;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  standardEnabled: true,
  expressEnabled: false,
  standardFee: 99,
  expressFee: 199,
  freeThreshold: 1999,
};

export function enabledMethods(s: ShippingSettings): ShippingMethod[] {
  const out: ShippingMethod[] = [];
  if (s.standardEnabled) out.push('STANDARD');
  if (s.expressEnabled) out.push('EXPRESS');
  return out;
}

export type ShippingResolution =
  | { ok: true; method: ShippingMethod }
  | { ok: false; message: string };

/** Validates a requested method against settings. No request => first enabled method (STANDARD preferred). */
export function resolveShippingMethod(requested: string | null | undefined, s: ShippingSettings): ShippingResolution {
  const enabled = enabledMethods(s);
  if (enabled.length === 0) return { ok: false, message: 'Shipping is currently unavailable.' };
  if (requested === undefined || requested === null || requested === '') return { ok: true, method: enabled[0] };
  if (requested !== 'STANDARD' && requested !== 'EXPRESS') return { ok: false, message: 'Unknown shipping method.' };
  if (!enabled.includes(requested)) return { ok: false, message: `${requested === 'EXPRESS' ? 'Express' : 'Standard'} shipping is not available.` };
  return { ok: true, method: requested };
}

export interface ShippingCharge {
  method: ShippingMethod;
  /** configured fee for the method */
  baseFee: number;
  /** what the customer pays */
  fee: number;
  freeApplied: boolean;
}

export function shippingCharge(method: ShippingMethod, subtotalAfterDiscount: number, s: ShippingSettings): ShippingCharge {
  const baseFee = round2(Math.max(0, method === 'EXPRESS' ? s.expressFee : s.standardFee));
  const freeApplied = method === 'STANDARD' && subtotalAfterDiscount >= s.freeThreshold;
  return { method, baseFee, fee: freeApplied ? 0 : baseFee, freeApplied };
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export interface CouponLike {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed' | string;
  discountValue: number;
  minOrderValue: number;
  startDate: Date | null;
  expiryDate: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

/**
 * Public reason codes are intentionally coarse: not-found / inactive / expired / not-started
 * all collapse to `invalid` so the endpoint cannot be used to distinguish retired codes.
 */
export type CouponReason = 'invalid' | 'min_order' | 'exhausted';

export type CouponEvaluation =
  | { valid: true; coupon: CouponLike; discountAmount: number }
  | { valid: false; reason: CouponReason; message: string; minOrderValue?: number };

export function evaluateCoupon(coupon: CouponLike | null | undefined, subtotal: number, now: Date): CouponEvaluation {
  const invalid: CouponEvaluation = { valid: false, reason: 'invalid', message: 'This promo code is not valid.' };
  if (!coupon || !coupon.isActive) return invalid;
  if (coupon.startDate && coupon.startDate > now) return invalid;
  if (coupon.expiryDate && coupon.expiryDate < now) return invalid;
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, reason: 'exhausted', message: 'This promo code is no longer available.' };
  }
  if (subtotal < coupon.minOrderValue) {
    return {
      valid: false,
      reason: 'min_order',
      message: 'Your order does not meet the minimum value for this code.',
      minOrderValue: coupon.minOrderValue,
    };
  }
  const raw = coupon.discountType === 'percentage' ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
  const discountAmount = round2(Math.max(0, Math.min(raw, subtotal)));
  return { valid: true, coupon, discountAmount };
}

// ---------------------------------------------------------------------------
// COD
// ---------------------------------------------------------------------------

export interface CodLineFlags {
  productName: string;
  prepaidOnly: boolean;
  codEnabled: boolean;
  customizable: boolean;
  hasCustomizations: boolean;
}

export interface CodSettings {
  globalCodEnabled: boolean;
  customProductsPrepaidOnly: boolean;
  codFeeEnabled: boolean;
  codFee: number;
}

export const DEFAULT_COD_SETTINGS: CodSettings = {
  globalCodEnabled: true,
  customProductsPrepaidOnly: true,
  codFeeEnabled: true,
  codFee: 50,
};

export function codEligibility(lines: CodLineFlags[], s: CodSettings): { eligible: boolean; reason: string | null; fee: number } {
  const fee = s.codFeeEnabled ? round2(Math.max(0, s.codFee)) : 0;
  if (!s.globalCodEnabled) return { eligible: false, reason: 'Cash on delivery is currently unavailable. Please pay online.', fee };
  for (const l of lines) {
    if (l.prepaidOnly || !l.codEnabled || l.customizable || (s.customProductsPrepaidOnly && l.hasCustomizations)) {
      return { eligible: false, reason: `"${l.productName}" requires prepaid payment (COD not available).`, fee };
    }
  }
  return { eligible: true, reason: null, fee };
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export function computeTotal(parts: { subtotal: number; discountAmount: number; shippingFee: number; codFee: number }): number {
  return round2(Math.max(0, parts.subtotal - parts.discountAmount + parts.shippingFee + parts.codFee));
}
