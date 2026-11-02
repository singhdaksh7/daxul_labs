import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {}, default: {} }));

import { ShiprocketClient, ShiprocketError, getShiprocketClient, isShiprocketConfigured } from '@/lib/shiprocket/client';
import { mapShiprocketStatus, orderStepsForShipment, shouldAdvance } from '@/lib/shiprocket/status';
import {
  applyTrackingUpdate,
  assignAwbForOrder,
  cancelShipmentForOrder,
  checkShippable,
  createShipmentForOrder,
  ShipmentError,
} from '@/lib/shiprocket/service';
import { handleShiprocketWebhook, verifyWebhookToken } from '@/lib/shiprocket/webhook';
import { clearPublicEtaCache, getPublicEta } from '@/lib/shiprocket/publicRates';

// ---------------------------------------------------------------------------
// Fake fetch
// ---------------------------------------------------------------------------
type Call = { path: string; method: string; body: any; auth: string | null };
function makeFetch(handlers: Record<string, (call: Call) => { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('https://apiv2.shiprocket.in/v1/external', '');
    const key = path.split('?')[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Call = { path, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined, auth: headers.Authorization ?? null };
    calls.push(call);
    const h = handlers[key] ?? Object.entries(handlers).find(([k]) => key.startsWith(k))?.[1];
    if (!h) return new Response(JSON.stringify({ message: 'no handler' }), { status: 404 });
    const r = h(call);
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
  });
  return { fn: fn as unknown as (u: string, i?: RequestInit) => Promise<Response>, calls };
}

const baseOrderInput = {
  orderNumber: 'DXL-1001',
  orderDate: '2026-11-02 10:00',
  pickupLocation: 'Primary',
  customerName: 'Asha Rao',
  customerEmail: 'asha@example.com',
  customerPhone: '+91 98765-43210',
  street: '12 MG Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  items: [{ name: 'Lamp', sku: 'LMP-1', units: 2, sellingPrice: 500 }],
  subTotal: 1000,
  weightKg: 0.5,
  lengthCm: 15,
  breadthCm: 15,
  heightCm: 10,
};

// ---------------------------------------------------------------------------
// Client: auth
// ---------------------------------------------------------------------------
describe('ShiprocketClient auth', () => {
  it('logs in once and reuses the cached token', async () => {
    const { fn, calls } = makeFetch({
      '/auth/login': () => ({ json: { token: 'tok-1' } }),
      '/courier/track/awb': () => ({ json: { tracking_data: {} } }),
    });
    const c = new ShiprocketClient({ email: 'a@b.c', password: 'pw', fetchImpl: fn });
    await c.trackByAwb('1');
    await c.trackByAwb('2');
    expect(calls.filter((x) => x.path === '/auth/login')).toHaveLength(1);
    expect(calls.filter((x) => x.path.startsWith('/courier/track')).every((x) => x.auth === 'Bearer tok-1')).toBe(true);
  });

  it('re-logs in after the ~9 day token TTL', async () => {
    let t = 1_000_000;
    let n = 0;
    const { fn, calls } = makeFetch({
      '/auth/login': () => ({ json: { token: `tok-${++n}` } }),
      '/courier/track/awb': () => ({ json: { tracking_data: {} } }),
    });
    const c = new ShiprocketClient({ email: 'a@b.c', password: 'pw', fetchImpl: fn, now: () => t });
    await c.trackByAwb('1');
    t += 8 * 86400_000;
    await c.trackByAwb('1');
    expect(calls.filter((x) => x.path === '/auth/login')).toHaveLength(1);
    t += 2 * 86400_000;
    await c.trackByAwb('1');
    expect(calls.filter((x) => x.path === '/auth/login')).toHaveLength(2);
  });

  it('refreshes the token and retries once on 401', async () => {
    let logins = 0;
    let trackCalls = 0;
    const { fn, calls } = makeFetch({
      '/auth/login': () => ({ json: { token: `tok-${++logins}` } }),
      '/courier/track/awb': () => (++trackCalls === 1 ? { status: 401, json: { message: 'expired' } } : { json: { tracking_data: { shipment_status: 'x' } } }),
    });
    const c = new ShiprocketClient({ email: 'a@b.c', password: 'pw', fetchImpl: fn });
    await c.trackByAwb('1');
    expect(logins).toBe(2);
    expect(calls[calls.length - 1].auth).toBe('Bearer tok-2');
  });

  it('throws a typed auth error on bad credentials without leaking them', async () => {
    const { fn } = makeFetch({ '/auth/login': () => ({ status: 403, json: { message: 'bad' } }) });
    const c = new ShiprocketClient({ email: 'secret@x.y', password: 'hunter2', fetchImpl: fn });
    const err = await c.trackByAwb('1').catch((e) => e);
    expect(err).toBeInstanceOf(ShiprocketError);
    expect(err.kind).toBe('auth');
    expect(JSON.stringify(err.message)).not.toContain('hunter2');
  });

  it('maps network failures and timeouts to typed errors', async () => {
    const c1 = new ShiprocketClient({ email: 'a', password: 'b', fetchImpl: async () => { throw new TypeError('boom'); } });
    expect((await c1.trackByAwb('1').catch((e) => e)).kind).toBe('network');
    const c2 = new ShiprocketClient({
      email: 'a',
      password: 'b',
      timeoutMs: 5,
      fetchImpl: (_u, init) => new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' })))),
    });
    expect((await c2.trackByAwb('1').catch((e) => e)).kind).toBe('timeout');
  });
});

