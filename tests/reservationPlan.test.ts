import { describe, expect, it } from 'vitest';
import {
  extractVariantIds,
  planStockDeltas,
  qualifiesForRelease,
  reservationExpiry,
  type PlanCatalog,
} from '@/lib/reservationPlan';

const now = new Date('2026-01-01T12:00:00Z');
const past = new Date('2026-01-01T11:00:00Z');
const future = new Date('2026-01-01T13:00:00Z');
const base = {
  paymentMethod: 'prepaid',
  paymentStatus: 'pending',
  status: 'new',
  reservationExpiresAt: past as Date | null,
  stockReleasedAt: null as Date | null,
};

describe('qualifiesForRelease', () => {
  it('releases an expired unpaid prepaid order', () => {
    expect(qualifiesForRelease(base, now)).toBe(true);
  });
  it('treats expiry == now as expired', () => {
    expect(qualifiesForRelease({ ...base, reservationExpiresAt: now }, now)).toBe(true);
  });
  it('never releases COD, paid, failed, cancelled, unexpired, no-expiry or already-released orders', () => {
    expect(qualifiesForRelease({ ...base, paymentMethod: 'cod' }, now)).toBe(false);
    expect(qualifiesForRelease({ ...base, paymentStatus: 'paid' }, now)).toBe(false);
    expect(qualifiesForRelease({ ...base, paymentStatus: 'failed' }, now)).toBe(false);
    expect(qualifiesForRelease({ ...base, status: 'cancelled' }, now)).toBe(false);
    expect(qualifiesForRelease({ ...base, reservationExpiresAt: future }, now)).toBe(false);
    expect(qualifiesForRelease({ ...base, reservationExpiresAt: null }, now)).toBe(false);
    expect(qualifiesForRelease({ ...base, stockReleasedAt: past }, now)).toBe(false);
  });
});

describe('reservationExpiry', () => {
  it('is now + minutes for unpaid prepaid orders only', () => {
    expect(reservationExpiry('prepaid', 500, now, 60)?.toISOString()).toBe('2026-01-01T13:00:00.000Z');
    expect(reservationExpiry('cod', 500, now, 60)).toBeNull();
    expect(reservationExpiry('prepaid', 0, now, 60)).toBeNull();
  });
  it('falls back to 60 minutes on bad settings', () => {
    expect(reservationExpiry('prepaid', 10, now, 0)?.toISOString()).toBe('2026-01-01T13:00:00.000Z');
    expect(reservationExpiry('prepaid', 10, now, NaN)?.toISOString()).toBe('2026-01-01T13:00:00.000Z');
  });
});

describe('extractVariantIds', () => {
  it('reads variantId from snapshots and ignores junk', () => {
    expect(extractVariantIds([{ variantId: 'a' }, { variantId: 5 }, null, 'x', {}])).toEqual(['a']);
    expect(extractVariantIds(null)).toEqual([]);
    expect(extractVariantIds({ variantId: 'a' })).toEqual([]);
  });
});

describe('planStockDeltas (mirrors create-order decrements)', () => {
  const catalog: PlanCatalog = {
    variantStock: new Map<string, number | null>([['v1', 5], ['v2', null], ['v3', 0]]),
    productTracked: new Map([['p1', true], ['p2', false]]),
  };
  it('restores tracked variant stock and not product stock when a variant tracks stock', () => {
    const d = planStockDeltas([{ productId: 'p1', quantity: 2, variantSelections: [{ variantId: 'v1' }] }], catalog);
    expect([...d.variants]).toEqual([['v1', 2]]);
    expect(d.products.size).toBe(0);
  });
  it('falls back to product stock when variants are untracked and the product is tracked', () => {
    const d = planStockDeltas([{ productId: 'p1', quantity: 3, variantSelections: [{ variantId: 'v2' }] }], catalog);
    expect(d.variants.size).toBe(0);
    expect([...d.products]).toEqual([['p1', 3]]);
  });
  it('does nothing for untracked products', () => {
    const d = planStockDeltas([{ productId: 'p2', quantity: 3, variantSelections: null }], catalog);
    expect(d.variants.size + d.products.size).toBe(0);
  });
  it('treats a tracked variant with stock 0 as tracked (decrement happened)', () => {
    const d = planStockDeltas([{ productId: 'p1', quantity: 1, variantSelections: [{ variantId: 'v3' }] }], catalog);
    expect([...d.variants]).toEqual([['v3', 1]]);
  });
  it('aggregates multiple lines and ignores variants/products that no longer exist', () => {
    const d = planStockDeltas(
      [
        { productId: 'p1', quantity: 1, variantSelections: [{ variantId: 'v1' }] },
        { productId: 'p1', quantity: 4, variantSelections: [{ variantId: 'v1' }] },
        { productId: 'p1', quantity: 2, variantSelections: null },
        { productId: 'gone', quantity: 9, variantSelections: [{ variantId: 'missing' }] },
      ],
      catalog,
    );
    expect([...d.variants]).toEqual([['v1', 5]]);
    expect([...d.products]).toEqual([['p1', 2]]);
  });
});
