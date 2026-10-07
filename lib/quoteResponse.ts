import type { CheckoutComputation } from '@/lib/pricing';

/** Public (client-safe) shape of a checkout computation. Contains no cost data. */
export interface QuoteResponse {
  ok: boolean;
  currency: { symbol: string; code: string };
  paymentMethod: 'prepaid' | 'cod';
  lines: Array<{
    index: number;
    productId: string;
    productName: string;
    quantity: number;
    basePrice: number;
    variantAdjustment: number;
    customizationFee: number;
    unitPrice: number;
    lineTotal: number;
    stock: { available: boolean; remaining: number | null };
  }>;
  subtotal: number;
  coupon: {
    code: string | null;
    valid: boolean;
    code_reason: null | 'invalid' | 'min_order' | 'exhausted';
    message: string | null;
    discountAmount: number;
    minOrderValue?: number;
  } | null;
  discountAmount: number;
  shipping: {
    method: 'STANDARD' | 'EXPRESS' | null;
    fee: number;
    freeApplied: boolean;
    freeShippingThreshold: number;
    amountToFree: number;
    options: Array<{ method: 'STANDARD' | 'EXPRESS'; baseFee: number; fee: number }>;
  };
  cod: { eligible: boolean; reason: string | null; fee: number };
  codFee: number;
  total: number;
  issues: Array<{ code: string; message: string; index?: number }>;
}

export function toQuoteResponse(c: CheckoutComputation): QuoteResponse {
  const ev = c.couponEvaluation;
  return {
    ok: c.issues.length === 0,
    currency: { symbol: c.settings.currencySymbol, code: c.settings.currencyCode },
    paymentMethod: c.paymentMethod,
    lines: c.lines.map((l) => ({
      index: l.index,
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
      basePrice: l.basePrice,
      variantAdjustment: l.variantAdjustment,
      customizationFee: l.customizationFee,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      stock: { available: l.stock.ok, remaining: l.stock.remaining },
    })),
    subtotal: c.subtotal,
    coupon: ev
      ? ev.valid
        ? { code: c.couponCode, valid: true, code_reason: null, message: null, discountAmount: c.discountAmount }
        : {
            code: c.couponCode,
            valid: false,
            code_reason: ev.reason,
            message: ev.message,
            discountAmount: 0,
            ...(ev.minOrderValue !== undefined ? { minOrderValue: ev.minOrderValue } : {}),
          }
      : null,
    discountAmount: c.discountAmount,
    shipping: {
      method: c.shipping.method,
      fee: c.shipping.fee,
      freeApplied: c.shipping.freeApplied,
      freeShippingThreshold: c.settings.shipping.freeThreshold,
      amountToFree: c.shipping.amountToFree,
      options: c.shipping.options.map((o) => ({ method: o.method, baseFee: o.baseFee, fee: o.fee })),
    },
    cod: { eligible: c.cod.eligible, reason: c.cod.reason, fee: c.cod.fee },
    codFee: c.codFee,
    total: c.total,
    issues: c.issues,
  };
}
