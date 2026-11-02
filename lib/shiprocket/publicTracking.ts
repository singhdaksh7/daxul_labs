import { prisma } from '@/lib/db';
import { isShiprocketConfigured } from './client';
import { ensureShiprocketSettings } from './settings';
import { refreshTrackingForAwb } from './service';

const REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;
const TERMINAL = new Set(['DELIVERED', 'RTO_DELIVERED', 'CANCELLED']);

export interface PublicShipmentView {
  status: string;
  awb: string;
  courierName: string | null;
  events: { status: string; at: string; activity: string | null; location: string | null }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function view(row: any): PublicShipmentView | null {
  if (!row?.awbNumber) return null;
  const m = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, any>) : {};
  const events = Array.isArray(m.events) ? m.events : [];
  return {
    status: row.status,
    awb: row.awbNumber,
    courierName: row.courierName ?? null,
    events: events
      .slice(-30)
      .reverse()
      .map((e: any) => ({
        status: String(e.status ?? ''),
        at: String(e.at ?? ''),
        activity: typeof e.activity === 'string' ? e.activity : null,
        location: typeof e.location === 'string' ? e.location : null,
      })),
  };
}

/** Customer-safe Shiprocket shipment view for an order (only the order's own, verified shipment). */
export async function getPublicShipment(orderNumber: string, opts: { refresh?: boolean; db?: any } = {}): Promise<PublicShipmentView | null> {
  const db = opts.db ?? prisma;
  const find = () =>
    db.shipmentTracking.findFirst({
      where: { provider: 'shiprocket', awbNumber: { not: null }, status: { not: 'CANCELLED' }, order: { orderNumber } },
      orderBy: { createdAt: 'desc' },
    });
  await ensureShiprocketSettings();
  let row = await find();
  if (!row) return null;
  if (opts.refresh && isShiprocketConfigured() && !TERMINAL.has(row.status) && Date.now() - new Date(row.updatedAt).getTime() > REFRESH_MIN_INTERVAL_MS) {
    try {
      await refreshTrackingForAwb(row.awbNumber, { db });
      row = (await find()) ?? row;
    } catch {
      /* keep stored data */
    }
  }
  return view(row);
}
