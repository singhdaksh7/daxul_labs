/**
 * Stock reservation expiry + payment-vs-expiry race handling. Server only.
 * Pure decision logic lives in lib/reservationPlan.ts (unit tested).
 * See docs/RESERVATIONS.md.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  extractVariantIds,
  planStockDeltas,
  type PlanCatalog,
  type PlanItem,
  type StockDeltas,
} from '@/lib/reservationPlan';

type Tx = Prisma.TransactionClient;

interface ItemRow {
  productId: string;
  quantity: number;
  variantSelections: unknown;
}

async function buildDeltas(tx: Tx, items: ItemRow[]): Promise<{ deltas: StockDeltas; variantProduct: Map<string, string> }> {
  const variantIds = Array.from(new Set(items.flatMap((i) => extractVariantIds(i.variantSelections))));
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const [variants, products] = await Promise.all([
    variantIds.length ? tx.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, stock: true } }) : [],
    tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, trackInventory: true } }),
  ]);
  const catalog: PlanCatalog = {
    variantStock: new Map(variants.map((v) => [v.id, v.stock])),
    productTracked: new Map(products.map((p) => [p.id, p.trackInventory])),
  };
  const variantProduct = new Map<string, string>();
  for (const it of items) for (const vid of extractVariantIds(it.variantSelections)) variantProduct.set(vid, it.productId);
  return { deltas: planStockDeltas(items as PlanItem[], catalog), variantProduct };
}

/** Increment stock for the deltas and write ledger rows. */
async function restoreStock(tx: Tx, d: StockDeltas, variantProduct: Map<string, string>, reason: string, note: string) {
  for (const [vid, qty] of d.variants) {
    const v = await tx.productVariant.update({ where: { id: vid }, data: { stock: { increment: qty } } });
    await tx.inventoryAdjustment.create({
      data: { productId: variantProduct.get(vid)!, variantId: vid, delta: qty, quantityAfter: v.stock ?? 0, reason, note },
    });
  }
  for (const [pid, qty] of d.products) {
    const p = await tx.product.update({ where: { id: pid }, data: { stock: { increment: qty } } });
    await tx.inventoryAdjustment.create({
      data: { productId: pid, delta: qty, quantityAfter: p.stock, reason, note },
    });
  }
}

/**
 * Try to take the stock again (guarded decrements). Returns false (and leaves stock untouched)
 * when anything is short. Must run inside a transaction.
 */
