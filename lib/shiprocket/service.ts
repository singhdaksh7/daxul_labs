/**
 * Shiprocket <-> DAXUL order integration. All DB work goes through `db` (defaults to prisma) and all HTTP
 * through a ShiprocketClient, so both are injectable in tests.
 */
import { prisma } from '@/lib/db';
import {
  ShiprocketClient,
  ShiprocketError,
  getShiprocketClient,
  getShiprocketConfig,
  type ShiprocketCourierOption,
  type ShiprocketTrackEvent,
} from './client';
import { ensureShiprocketSettings } from './settings';
import { mapShiprocketStatus, orderStepsForShipment, shouldAdvance, type ShipmentStatus } from './status';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export class ShipmentError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'ShipmentError';
  }
}

const PROVIDER = 'shiprocket';
const CLAIM_STALE_MS = 2 * 60 * 1000;

export function trackingUrlFor(awb: string): string {
  return `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
}

function requireClient(client?: ShiprocketClient | null): ShiprocketClient {
  const c = client ?? getShiprocketClient();
  if (!c) throw new ShipmentError('Shiprocket not configured', 503);
  return c;
}

/** Converts SDK errors into user-safe ShipmentErrors. */
function wrap(e: unknown): never {
  if (e instanceof ShipmentError) throw e;
  if (e instanceof ShiprocketError) {
    if (e.kind === 'not_configured') throw new ShipmentError('Shiprocket not configured', 503);
    if (e.kind === 'auth') throw new ShipmentError('Shiprocket authentication failed. Check the API user credentials.', 502);
    if (e.kind === 'timeout' || e.kind === 'network') throw new ShipmentError('Shiprocket is unreachable. Try again shortly.', 502);
    throw new ShipmentError(`Shiprocket: ${e.message}`, e.status && e.status < 500 ? 422 : 502);
  }
  throw e;
}

const meta = (row: { metadata?: unknown }): Record<string, any> =>
  row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, any>) : {};

export function isActiveShipment(row: { provider: string; status: string }): boolean {
  return row.provider === PROVIDER && row.status !== 'CANCELLED';
}

/** Only paid prepaid orders, or COD orders, that are not cancelled may be shipped. */
export function checkShippable(order: { status: string; paymentMethod: string; paymentStatus: string }): string | null {
  if (order.status === 'cancelled') return 'Cancelled orders cannot be shipped';
  if (order.status === 'delivered') return 'Order is already delivered';
  if (order.paymentMethod === 'cod') return null;
  if (order.paymentStatus !== 'paid') return 'Only paid (or COD) orders can be shipped';
  return null;
}

export async function findActiveShipment(db: Db, orderId: string) {
  const rows = await db.shipmentTracking.findMany({ where: { orderId, provider: PROVIDER }, orderBy: { createdAt: 'desc' } });
  return (rows as any[]).find((r) => r.status !== 'CANCELLED') ?? null;
}

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

export async function getOrderCourierOptions(
  orderId: string,
  opts: { db?: Db; client?: ShiprocketClient | null } = {},
): Promise<ShiprocketCourierOption[]> {
  const db = opts.db ?? prisma;
  await ensureShiprocketSettings();
  const cfg = getShiprocketConfig();
  if (!cfg) throw new ShipmentError('Shiprocket not configured', 503);
  if (!/^\d{6}$/.test(cfg.pickupPincode)) throw new ShipmentError('SHIPROCKET_PICKUP_PINCODE is not set', 503);
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ShipmentError('Order not found', 404);
  try {
    return await requireClient(opts.client).getServiceability({
      pickupPincode: cfg.pickupPincode,
      deliveryPincode: order.pincode,
      weightKg: cfg.defaultWeightGrams / 1000,
      cod: order.paymentMethod === 'cod',
    });
  } catch (e) {
    wrap(e);
  }
}

// ---------------------------------------------------------------------------
// Create shipment (idempotent per order)
// ---------------------------------------------------------------------------

export async function createShipmentForOrder(
  orderId: string,
  admin: { email: string },
  opts: { db?: Db; client?: ShiprocketClient | null; now?: () => Date } = {},
): Promise<{ shipment: any; created: boolean }> {
  const db = opts.db ?? prisma;
  const now = opts.now ?? (() => new Date());
  const client = requireClient(opts.client);
  await ensureShiprocketSettings();
  const cfg = getShiprocketConfig();
  if (!cfg) throw new ShipmentError('Shiprocket not configured', 503);

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new ShipmentError('Order not found', 404);
  const blocked = checkShippable(order);
  if (blocked) throw new ShipmentError(blocked, 400);

  // Claim: serialise per order and refuse/return when an active shipment already exists.
  const claim = await db.$transaction(async (tx: Db) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'shiprocket:' + orderId}))`;
    const existing = await findActiveShipment(tx, orderId);
    if (existing) {
      const m = meta(existing);
      if (m.state === 'creating' && now().getTime() - new Date(existing.createdAt).getTime() > CLAIM_STALE_MS) {
        await tx.shipmentTracking.delete({ where: { id: existing.id } });
      } else if (m.state === 'creating') {
        return { existing: null, inProgress: true as const, row: null };
      } else {
        return { existing, inProgress: false as const, row: null };
      }
    }
    const row = await tx.shipmentTracking.create({
      data: { orderId, provider: PROVIDER, status: 'MANIFEST_GENERATED', metadata: { state: 'creating' } },
    });
    return { existing: null, inProgress: false as const, row };
  });
  if (claim.inProgress) throw new ShipmentError('A shipment is already being created for this order', 409);
  if (claim.existing) return { shipment: claim.existing, created: false };
  const claimRow = claim.row;

  try {
    const lines = (order.items as any[]).map((it) => ({
      name: it.productName,
      sku: it.productSku || it.productId,
      units: it.quantity,
      sellingPrice: Number(it.unitPrice) + Number(it.customizationFee || 0),
    }));
    const subTotal = round2(lines.reduce((s, l) => s + l.sellingPrice * l.units, 0));
    const shippingCharges = Number(order.shippingFee || 0);
    const codCharges = Number(order.codFee || 0);
    const totalDiscount = round2(Math.max(0, subTotal + shippingCharges + codCharges - Number(order.totalAmount)));
    const created = await client.createOrder({
      orderNumber: order.orderNumber,
      orderDate: formatOrderDate(order.createdAt),
      pickupLocation: cfg.pickupLocation,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      street: order.street,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      country: order.country,
      isCod: order.paymentMethod === 'cod',
      items: lines,
      subTotal,
      shippingCharges,
      codCharges,
      totalDiscount,
      weightKg: cfg.defaultWeightGrams / 1000,
      lengthCm: cfg.lengthCm,
      breadthCm: cfg.breadthCm,
      heightCm: cfg.heightCm,
    });
    const shipment = await db.shipmentTracking.update({
      where: { id: claimRow.id },
      data: {
        shipmentId: created.shipmentId,
        metadata: { state: 'created', shiprocketOrderId: created.orderId, shiprocketStatus: created.status, events: [] },
      },
    });
    await db.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        adminEmail: admin.email,
        note: `Shiprocket shipment created (SR order ${created.orderId})`,
      },
    });
    return { shipment, created: true };
  } catch (e) {
    // Release the claim so the admin can retry; nothing was created remotely if we failed before createOrder returned.
    await db.shipmentTracking.delete({ where: { id: claimRow.id } }).catch(() => undefined);
    wrap(e);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function formatOrderDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const x = new Date(d);
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// AWB / pickup / label / cancel
// ---------------------------------------------------------------------------

async function requireActive(db: Db, orderId: string) {
  const s = await findActiveShipment(db, orderId);
  if (!s || !s.shipmentId) throw new ShipmentError('No Shiprocket shipment exists for this order. Create one first.', 404);
  return s;
}

export async function assignAwbForOrder(
  orderId: string,
  courierId: number | undefined,
  admin: { email: string },
  opts: { db?: Db; client?: ShiprocketClient | null } = {},
) {
  const db = opts.db ?? prisma;
  const client = requireClient(opts.client);
  const shipment = await requireActive(db, orderId);
  if (shipment.awbNumber) return { shipment, assigned: false };
  try {
    const awb = await client.assignAwb(shipment.shipmentId, courierId);
    const url = trackingUrlFor(awb.awb);
    const updated = await db.$transaction(async (tx: Db) => {
      const s = await tx.shipmentTracking.update({
        where: { id: shipment.id },
        data: {
          awbNumber: awb.awb,
          courierName: awb.courierName,
          trackingUrl: url,
          metadata: { ...meta(shipment), courierId: awb.courierId ?? courierId ?? null },
        },
      });
      const order = await tx.order.update({
        where: { id: orderId },
        data: { courierName: awb.courierName, trackingNumber: awb.awb, trackingUrl: url },
        select: { status: true },
      });
      await tx.orderStatusHistory.create({
        data: { orderId, status: order.status, adminEmail: admin.email, note: `AWB ${awb.awb} assigned (${awb.courierName ?? 'courier'})` },
      });
      return s;
    });
    return { shipment: updated, assigned: true };
  } catch (e) {
    wrap(e);
  }
}

export async function schedulePickupForOrder(
  orderId: string,
  admin: { email: string },
  opts: { db?: Db; client?: ShiprocketClient | null } = {},
) {
  const db = opts.db ?? prisma;
  const client = requireClient(opts.client);
  const shipment = await requireActive(db, orderId);
  if (!shipment.awbNumber) throw new ShipmentError('Assign an AWB before scheduling pickup', 400);
  try {
    const r = await client.generatePickup(shipment.shipmentId);
    const when = r.scheduledDate ? new Date(r.scheduledDate) : null;
    const updated = await db.shipmentTracking.update({
      where: { id: shipment.id },
      data: { pickupScheduledAt: when && !isNaN(when.getTime()) ? when : new Date() },
    });
    const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (order) {
      await db.orderStatusHistory.create({
        data: { orderId, status: order.status, adminEmail: admin.email, note: 'Shiprocket pickup scheduled' },
      });
    }
    return { shipment: updated };
  } catch (e) {
    wrap(e);
  }
}

export async function labelForOrder(orderId: string, opts: { db?: Db; client?: ShiprocketClient | null } = {}) {
  const db = opts.db ?? prisma;
  const client = requireClient(opts.client);
  const shipment = await requireActive(db, orderId);
  if (!shipment.awbNumber) throw new ShipmentError('Assign an AWB before generating a label', 400);
  try {
    const url = await client.generateLabel(shipment.shipmentId);
    await db.shipmentTracking.update({ where: { id: shipment.id }, data: { labelUrl: url } });
    return { labelUrl: url };
  } catch (e) {
    wrap(e);
  }
}

export async function cancelShipmentForOrder(
  orderId: string,
  admin: { email: string },
  opts: { db?: Db; client?: ShiprocketClient | null } = {},
) {
  const db = opts.db ?? prisma;
  const client = requireClient(opts.client);
  const shipment = await requireActive(db, orderId);
  const m = meta(shipment);
  if (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(shipment.status)) {
    throw new ShipmentError('Shipment is already in motion and cannot be cancelled here', 400);
  }
  if (!m.shiprocketOrderId) throw new ShipmentError('Shipment has no Shiprocket order id', 400);
  try {
    await client.cancelOrder(String(m.shiprocketOrderId));
    await db.$transaction(async (tx: Db) => {
      await tx.shipmentTracking.update({ where: { id: shipment.id }, data: { status: 'CANCELLED', metadata: { ...m, cancelledAt: new Date().toISOString() } } });
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true, trackingNumber: true } });
      if (order && shipment.awbNumber && order.trackingNumber === shipment.awbNumber) {
        await tx.order.update({ where: { id: orderId }, data: { courierName: null, trackingNumber: null, trackingUrl: null } });
      }
      if (order) {
        await tx.orderStatusHistory.create({
          data: { orderId, status: order.status, adminEmail: admin.email, note: 'Shiprocket shipment cancelled' },
        });
      }
    });
    return { cancelled: true };
  } catch (e) {
    wrap(e);
  }
}