// ---------------------------------------------------------------------------
// Client: payload mapping
// ---------------------------------------------------------------------------
describe('order payload mapping', () => {
  it('maps a prepaid order', () => {
    const p = ShiprocketClient.buildOrderPayload({ ...baseOrderInput, isCod: false }) as any;
    expect(p.payment_method).toBe('Prepaid');
    expect(p.order_id).toBe('DXL-1001');
    expect(p.billing_phone).toBe('9876543210');
    expect(p.billing_pincode).toBe('411001');
    expect(p.order_items).toEqual([{ name: 'Lamp', sku: 'LMP-1', units: 2, selling_price: 500 }]);
    expect(p.sub_total).toBe(1000);
    expect(p.weight).toBe(0.5);
    expect(p.pickup_location).toBe('Primary');
    expect(p.shipping_is_billing).toBe(true);
  });
  it('maps a COD order', () => {
    const p = ShiprocketClient.buildOrderPayload({ ...baseOrderInput, isCod: true, codCharges: 50, shippingCharges: 99 }) as any;
    expect(p.payment_method).toBe('COD');
    expect(p.transaction_charges).toBe(50);
    expect(p.shipping_charges).toBe(99);
  });
  it('parses serviceability, sorted by rate, flags the recommended courier', async () => {
    const { fn, calls } = makeFetch({
      '/auth/login': () => ({ json: { token: 't' } }),
      '/courier/serviceability': () => ({
        json: {
          data: {
            recommended_courier_company_id: 2,
            available_courier_companies: [
              { courier_company_id: 1, courier_name: 'A', rate: 120, etd: 'Nov 8', estimated_delivery_days: 4, cod: 1 },
              { courier_company_id: 2, courier_name: 'B', rate: 90, etd: 'Nov 9', estimated_delivery_days: '5', cod: 0 },
              { courier_company_id: 3, courier_name: 'broken' },
            ],
          },
        },
      }),
    });
    const c = new ShiprocketClient({ email: 'a', password: 'b', fetchImpl: fn });
    const out = await c.getServiceability({ pickupPincode: '560001', deliveryPincode: '411001', weightKg: 0.5, cod: true });
    expect(out.map((o) => o.courierName)).toEqual(['B', 'A']);
    expect(out[0]).toMatchObject({ recommended: true, estimatedDays: 5, cod: false });
    const q = calls.find((x) => x.path.startsWith('/courier/serviceability'))!.path;
    expect(q).toContain('pickup_postcode=560001');
    expect(q).toContain('delivery_postcode=411001');
    expect(q).toContain('cod=1');
  });
});

// ---------------------------------------------------------------------------
// Graceful degradation
// ---------------------------------------------------------------------------
describe('unconfigured', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.SHIPROCKET_EMAIL;
    delete process.env.SHIPROCKET_PASSWORD;
    clearPublicEtaCache();
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('reports not configured and never builds a client', () => {
    expect(isShiprocketConfigured()).toBe(false);
    expect(getShiprocketClient()).toBeNull();
    expect(() => new ShiprocketClient({ email: '', password: '' })).toThrow('Shiprocket not configured');
  });
  it('public ETA is simply not live', async () => {
    expect(await getPublicEta('411001', 1)).toMatchObject({ live: false, minDays: null });
  });
  it('createShipment fails with a clear 503', async () => {
    const err = await createShipmentForOrder('o1', { email: 'a@b.c' }, { db: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ShipmentError);
    expect(err.message).toBe('Shiprocket not configured');
    expect(err.httpStatus).toBe(503);
  });
});