async function tryReserveStock(tx: Tx, d: StockDeltas, variantProduct: Map<string, string>, note: string): Promise<boolean> {
  const doneVariants: Array<[string, number]> = [];
  const doneProducts: Array<[string, number]> = [];
  let ok = true;
  for (const [vid, qty] of d.variants) {
    const r = await tx.productVariant.updateMany({ where: { id: vid, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
    if (r.count !== 1) { ok = false; break; }
    doneVariants.push([vid, qty]);
  }
  if (ok) {
    for (const [pid, qty] of d.products) {
      const r = await tx.product.updateMany({ where: { id: pid, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
      if (r.count !== 1) { ok = false; break; }
      doneProducts.push([pid, qty]);
    }
  }
  if (!ok) {
    for (const [vid, qty] of doneVariants) await tx.productVariant.update({ where: { id: vid }, data: { stock: { increment: qty } } });
    for (const [pid, qty] of doneProducts) await tx.product.update({ where: { id: pid }, data: { stock: { increment: qty } } });
    return false;
  }
  for (const [vid, qty] of doneVariants) {
    const v = await tx.productVariant.findUniqueOrThrow({ where: { id: vid }, select: { stock: true } });
    await tx.inventoryAdjustment.create({
      data: { productId: variantProduct.get(vid)!, variantId: vid, delta: -qty, quantityAfter: v.stock ?? 0, reason: 'order', note },
    });
  }
  for (const [pid, qty] of doneProducts) {
    const p = await tx.product.findUniqueOrThrow({ where: { id: pid }, select: { stock: true } });
    await tx.inventoryAdjustment.create({ data: { productId: pid, delta: -qty, quantityAfter: p.stock, reason: 'order', note } });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

async function releaseOne(orderId: string, now: Date): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // Atomic claim: only one runner (cron, opportunistic call, other instance) can win, and a
    // payment that landed first (paymentStatus != pending) makes this a no-op.
    const claim = await tx.order.updateMany({
      where: {
        id: orderId,
        paymentMethod: 'prepaid',
        paymentStatus: 'pending',
        status: { not: 'cancelled' },
        reservationExpiresAt: { lte: now },
        stockReleasedAt: null,
      },
      data: { stockReleasedAt: now, status: 'cancelled' },
    });
    if (claim.count !== 1) return false;

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { orderNumber: true, couponCode: true, items: { select: { productId: true, quantity: true, variantSelections: true } } },
    });
    const { deltas, variantProduct } = await buildDeltas(tx, order.items);
    await restoreStock(tx, deltas, variantProduct, 'reservation_released', order.orderNumber);

    if (order.couponCode) {
      await tx.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }
    await tx.orderStatusHistory.create({
      data: { orderId, status: 'cancelled', note: 'Reservation expired — stock released' },
    });
    await tx.auditLog.create({
      data: {
        adminUserEmail: 'system',
        action: 'RESERVATION_RELEASED',
        entityType: 'Order',
        entityId: orderId,
        details: {
          orderNumber: order.orderNumber,
          variants: Object.fromEntries(deltas.variants),
          products: Object.fromEntries(deltas.products),
        },
      },
    });
    return true;
  });
}

export async function releaseExpiredReservations(
  now: Date = new Date(),
  limit = 100,
): Promise<{ released: number; failed: number; orderIds: string[] }> {
  const candidates = await prisma.order.findMany({
    where: {
      paymentMethod: 'prepaid',
      paymentStatus: 'pending',
      status: { not: 'cancelled' },
      reservationExpiresAt: { lte: now },
      stockReleasedAt: null,
    },
    select: { id: true },
    orderBy: { reservationExpiresAt: 'asc' },
    take: limit,
  });
  const orderIds: string[] = [];
  let failed = 0;
  for (const c of candidates) {
    try {
      if (await releaseOne(c.id, now)) orderIds.push(c.id);
    } catch (err) {
      failed++;
      console.error('releaseExpiredReservations: order failed', c.id, err);
    }
  }
  return { released: orderIds.length, failed, orderIds };
}

let lastOpportunistic = 0;
/** Throttled (1/min per process) best-effort release; never throws. */
export async function maybeReleaseExpiredReservations(): Promise<void> {
  const t = Date.now();
  if (t - lastOpportunistic < 60_000) return;
  lastOpportunistic = t;
  try {
    await releaseExpiredReservations(new Date(t));
  } catch (err) {
    console.error('maybeReleaseExpiredReservations failed', err);
  }
}

// ---------------------------------------------------------------------------
// Payment success (verify-payment + webhook)
// ---------------------------------------------------------------------------

export type MarkPaidOutcome =
  | 'paid'
  | 'already_paid'
  | 'paid_after_release_restocked'
  | 'paid_after_release_needs_attention'
  | 'not_found';

/**
 * Marks an order paid, atomically and race-safe against reservation expiry. Run inside a transaction.
 *
 * Normal path: UPDATE ... WHERE paymentStatus='pending' AND stockReleasedAt IS NULL, which also
 * clears reservationExpiresAt. If that matches nothing:
 *  - already paid -> idempotent no-op.
 *  - stock was already released (order cancelled by expiry): the PAYMENT IS NEVER LOST. The order is
 *    marked paid and we try to take the stock again with guarded decrements:
 *      * success -> order goes to design_pending as normal, stockReleasedAt cleared;
 *      * stock short -> order is flagged for admin attention (status 'new', internalNotes + audit log,
 *        stock NOT reserved) so staff can fulfil, back-order or refund.
 */
export async function markOrderPaid(
  tx: Tx,
  where: { razorpayOrderId: string },
  payment: { razorpayPaymentId: string; razorpaySignature?: string; source: string },
): Promise<{ outcome: MarkPaidOutcome; orderId?: string; orderNumber?: string }> {
  const order = await tx.order.findUnique({
    where: { razorpayOrderId: where.razorpayOrderId },
    select: { id: true, orderNumber: true, paymentStatus: true, stockReleasedAt: true, couponCode: true, internalNotes: true },
  });
  if (!order) return { outcome: 'not_found' };
  if (order.paymentStatus === 'paid') return { outcome: 'already_paid', orderId: order.id, orderNumber: order.orderNumber };

  const sig = payment.razorpaySignature ? { razorpaySignature: payment.razorpaySignature } : {};
  const normal = await tx.order.updateMany({
    where: { id: order.id, paymentStatus: 'pending', stockReleasedAt: null },
    data: { paymentStatus: 'paid', status: 'design_pending', razorpayPaymentId: payment.razorpayPaymentId, reservationExpiresAt: null, ...sig },
  });
  if (normal.count === 1) {
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: 'design_pending', note: `Payment verified (${payment.source}), Razorpay Payment ID: ${payment.razorpayPaymentId}` },
    });
    return { outcome: 'paid', orderId: order.id, orderNumber: order.orderNumber };
  }

  // Lost the race with expiry (or payment previously failed). Re-read inside the tx.
  const cur = await tx.order.findUniqueOrThrow({
    where: { id: order.id },
    select: { paymentStatus: true, stockReleasedAt: true, items: { select: { productId: true, quantity: true, variantSelections: true } } },
  });
  if (cur.paymentStatus === 'paid') return { outcome: 'already_paid', orderId: order.id, orderNumber: order.orderNumber };

  // Claim the paid transition (paymentStatus still pending/failed) regardless of release state.
  const late = await tx.order.updateMany({
    where: { id: order.id, paymentStatus: { not: 'paid' } },
    data: { paymentStatus: 'paid', razorpayPaymentId: payment.razorpayPaymentId, reservationExpiresAt: null, ...sig },
  });
  if (late.count !== 1) return { outcome: 'already_paid', orderId: order.id, orderNumber: order.orderNumber };

  if (cur.stockReleasedAt === null) {
    // paymentStatus was 'failed' but stock is still held: treat like a normal payment.
    await tx.order.update({ where: { id: order.id }, data: { status: 'design_pending' } });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: 'design_pending', note: `Payment verified (${payment.source}), Razorpay Payment ID: ${payment.razorpayPaymentId}` },
    });
    return { outcome: 'paid', orderId: order.id, orderNumber: order.orderNumber };
  }

  const { deltas, variantProduct } = await buildDeltas(tx, cur.items);
  const reserved = await tryReserveStock(tx, deltas, variantProduct, `${order.orderNumber} (late payment)`);
  if (reserved) {
    await tx.order.update({ where: { id: order.id }, data: { status: 'design_pending', stockReleasedAt: null } });
    if (order.couponCode) {
      await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
    }
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: 'design_pending', note: `Payment received after reservation expiry (${payment.source}); stock re-reserved. Payment ID: ${payment.razorpayPaymentId}` },
    });
    return { outcome: 'paid_after_release_restocked', orderId: order.id, orderNumber: order.orderNumber };
  }

  const flag = `[${new Date().toISOString()}] ATTENTION: payment ${payment.razorpayPaymentId} received after the stock reservation expired and stock is no longer available. Fulfil when stock is back, or refund.`;
  await tx.order.update({
    where: { id: order.id },
    data: { status: 'new', internalNotes: order.internalNotes ? `${order.internalNotes}\n${flag}` : flag },
  });
  await tx.orderStatusHistory.create({
    data: { orderId: order.id, status: 'new', note: 'Payment received after reservation expiry and stock unavailable — needs admin attention (fulfil or refund)' },
  });
  await tx.auditLog.create({
    data: {
      adminUserEmail: 'system',
      action: 'LATE_PAYMENT_NEEDS_ATTENTION',
      entityType: 'Order',
      entityId: order.id,
      details: { orderNumber: order.orderNumber, razorpayPaymentId: payment.razorpayPaymentId, source: payment.source },
    },
  });
  return { outcome: 'paid_after_release_needs_attention', orderId: order.id, orderNumber: order.orderNumber };
}
