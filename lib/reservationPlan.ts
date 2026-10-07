/**
 * Pure decision logic for stock reservation expiry (no DB). Unit-tested in tests/reservationPlan.test.ts.
 *
 * create-order decrements stock for every order (prepaid and COD):
 *   - each selected variant whose own `stock` is not null -> variant.stock -= qty
 *   - otherwise, if product.trackInventory -> product.stock -= qty (only when no selected variant tracks stock)
 * Releasing mirrors exactly that decision from the OrderItem snapshot.
 */

export interface ReservationOrderLike {
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  reservationExpiresAt: Date | null;
  stockReleasedAt: Date | null;
}

/** Whether an order's reservation has expired and should be released. */
export function qualifiesForRelease(o: ReservationOrderLike, now: Date): boolean {
  return (
    o.paymentMethod === 'prepaid' &&
    o.paymentStatus === 'pending' &&
    o.status !== 'cancelled' &&
    o.reservationExpiresAt !== null &&
    o.reservationExpiresAt.getTime() <= now.getTime() &&
    o.stockReleasedAt === null
  );
}

/** Expiry timestamp for a new order; null when stock is held indefinitely (COD, nothing to pay). */
export function reservationExpiry(
  paymentMethod: 'prepaid' | 'cod',
  totalAmount: number,
  now: Date,
  reservationMinutes: number,
): Date | null {
  if (paymentMethod !== 'prepaid' || !(totalAmount > 0)) return null;
  const minutes = Number.isFinite(reservationMinutes) && reservationMinutes > 0 ? reservationMinutes : 60;
  return new Date(now.getTime() + minutes * 60_000);
}

/** Variant ids out of OrderItem.variantSelections (array of snapshots). Ignores malformed entries. */
export function extractVariantIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  const out: string[] = [];
  for (const e of json) {
    if (e && typeof e === 'object' && typeof (e as { variantId?: unknown }).variantId === 'string') {
      out.push((e as { variantId: string }).variantId);
    }
  }
  return out;
}

export interface PlanItem {
  productId: string;
  quantity: number;
  variantSelections: unknown;
}

export interface PlanCatalog {
  /** variant id -> current stock (null = untracked). Missing id = variant no longer exists. */
  variantStock: Map<string, number | null>;
  /** product id -> trackInventory. Missing id = product no longer exists. */
  productTracked: Map<string, boolean>;
}

export interface StockDeltas {
  variants: Map<string, number>;
  products: Map<string, number>;
}

/** Per-variant and per-product quantities that create-order decremented for these items. */
export function planStockDeltas(items: PlanItem[], catalog: PlanCatalog): StockDeltas {
  const variants = new Map<string, number>();
  const products = new Map<string, number>();
  for (const it of items) {
    const tracked = extractVariantIds(it.variantSelections).filter((vid) => {
      const s = catalog.variantStock.get(vid);
      return s !== undefined && s !== null;
    });
    for (const vid of tracked) variants.set(vid, (variants.get(vid) ?? 0) + it.quantity);
    if (tracked.length === 0 && catalog.productTracked.get(it.productId) === true) {
      products.set(it.productId, (products.get(it.productId) ?? 0) + it.quantity);
    }
  }
  return { variants, products };
}