describe('public ETA when configured', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.SHIPROCKET_EMAIL = 'test@example.invalid';
    process.env.SHIPROCKET_PASSWORD = 'not-a-real-password';
    process.env.SHIPROCKET_PICKUP_PINCODE = '560001';
    clearPublicEtaCache();
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('returns min/max days, caches, and hides rates', async () => {
    const { fn, calls } = makeFetch({
      '/auth/login': () => ({ json: { token: 't' } }),
      '/courier/serviceability': () => ({
        json: { data: { available_courier_companies: [{ courier_company_id: 1, courier_name: 'A', rate: 100, estimated_delivery_days: 3, cod: 1 }, { courier_company_id: 2, courier_name: 'B', rate: 80, estimated_delivery_days: 6, cod: 1 }] } },
      }),
    });
    const client = new ShiprocketClient({ email: 'a', password: 'b', fetchImpl: fn });
    const eta = await getPublicEta('411001', 1, { client });
    expect(eta).toEqual({ live: true, serviceable: true, minDays: 3, maxDays: 6, codAvailable: true });
    expect(JSON.stringify(eta)).not.toContain('rate');
    const n = calls.length;
    await getPublicEta('411001', 1, { client });
    expect(calls.length).toBe(n); // cached
  });

  it('falls back to not-live when Shiprocket errors', async () => {
    const client = new ShiprocketClient({ email: 'a', password: 'b', fetchImpl: async () => { throw new TypeError('down'); } });
    expect((await getPublicEta('411001', 1, { client })).live).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------
function makeDb(order: Record<string, any>) {
  const state = {
    order: { id: 'o1', orderNumber: 'DXL-1001', createdAt: new Date('2026-11-02T10:00:00'), customerName: 'Asha', customerEmail: 'a@x.y', customerPhone: '9876543210', street: 's', city: 'Pune', state: 'MH', pincode: '411001', country: 'India', totalAmount: 1149, shippingFee: 99, codFee: 50, paymentMethod: 'prepaid', paymentStatus: 'paid', status: 'packed', courierName: null as string | null, trackingNumber: null as string | null, trackingUrl: null as string | null, items: [{ productName: 'Lamp', productSku: 'LMP-1', productId: 'p1', quantity: 2, unitPrice: 500, customizationFee: 0 }], ...order },
    shipments: [] as any[],
    history: [] as any[],
    webhooks: new Set<string>(),
    seq: 0,
  };
  const match = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([k, v]) => {
      if (v && typeof v === 'object' && 'not' in (v as any)) return row[k] !== (v as any).not && !(((v as any).not === null) && row[k] == null);
      return row[k] === v;
    });
  const db: any = {
    $queryRaw: async () => [],
    $transaction: async (fn: any) => fn(db),
    order: {
      findUnique: async ({ where }: any) => (where.id === state.order.id ? state.order : null),
      update: async ({ data }: any) => Object.assign(state.order, data),
      updateMany: async ({ where, data }: any) => {
        if (state.order.id === where.id && (!where.status || state.order.status === where.status)) {
          Object.assign(state.order, data);
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
    shipmentTracking: {
      findMany: async ({ where }: any) => state.shipments.filter((s) => match(s, where)).sort((a, b) => b.seq - a.seq),
      findFirst: async ({ where }: any) => state.shipments.filter((s) => match(s, where)).sort((a, b) => b.seq - a.seq)[0] ?? null,
      findUnique: async ({ where }: any) => state.shipments.find((s) => s.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `s${++state.seq}`, seq: state.seq, createdAt: new Date(), updatedAt: new Date(), awbNumber: null, courierName: null, shipmentId: null, labelUrl: null, trackingUrl: null, pickupScheduledAt: null, pickedUpAt: null, deliveredAt: null, rtoReason: null, ...data };
        state.shipments.push(row);
        return row;
      },
      update: async ({ where, data }: any) => Object.assign(state.shipments.find((s) => s.id === where.id)!, data),
      delete: async ({ where }: any) => {
        state.shipments = state.shipments.filter((s) => s.id !== where.id);
      },
    },
    orderStatusHistory: { create: async ({ data }: any) => state.history.push(data) },
    processedWebhook: {
      findUnique: async ({ where }: any) => (state.webhooks.has(where.id) ? { id: where.id } : null),
      create: async ({ data }: any) => {
        if (state.webhooks.has(data.id)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        state.webhooks.add(data.id);
      },
    },
  };
  return { db, state };
}

function srClient(extra: Record<string, (c: Call) => { status?: number; json: unknown }> = {}) {
  const f = makeFetch({
    '/auth/login': () => ({ json: { token: 't' } }),
    '/orders/create/adhoc': () => ({ json: { order_id: 777, shipment_id: 888, status: 'NEW' } }),
    '/courier/assign/awb': () => ({ json: { response: { data: { awb_code: 'AWB123', courier_name: 'Delhivery', courier_company_id: 5 } } } }),
    '/orders/cancel': () => ({ json: { message: 'ok' } }),
    ...extra,
  });
  return { client: new ShiprocketClient({ email: 'a', password: 'b', fetchImpl: f.fn }), ...f };
}

describe('shipment creation', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.SHIPROCKET_EMAIL = 'test@example.invalid';
    process.env.SHIPROCKET_PASSWORD = 'not-a-real-password';
    process.env.SHIPROCKET_PICKUP_LOCATION = 'Workshop';
  });
  afterEach(() => {
    process.env = { ...saved };
  });
  const admin = { email: 'admin@x.y' };

  it('checkShippable: paid prepaid ok, unpaid prepaid blocked, COD ok, cancelled blocked', () => {
    expect(checkShippable({ status: 'packed', paymentMethod: 'prepaid', paymentStatus: 'paid' })).toBeNull();
    expect(checkShippable({ status: 'packed', paymentMethod: 'prepaid', paymentStatus: 'pending' })).toMatch(/paid/);
    expect(checkShippable({ status: 'packed', paymentMethod: 'cod', paymentStatus: 'pending' })).toBeNull();
    expect(checkShippable({ status: 'cancelled', paymentMethod: 'cod', paymentStatus: 'pending' })).toMatch(/Cancelled/);
  });

  it('creates once, sends mapped payload, and is idempotent on repeat (no duplicate remote order)', async () => {
    const { db, state } = makeDb({});
    const { client, calls } = srClient();
    const first = await createShipmentForOrder('o1', admin, { db, client });
    expect(first.created).toBe(true);
    expect(first.shipment.shipmentId).toBe('888');
    const second = await createShipmentForOrder('o1', admin, { db, client });
    expect(second.created).toBe(false);
    expect(second.shipment.id).toBe(first.shipment.id);
    expect(calls.filter((c) => c.path === '/orders/create/adhoc')).toHaveLength(1);
    expect(state.shipments).toHaveLength(1);
    const body = calls.find((c) => c.path === '/orders/create/adhoc')!.body;
    expect(body.payment_method).toBe('Prepaid');
    expect(body.pickup_location).toBe('Workshop');
    expect(body.sub_total).toBe(1000);
    expect(body.shipping_charges).toBe(99);
    expect(body.transaction_charges).toBe(50);
    expect(body.total_discount).toBe(0); // 1000 + 99 + 50 = 1149 = total
    expect(state.history.some((h) => /shipment created/.test(h.note))).toBe(true);
  });

  it('sends COD payment method and reconciles discounts to the order total', async () => {
    const { db } = makeDb({ paymentMethod: 'cod', paymentStatus: 'pending', totalAmount: 1000 });
    const { client, calls } = srClient();
    await createShipmentForOrder('o1', admin, { db, client });
    const body = calls.find((c) => c.path === '/orders/create/adhoc')!.body;
    expect(body.payment_method).toBe('COD');
    expect(body.total_discount).toBe(149);
  });

  it('refuses unpaid prepaid orders and makes no remote call', async () => {
    const { db } = makeDb({ paymentStatus: 'pending' });
    const { client, calls } = srClient();
    await expect(createShipmentForOrder('o1', admin, { db, client })).rejects.toThrow(/paid/);
    expect(calls).toHaveLength(0);
  });

  it('releases the claim when Shiprocket fails so the admin can retry', async () => {
    const { db, state } = makeDb({});
    const { client } = srClient({ '/orders/create/adhoc': () => ({ status: 422, json: { message: 'Wrong pickup location' } }) });
    await expect(createShipmentForOrder('o1', admin, { db, client })).rejects.toThrow(/Wrong pickup location/);
    expect(state.shipments).toHaveLength(0);
  });

  it('rejects a concurrent create while another is in progress', async () => {
    const { db, state } = makeDb({});
    state.shipments.push({ id: 'sx', seq: 1, orderId: 'o1', provider: 'shiprocket', status: 'MANIFEST_GENERATED', createdAt: new Date(), metadata: { state: 'creating' } });
    const { client, calls } = srClient();
    await expect(createShipmentForOrder('o1', admin, { db, client })).rejects.toThrow(/already being created/);
    expect(calls).toHaveLength(0);
  });

  it('assigns AWB onto both ShipmentTracking and Order, then allows cancel -> re-create', async () => {
    const { db, state } = makeDb({});
    const { client } = srClient();
    await createShipmentForOrder('o1', admin, { db, client });
    const r = await assignAwbForOrder('o1', 5, admin, { db, client });
    expect(r.assigned).toBe(true);
    expect(state.order.trackingNumber).toBe('AWB123');
    expect(state.order.courierName).toBe('Delhivery');
    expect(state.order.trackingUrl).toMatch(/^https:\/\//);
    expect(state.order.status).toBe('packed'); // assigning an AWB never moves the order itself
    // idempotent
    expect((await assignAwbForOrder('o1', 5, admin, { db, client })).assigned).toBe(false);

    await cancelShipmentForOrder('o1', admin, { db, client });
    expect(state.shipments[0].status).toBe('CANCELLED');
    expect(state.order.trackingNumber).toBeNull();
    const again = await createShipmentForOrder('o1', admin, { db, client });
    expect(again.created).toBe(true);
    expect(state.shipments).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------
describe('status mapping', () => {
  it.each([
    ['Picked Up', 'PICKED_UP'],
    ['PICKUP DONE', 'PICKED_UP'],
    ['In Transit', 'IN_TRANSIT'],
    ['Reached At Destination Hub', 'IN_TRANSIT'],
    ['Out For Delivery', 'OUT_FOR_DELIVERY'],
    ['Delivered', 'DELIVERED'],
    ['RTO Initiated', 'RTO_INITIATED'],
    ['RTO In Transit', 'RTO_INITIATED'],
    ['RTO Delivered', 'RTO_DELIVERED'],
    ['Undelivered', 'EXCEPTION'],
    ['Pickup Scheduled', 'MANIFEST_GENERATED'],
    ['Something Weird', null],
  ])('%s -> %s', (raw, expected) => {
    expect(mapShiprocketStatus(raw)).toBe(expected);
  });
  it('never regresses and treats terminal states as final', () => {
    expect(shouldAdvance('IN_TRANSIT', 'PICKED_UP')).toBe(false);
    expect(shouldAdvance('IN_TRANSIT', 'OUT_FOR_DELIVERY')).toBe(true);
    expect(shouldAdvance('DELIVERED', 'RTO_INITIATED')).toBe(false);
    expect(shouldAdvance('CANCELLED', 'PICKED_UP')).toBe(false);
  });
  it('only moves orders already at packed/shipped through the pipeline', () => {
    expect(orderStepsForShipment('packed', 'IN_TRANSIT')).toEqual(['shipped']);
    expect(orderStepsForShipment('packed', 'DELIVERED')).toEqual(['shipped', 'delivered']);
    expect(orderStepsForShipment('shipped', 'DELIVERED')).toEqual(['delivered']);
    expect(orderStepsForShipment('printing', 'DELIVERED')).toEqual([]);
    expect(orderStepsForShipment('packed', 'RTO_INITIATED')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------
describe('webhook token', () => {
  it('accepts only the exact token and rejects when unset', () => {
    expect(verifyWebhookToken('abc', 'abc')).toBe(true);
    expect(verifyWebhookToken('abd', 'abc')).toBe(false);
    expect(verifyWebhookToken('abc', 'abcd')).toBe(false);
    expect(verifyWebhookToken(null, 'abc')).toBe(false);
    expect(verifyWebhookToken('abc', undefined)).toBe(false);
    expect(verifyWebhookToken('', '')).toBe(false);
  });
});

describe('webhook processing', () => {
  async function seeded(orderStatus = 'packed') {
    const m = makeDb({ status: orderStatus });
    m.state.order.courierName = 'Delhivery';
    m.state.order.trackingNumber = 'AWB123';
    m.state.shipments.push({ id: 's1', seq: 1, orderId: 'o1', provider: 'shiprocket', awbNumber: 'AWB123', courierName: 'Delhivery', status: 'MANIFEST_GENERATED', createdAt: new Date(), updatedAt: new Date(), metadata: { events: [] } });
    return m;
  }
  const payload = (status: string, ts = '2026-11-03 10:00:00') => ({ awb: 'AWB123', current_status: status, current_timestamp: ts, order_id: 'EVIL-OTHER', scans: [{ activity: 'scanned', location: 'Pune' }] });

  it('picked up moves a packed order to shipped via history', async () => {
    const { db, state } = await seeded();
    expect(await handleShiprocketWebhook(payload('Picked Up'), { db })).toBe('applied');
    expect(state.shipments[0].status).toBe('PICKED_UP');
    expect(state.shipments[0].pickedUpAt).toBeInstanceOf(Date);
    expect(state.order.status).toBe('shipped');
    expect(state.history.map((h) => h.status)).toEqual(['shipped']);
    expect(state.shipments[0].metadata.events).toHaveLength(1);
  });

  it('is idempotent: the same event twice changes nothing the second time', async () => {
    const { db, state } = await seeded();
    expect(await handleShiprocketWebhook(payload('In Transit'), { db })).toBe('applied');
    expect(await handleShiprocketWebhook(payload('In Transit'), { db })).toBe('duplicate');
    expect(state.shipments[0].metadata.events).toHaveLength(1);
    expect(state.history).toHaveLength(1);
  });

  it('delivered walks packed -> shipped -> delivered and stamps deliveredAt', async () => {
    const { db, state } = await seeded();
    await handleShiprocketWebhook(payload('Delivered'), { db });
    expect(state.order.status).toBe('delivered');
    expect(state.history.map((h) => h.status)).toEqual(['shipped', 'delivered']);
    expect(state.shipments[0].deliveredAt).toBeInstanceOf(Date);
  });

  it('late out-of-order events do not regress status', async () => {
    const { db, state } = await seeded('shipped');
    await handleShiprocketWebhook(payload('Out For Delivery', '2026-11-04 09:00:00'), { db });
    await handleShiprocketWebhook(payload('In Transit', '2026-11-03 09:00:00'), { db });
    expect(state.shipments[0].status).toBe('OUT_FOR_DELIVERY');
    expect(state.shipments[0].metadata.events).toHaveLength(2); // stored, status untouched
  });

  it('RTO is tracked on the shipment but never moves the order', async () => {
    const { db, state } = await seeded('shipped');
    await handleShiprocketWebhook(payload('RTO Initiated'), { db });
    expect(state.shipments[0].status).toBe('RTO_INITIATED');
    expect(state.order.status).toBe('shipped');
  });

  it('does not skip pipeline stages: a printing order stays printing', async () => {
    const { db, state } = await seeded('printing');
    await handleShiprocketWebhook(payload('Picked Up'), { db });
    expect(state.order.status).toBe('printing');
    expect(state.shipments[0].status).toBe('PICKED_UP');
  });

  it('only the AWB selects the record; unknown AWB and bad payloads are harmless', async () => {
    const { db, state } = await seeded();
    expect(await handleShiprocketWebhook({ ...payload('Delivered'), awb: 'NOPE' }, { db })).toBe('unknown_awb');
    expect(await handleShiprocketWebhook({ current_status: 'Delivered' }, { db })).toBe('invalid');
    expect(await handleShiprocketWebhook(null, { db })).toBe('invalid');
    expect(state.order.status).toBe('packed');
    expect(await applyTrackingUpdate('AWB123', { eventId: 'e', rawStatus: 'Gibberish', timestamp: null }, { db })).toBe('ignored');
    expect(state.order.totalAmount).toBe(1149);
  });
});