// ---------------------------------------------------------------------------
// Tracking updates (webhook + live refresh share this)
// ---------------------------------------------------------------------------

export interface TrackingUpdate {
  /** Stable id for idempotency (ProcessedWebhook.id). */
  eventId: string;
  rawStatus: string;
  timestamp: string | null;
  activity?: string | null;
  location?: string | null;
  courierName?: string | null;
}

export type ApplyResult = 'applied' | 'duplicate' | 'unknown_awb' | 'ignored';

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { code?: string }).code === 'P2002';
}

/** Applies one tracking event to the shipment that owns `awb`. Idempotent on update.eventId. */
export async function applyTrackingUpdate(awb: string, update: TrackingUpdate, opts: { db?: Db } = {}): Promise<ApplyResult> {
  const db = opts.db ?? prisma;
  const shipment = await db.shipmentTracking.findFirst({ where: { awbNumber: awb, provider: PROVIDER }, orderBy: { createdAt: 'desc' } });
  if (!shipment) return 'unknown_awb';

  const mapped = mapShiprocketStatus(update.rawStatus);
  const when = update.timestamp && !isNaN(new Date(update.timestamp).getTime()) ? new Date(update.timestamp) : new Date();

  try {
    return await db.$transaction(async (tx: Db) => {
      const evId = update.eventId.slice(0, 190);
      if (await tx.processedWebhook.findUnique({ where: { id: evId } })) return 'duplicate' as ApplyResult;
      // A concurrent duplicate trips the primary key (P2002), aborts this tx and is mapped to 'duplicate' below.
      await tx.processedWebhook.create({ data: { id: evId, event: `shiprocket:${mapped ?? 'UNMAPPED'}` } });
      const fresh = await tx.shipmentTracking.findUnique({ where: { id: shipment.id } });
      const m = meta(fresh);
      const events: any[] = Array.isArray(m.events) ? m.events : [];
      events.push({
        status: mapped ?? update.rawStatus,
        raw: String(update.rawStatus).slice(0, 120),
        at: when.toISOString(),
        activity: update.activity ? String(update.activity).slice(0, 200) : null,
        location: update.location ? String(update.location).slice(0, 120) : null,
      });
      const data: Record<string, any> = { metadata: { ...m, events: events.slice(-100) } };
      let advanced: ShipmentStatus | null = null;
      if (mapped && shouldAdvance(fresh.status, mapped)) {
        advanced = mapped;
        data.status = mapped;
        if (mapped === 'PICKED_UP' && !fresh.pickedUpAt) data.pickedUpAt = when;
        if (mapped === 'DELIVERED') data.deliveredAt = when;
        if (mapped === 'RTO_INITIATED' || mapped === 'RTO_DELIVERED') data.rtoReason = update.activity ? String(update.activity).slice(0, 200) : fresh.rtoReason;
      }
      if (update.courierName && !fresh.courierName) data.courierName = update.courierName;
      await tx.shipmentTracking.update({ where: { id: shipment.id }, data });

      if (advanced) {
        const order = await tx.order.findUnique({ where: { id: shipment.orderId }, select: { id: true, status: true, courierName: true, trackingNumber: true } });
        if (order) {
          let current: string = order.status;
          for (const step of orderStepsForShipment(order.status, advanced)) {
            // Entering "shipped" requires courier + tracking (same rule as the admin move action).
            if (step === 'shipped' && !((order.courierName || data.courierName || fresh.courierName) && (order.trackingNumber || awb))) break;
            const r = await tx.order.updateMany({ where: { id: order.id, status: current }, data: { status: step } });
            if (r.count !== 1) break;
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, status: step, adminEmail: 'shiprocket', note: `Courier update: ${update.rawStatus}`.slice(0, 200) },
            });
            current = step;
          }
        }
      }
      return (advanced ? 'applied' : 'ignored') as ApplyResult;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return 'duplicate';
    throw e;
  }
}

/** Pulls live tracking from Shiprocket and replays unseen events through applyTrackingUpdate. */
export async function refreshTrackingForAwb(awb: string, opts: { db?: Db; client?: ShiprocketClient | null } = {}) {
  const client = requireClient(opts.client);
  let res;
  try {
    res = await client.trackByAwb(awb);
  } catch (e) {
    wrap(e);
  }
  const ordered: ShiprocketTrackEvent[] = [...res.events].reverse(); // Shiprocket lists newest first
  for (const ev of ordered) {
    await applyTrackingUpdate(
      awb,
      {
        eventId: `sr:${awb}:${ev.status}:${ev.date ?? ''}`,
        rawStatus: ev.status,
        timestamp: ev.date,
        activity: ev.activity,
        location: ev.location,
      },
      { db: opts.db },
    );
  }
  return res;
}
