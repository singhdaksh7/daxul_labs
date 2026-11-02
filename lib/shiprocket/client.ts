/**
 * Minimal Shiprocket API v2 client (https://apiv2.shiprocket.in/v1/external).
 *
 * - Credentials come ONLY from env (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD) or constructor options.
 * - fetch is injectable so unit tests never touch the network.
 * - Token is cached in memory (~9 days; Shiprocket tokens last 10) and refreshed on a 401.
 * - Nothing here logs credentials, tokens or request bodies. Error messages are sanitised.
 */

export const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 15_000;

export type ShiprocketErrorKind = 'not_configured' | 'auth' | 'http' | 'timeout' | 'network' | 'bad_response';

export class ShiprocketError extends Error {
  readonly kind: ShiprocketErrorKind;
  readonly status?: number;
  constructor(kind: ShiprocketErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ShiprocketError';
    this.kind = kind;
    this.status = status;
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ShiprocketClientOptions {
  email: string;
  password: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  now?: () => number;
}

export interface ShiprocketCourierOption {
  courierId: number;
  courierName: string;
  rate: number;
  etd: string | null;
  estimatedDays: number | null;
  cod: boolean;
  recommended: boolean;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  sellingPrice: number;
}

export interface ShiprocketCreateOrderInput {
  orderNumber: string;
  orderDate: string; // YYYY-MM-DD HH:mm
  pickupLocation: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isCod: boolean;
  items: ShiprocketOrderItem[];
  subTotal: number;
  shippingCharges?: number;
  codCharges?: number;
  totalDiscount?: number;
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

export interface ShiprocketCreatedOrder {
  orderId: string;
  shipmentId: string;
  status: string | null;
}

export interface ShiprocketAwbResult {
  awb: string;
  courierName: string | null;
  courierId: number | null;
}

export interface ShiprocketTrackEvent {
  date: string | null;
  status: string;
  activity: string | null;
  location: string | null;
}

export interface ShiprocketTrackResult {
  awb: string;
  currentStatus: string | null;
  trackUrl: string | null;
  etd: string | null;
  events: ShiprocketTrackEvent[];
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Shiprocket requires a 10-digit Indian mobile. */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

export class ShiprocketClient {
  private readonly email: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly now: () => number;
  private token: { value: string; expiresAt: number } | null = null;
  private loginInFlight: Promise<string> | null = null;

  constructor(opts: ShiprocketClientOptions) {
    if (!opts.email || !opts.password) throw new ShiprocketError('not_configured', 'Shiprocket not configured');
    this.email = opts.email;
    this.password = opts.password;
    this.baseUrl = (opts.baseUrl ?? SHIPROCKET_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = opts.fetchImpl ?? ((i, init) => fetch(i, init));
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = opts.now ?? Date.now;
  }

  private async raw(path: string, init: RequestInit): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, signal: ctrl.signal });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw new ShiprocketError('timeout', 'Shiprocket request timed out');
      throw new ShiprocketError('network', 'Could not reach Shiprocket');
    } finally {
      clearTimeout(timer);
    }
  }

  private async login(): Promise<string> {
    if (this.loginInFlight) return this.loginInFlight;
    this.loginInFlight = (async () => {
      const res = await this.raw('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
      });
      if (!res.ok) {
        throw new ShiprocketError('auth', 'Shiprocket authentication failed', res.status);
      }
      const json = rec(await res.json().catch(() => null));
      const token = str(json.token);
      if (!token) throw new ShiprocketError('bad_response', 'Shiprocket login returned no token');
      this.token = { value: token, expiresAt: this.now() + TOKEN_TTL_MS };
      return token;
    })().finally(() => {
      this.loginInFlight = null;
    });
    return this.loginInFlight;
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > this.now()) return this.token.value;
    return this.login();
  }

  /** Logs in once to prove the email/password work. Throws ShiprocketError on failure. */
  async verifyCredentials(): Promise<void> {
    this.clearToken();
    await this.getToken();
  }

  clearToken(): void {
    this.token = null;
  }

  /** Authenticated JSON request. Retries exactly once after re-login on a 401. */
  async request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Record<string, unknown>> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.getToken();
      const res = await this.raw(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.status === 401 && attempt === 0) {
        this.clearToken();
        continue;
      }
      const json = rec(await res.json().catch(() => null));
      if (!res.ok) {
        if (res.status === 401) throw new ShiprocketError('auth', 'Shiprocket authentication failed', 401);
        const msg = str(json.message) ?? `Shiprocket request failed (${res.status})`;
        throw new ShiprocketError('http', msg.slice(0, 300), res.status);
      }
      return json;
    }
    throw new ShiprocketError('auth', 'Shiprocket authentication failed', 401);
  }

  /** Live courier options for a parcel. weightKg in kilograms. */
  async getServiceability(q: { pickupPincode: string; deliveryPincode: string; weightKg: number; cod: boolean }): Promise<ShiprocketCourierOption[]> {
    const qs = new URLSearchParams({
      pickup_postcode: q.pickupPincode,
      delivery_postcode: q.deliveryPincode,
      weight: String(Math.max(0.05, q.weightKg)),
      cod: q.cod ? '1' : '0',
    });
    const json = await this.request('GET', `/courier/serviceability?${qs.toString()}`);
    const data = rec(json.data);
    const list = Array.isArray(data.available_courier_companies) ? data.available_courier_companies : [];
    const recommended = num(data.recommended_courier_company_id);
    const out: ShiprocketCourierOption[] = [];
    for (const raw of list) {
      const c = rec(raw);
      const id = num(c.courier_company_id);
      const name = str(c.courier_name);
      const rate = num(c.rate) ?? num(c.freight_charge);
      if (id === null || !name || rate === null) continue;
      out.push({
        courierId: id,
        courierName: name,
        rate,
        etd: str(c.etd),
        estimatedDays: num(c.estimated_delivery_days),
        cod: num(c.cod) === 1 || c.cod === true,
        recommended: recommended === id,
      });
    }
    return out.sort((a, b) => a.rate - b.rate);
  }

  /** Builds the adhoc-order payload (exported separately for testing). */
  static buildOrderPayload(i: ShiprocketCreateOrderInput): Record<string, unknown> {
    return {
      order_id: i.orderNumber,
      order_date: i.orderDate,
      pickup_location: i.pickupLocation,
      billing_customer_name: i.customerName,
      billing_last_name: '',
      billing_address: i.street,
      billing_city: i.city,
      billing_pincode: i.pincode,
      billing_state: i.state,
      billing_country: i.country || 'India',
      billing_email: i.customerEmail,
      billing_phone: normalizePhone(i.customerPhone),
      shipping_is_billing: true,
      order_items: i.items.map((it) => ({
        name: it.name,
        sku: it.sku,
        units: it.units,
        selling_price: it.sellingPrice,
      })),
      payment_method: i.isCod ? 'COD' : 'Prepaid',
      sub_total: i.subTotal,
      shipping_charges: i.shippingCharges ?? 0,
      transaction_charges: i.codCharges ?? 0,
      total_discount: i.totalDiscount ?? 0,
      length: i.lengthCm,
      breadth: i.breadthCm,
      height: i.heightCm,
      weight: i.weightKg,
    };
  }

  async createOrder(i: ShiprocketCreateOrderInput): Promise<ShiprocketCreatedOrder> {
    const json = await this.request('POST', '/orders/create/adhoc', ShiprocketClient.buildOrderPayload(i));
    const orderId = str(json.order_id);
    const shipmentId = str(json.shipment_id);
    if (!orderId || !shipmentId) throw new ShiprocketError('bad_response', 'Shiprocket did not return order/shipment ids');
    return { orderId, shipmentId, status: str(json.status) };
  }

  async assignAwb(shipmentId: string, courierId?: number): Promise<ShiprocketAwbResult> {
    const body: Record<string, unknown> = { shipment_id: shipmentId };
    if (courierId !== undefined) body.courier_id = courierId;
    const json = await this.request('POST', '/courier/assign/awb', body);
    const data = rec(rec(json.response).data);
    const awb = str(data.awb_code) ?? str(rec(json.data).awb_code);
    if (!awb) {
      throw new ShiprocketError('http', (str(json.message) ?? 'Shiprocket did not assign an AWB').slice(0, 300));
    }
    return { awb, courierName: str(data.courier_name), courierId: num(data.courier_company_id) };
  }

  async generatePickup(shipmentId: string): Promise<{ scheduledDate: string | null; raw: Record<string, unknown> }> {
    const json = await this.request('POST', '/courier/generate/pickup', { shipment_id: [shipmentId] });
    const resp = rec(json.response);
    return { scheduledDate: str(resp.pickup_scheduled_date) ?? str(json.pickup_scheduled_date), raw: json };
  }

  async generateLabel(shipmentId: string): Promise<string> {
    const json = await this.request('POST', '/courier/generate/label', { shipment_id: [shipmentId] });
    const url = str(json.label_url);
    if (!url || !/^https:\/\//i.test(url)) throw new ShiprocketError('bad_response', 'Shiprocket did not return a label URL');
    return url;
  }

  async cancelOrder(orderId: string): Promise<void> {
    const ids = /^\d+$/.test(orderId) ? [Number(orderId)] : [orderId];
    await this.request('POST', '/orders/cancel', { ids });
  }

  async trackByAwb(awb: string): Promise<ShiprocketTrackResult> {
    const json = await this.request('GET', `/courier/track/awb/${encodeURIComponent(awb)}`);
    const td = rec(json.tracking_data);
    const activities = Array.isArray(td.shipment_track_activities) ? td.shipment_track_activities : [];
    const tracks = Array.isArray(td.shipment_track) ? td.shipment_track : [];
    const first = rec(tracks[0]);
    const events: ShiprocketTrackEvent[] = activities.map((a) => {
      const r = rec(a);
      return {
        date: str(r.date),
        status: str(r['sr-status-label']) ?? str(r.status) ?? 'UNKNOWN',
        activity: str(r.activity),
        location: str(r.location),
      };
    });
    return {
      awb,
      currentStatus: str(first.current_status) ?? str(td.shipment_status),
      trackUrl: str(td.track_url),
      etd: str(td.etd),
      events,
    };
  }
}

