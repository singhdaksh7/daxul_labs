import { getShiprocketClient, getShiprocketConfig } from './client';
import type { ShiprocketClient } from './client';
import { ensureShiprocketSettings } from './settings';

export interface PublicEta {
  live: boolean;
  /** Fastest estimated delivery in days across serviceable couriers (null when not live). */
  minDays: number | null;
  maxDays: number | null;
  serviceable: boolean | null;
  codAvailable: boolean | null;
}

const NOT_LIVE: PublicEta = { live: false, minDays: null, maxDays: null, serviceable: null, codAvailable: null };

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: PublicEta }>();

export function clearPublicEtaCache() {
  cache.clear();
}

/**
 * Customer-facing ETA only. Courier rates are our cost and are NOT exposed; the charged shipping fee stays
 * the server-side flat fee from computeCheckout. Never throws: any Shiprocket failure yields {live:false}.
 */
export async function getPublicEta(
  pincode: string,
  units: number,
  opts: { client?: ShiprocketClient | null; now?: () => number } = {},
): Promise<PublicEta> {
  await ensureShiprocketSettings();
  const cfg = getShiprocketConfig();
  if (!cfg || !/^\d{6}$/.test(cfg.pickupPincode) || !/^\d{6}$/.test(pincode)) return NOT_LIVE;
  const client = opts.client === undefined ? getShiprocketClient() : opts.client;
  if (!client) return NOT_LIVE;
  const now = (opts.now ?? Date.now)();
  const weightG = cfg.defaultWeightGrams * Math.min(Math.max(1, Math.floor(units) || 1), 20);
  const key = `${pincode}:${Math.ceil(weightG / 500)}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  try {
    const [prepaid, cod] = await Promise.all([
      client.getServiceability({ pickupPincode: cfg.pickupPincode, deliveryPincode: pincode, weightKg: weightG / 1000, cod: false }),
      client.getServiceability({ pickupPincode: cfg.pickupPincode, deliveryPincode: pincode, weightKg: weightG / 1000, cod: true }).catch(() => []),
    ]);
    const days = prepaid.map((c) => c.estimatedDays).filter((d): d is number => typeof d === 'number' && d > 0);
    const value: PublicEta = {
      live: true,
      serviceable: prepaid.length > 0,
      minDays: days.length ? Math.min(...days) : null,
      maxDays: days.length ? Math.max(...days) : null,
      codAvailable: cod.length > 0,
    };
    if (cache.size > 2000) cache.clear();
    cache.set(key, { at: now, value });
    return value;
  } catch {
    return NOT_LIVE;
  }
}
