import { createHash, timingSafeEqual } from 'crypto';
import { applyTrackingUpdate, type ApplyResult } from './service';

/** Constant-time token check. Always false when the expected token is unset/empty. */
export function verifyWebhookToken(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected || !provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

const s = (v: unknown, max = 200): string | null => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) || null : null);

/**
 * The payload is used ONLY to find the shipment by AWB and to read the courier's status text/timestamp.
 * It never creates records, never selects an order, and never overwrites money/address fields.
 */
export async function handleShiprocketWebhook(payload: unknown, opts: { db?: unknown } = {}): Promise<ApplyResult | 'invalid'> {
  if (!payload || typeof payload !== 'object') return 'invalid';
  const p = payload as Record<string, unknown>;
  const awb = s(p.awb, 64);
  const status = s(p.current_status) ?? s(p.shipment_status);
  if (!awb || !status) return 'invalid';
  const ts = s(p.current_timestamp) ?? s(p.scan_date_time);
  const statusId = s(p.current_status_id) ?? status;
  const scans = Array.isArray(p.scans) ? (p.scans as Record<string, unknown>[]) : [];
  const last = scans.length ? scans[scans.length - 1] : undefined;
  return applyTrackingUpdate(
    awb,
    {
      eventId: `sr:${awb}:${statusId}:${ts ?? ''}`,
      rawStatus: status,
      timestamp: ts,
      activity: s(last?.activity) ?? s(p.status_description),
      location: s(last?.location),
      courierName: s(p.courier_name, 100),
    },
    { db: opts.db as never },
  );
}
