import { prisma } from '@/lib/db';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/integrationSecrets';
import { setShiprocketOverrides, type ShiprocketOverrides } from './client';

/**
 * Admin-editable Shiprocket settings, stored in IntegrationSetting. Saved values override env vars
 * (env stays as a fallback). Secrets are AES-256-GCM encrypted and never returned in full.
 */
export const SHIPROCKET_FIELDS = [
  { key: 'email', secret: false },
  { key: 'password', secret: true },
  { key: 'pickupLocation', secret: false },
  { key: 'pickupPincode', secret: false },
  { key: 'webhookToken', secret: true },
  { key: 'defaultWeightGrams', secret: false },
  { key: 'lengthCm', secret: false },
  { key: 'breadthCm', secret: false },
  { key: 'heightCm', secret: false },
  { key: 'enabled', secret: false },
] as const;

export type ShiprocketFieldKey = (typeof SHIPROCKET_FIELDS)[number]['key'];
const PREFIX = 'shiprocket.';
const TTL_MS = 15_000;
let loadedAt = 0;

type Row = { key: string; value: string | null; valueEncrypted: string | null };

export function rowsToOverrides(rows: Row[]): ShiprocketOverrides {
  const get = (k: ShiprocketFieldKey): string | null => {
    const row = rows.find((r) => r.key === PREFIX + k);
    if (!row) return null;
    const def = SHIPROCKET_FIELDS.find((f) => f.key === k)!;
    const v = def.secret ? decryptSecret(row.valueEncrypted) : row.value;
    return v && v.trim() ? v.trim() : null;
  };
  const num = (k: ShiprocketFieldKey) => {
    const n = Number(get(k));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const enabled = get('enabled');
  return {
    email: get('email') ?? undefined,
    password: get('password') ?? undefined,
    pickupLocation: get('pickupLocation') ?? undefined,
    pickupPincode: get('pickupPincode') ?? undefined,
    webhookToken: get('webhookToken') ?? undefined,
    defaultWeightGrams: num('defaultWeightGrams'),
    lengthCm: num('lengthCm'),
    breadthCm: num('breadthCm'),
    heightCm: num('heightCm'),
    enabled: enabled === null ? undefined : enabled !== 'false' && enabled !== '0',
  };
}

/** Loads saved settings into the in-process config (cached ~15s). Never throws: env config still works. */
export async function ensureShiprocketSettings(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < TTL_MS) return;
  try {
    const rows = await prisma.integrationSetting.findMany({ where: { key: { startsWith: PREFIX } } });
    setShiprocketOverrides(rowsToOverrides(rows));
    loadedAt = Date.now();
  } catch (err) {
    console.error('Shiprocket settings load failed (falling back to env):', err instanceof Error ? err.message : 'unknown');
  }
}

/** What the admin screen sees: plain values for normal fields, masked tails for secrets. */
export async function getShiprocketSettingsView() {
  await ensureShiprocketSettings(true);
  const rows = await prisma.integrationSetting.findMany({ where: { key: { startsWith: PREFIX } } });
  const o = rowsToOverrides(rows);
  const saved = (k: ShiprocketFieldKey) => rows.some((r) => r.key === PREFIX + k && (r.value || r.valueEncrypted));
  return {
    values: {
      email: o.email ?? '',
      pickupLocation: o.pickupLocation ?? '',
      pickupPincode: o.pickupPincode ?? '',
      defaultWeightGrams: o.defaultWeightGrams ?? null,
      lengthCm: o.lengthCm ?? null,
      breadthCm: o.breadthCm ?? null,
      heightCm: o.heightCm ?? null,
      enabled: o.enabled ?? true,
    },
    secrets: {
      password: { saved: saved('password'), masked: maskSecret(o.password) },
      webhookToken: { saved: saved('webhookToken'), masked: maskSecret(o.webhookToken) },
    },
    envFallback: {
      email: !!process.env.SHIPROCKET_EMAIL,
      password: !!process.env.SHIPROCKET_PASSWORD,
      webhookToken: !!process.env.SHIPROCKET_WEBHOOK_TOKEN,
    },
  };
}

export type ShiprocketSettingsInput = Partial<Record<ShiprocketFieldKey, string | number | boolean | null>>;

/**
 * Saves the provided fields. undefined = leave unchanged. null or '' = clear (fall back to env).
 * Secret fields left blank in the form are sent as undefined so a saved secret is never wiped by accident.
 */
export async function saveShiprocketSettings(input: ShiprocketSettingsInput, updatedBy: string): Promise<void> {
  for (const f of SHIPROCKET_FIELDS) {
    const v = input[f.key];
    if (v === undefined) continue;
    const key = PREFIX + f.key;
    const text = v === null ? '' : String(v).trim();
    if (!text) {
      await prisma.integrationSetting.deleteMany({ where: { key } });
      continue;
    }
    const data = f.secret
      ? { value: null, valueEncrypted: encryptSecret(text), isSecret: true, updatedBy }
      : { value: text, valueEncrypted: null, isSecret: false, updatedBy };
    await prisma.integrationSetting.upsert({ where: { key }, create: { key, ...data }, update: data });
  }
  loadedAt = 0;
  await ensureShiprocketSettings(true);
}