// ---------------------------------------------------------------------------
// Env configuration (no DB, no secrets logged)
// ---------------------------------------------------------------------------

export interface ShiprocketConfig {
  email: string;
  password: string;
  pickupLocation: string;
  pickupPincode: string;
  defaultWeightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

/** Values saved from the admin panel (loaded by lib/shiprocket/settings.ts). They win over env vars. */
export interface ShiprocketOverrides {
  email?: string;
  password?: string;
  pickupLocation?: string;
  pickupPincode?: string;
  webhookToken?: string;
  defaultWeightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  enabled?: boolean;
}

let overrides: ShiprocketOverrides = {};

export function setShiprocketOverrides(next: ShiprocketOverrides): void {
  overrides = next;
}

const envNum = (name: string, fallback: number): number => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const pos = (v: number | undefined, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);

export function isShiprocketConfigured(): boolean {
  if (overrides.enabled === false) return false;
  if (overrides.enabled === undefined && (process.env.SHIPROCKET_ENABLED === '0' || process.env.SHIPROCKET_ENABLED === 'false')) return false;
  return !!((overrides.email || process.env.SHIPROCKET_EMAIL) && (overrides.password || process.env.SHIPROCKET_PASSWORD));
}

export function getShiprocketWebhookToken(): string | null {
  return overrides.webhookToken || process.env.SHIPROCKET_WEBHOOK_TOKEN || null;
}

export function getShiprocketConfig(): ShiprocketConfig | null {
  if (!isShiprocketConfigured()) return null;
  return {
    email: (overrides.email || process.env.SHIPROCKET_EMAIL) as string,
    password: (overrides.password || process.env.SHIPROCKET_PASSWORD) as string,
    pickupLocation: overrides.pickupLocation || process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    pickupPincode: (overrides.pickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE || '').replace(/\D/g, '').slice(0, 6),
    defaultWeightGrams: pos(overrides.defaultWeightGrams, envNum('SHIPROCKET_DEFAULT_WEIGHT_GRAMS', 500)),
    lengthCm: pos(overrides.lengthCm, envNum('SHIPROCKET_DEFAULT_LENGTH_CM', 15)),
    breadthCm: pos(overrides.breadthCm, envNum('SHIPROCKET_DEFAULT_BREADTH_CM', 15)),
    heightCm: pos(overrides.heightCm, envNum('SHIPROCKET_DEFAULT_HEIGHT_CM', 10)),
  };
}

let singleton: ShiprocketClient | null = null;
let singletonKey = '';

/** Shared client (token cache survives across requests). null when env is not configured. */
export function getShiprocketClient(): ShiprocketClient | null {
  const cfg = getShiprocketConfig();
  if (!cfg) {
    singleton = null;
    singletonKey = '';
    return null;
  }
  const key = `${cfg.email}\u0000${cfg.password}`;
  if (!singleton || singletonKey !== key) {
    singleton = new ShiprocketClient({ email: cfg.email, password: cfg.password });
    singletonKey = key;
  }
  return singleton;
}
