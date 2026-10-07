import {
  expect,
  request as pwRequest,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/* -------------------------------------------------------------------------- */
/* Paths                                                                      */
/* -------------------------------------------------------------------------- */
export const E2E_DIR = __dirname;
export const AUTH_DIR = path.join(E2E_DIR, '.auth');
export const AUTH_FILE = path.join(AUTH_DIR, 'admin.json');
export const STATE_DIR = path.join(E2E_DIR, '.state');
export const ORIGINAL_FILE = path.join(STATE_DIR, 'original.json');
export const RUN_FILE = path.join(STATE_DIR, 'run.json');
export const STATE_FILE = path.join(STATE_DIR, 'state.json');
export const SHOT_DIR = path.join(E2E_DIR, 'screenshots');

/* -------------------------------------------------------------------------- */
/* Environment (secrets are read here and nowhere else; never logged)         */
/* -------------------------------------------------------------------------- */
export function baseUrl(): string {
  const v = process.env.BASE_URL;
  if (!v) throw new Error('BASE_URL is not set');
  return v.replace(/\/+$/, '');
}
export function adminEmail(): string {
  const v = process.env.QA_ADMIN_EMAIL;
  if (!v) throw new Error('QA_ADMIN_EMAIL is not set');
  return v;
}
export function adminPassword(): string {
  const v = process.env.QA_ADMIN_PASSWORD;
  if (!v) throw new Error('QA_ADMIN_PASSWORD is not set');
  return v;
}
export function requireEnv(): void {
  const missing = ['BASE_URL', 'QA_ADMIN_EMAIL', 'QA_ADMIN_PASSWORD'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

/** Strip the password from any string before it can reach a log or error. */
export function redact(s: string): string {
  const pw = process.env.QA_ADMIN_PASSWORD;
  return pw ? s.split(pw).join('[REDACTED]') : s;
}

/**
 * Types into a (password) input without the value being part of Playwright's
 * action log: sets the value through the native setter and fires input events,
 * which is what React listens to.
 */
export async function secureFill(locator: Locator, value: string): Promise<void> {
  try {
    await locator.evaluate((el, v) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  } catch (e) {
    throw new Error(redact(e instanceof Error ? e.message : String(e)));
  }
}

/* -------------------------------------------------------------------------- */
/* Run tag + persisted state                                                  */
/* -------------------------------------------------------------------------- */
export function runTag(): string {
  if (process.env.QA_RUN_TAG) return process.env.QA_RUN_TAG;
  const j = JSON.parse(fs.readFileSync(RUN_FILE, 'utf8')) as { tag: string };
  return j.tag;
}
export const productName = () => `DAXUL TEST OBJECT ${runTag()}`;
export const collectionName = (suffix = '') => `QA Collection${suffix ? ' ' + suffix : ''} ${runTag()}`;
export const customerEmail = () => `qa-customer-${runTag().replace(/[^a-z0-9]/gi, '').toLowerCase()}@daxul.invalid`;

export interface ProductState {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  groupId: string;
  variants: { id: string; name: string; priceAdjustment: number }[];
  textFieldId: string;
  textFieldLabel: string;
  textFieldFee: number;
  selectFieldId: string;
  selectFieldLabel: string;
  selectChoices: string[];
}
export interface OrderState {
  id: string;
  orderNumber: string;
  email: string;
  total: number;
  quoteTotal: number;
  courier?: string;
  trackingNumber?: string;
}
export interface QaState {
  tag: string;
  product?: ProductState;
  order?: OrderState;
  coupons: { id: string; code: string }[];
  collections: { id: string; name: string }[];
  mediaAlt: string[];
  extraOrders?: { id: string; orderNumber: string }[];
  cleaned?: boolean;
}

export function getState(): QaState {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as QaState;
}
export function patchState(patch: Partial<QaState>): QaState {
  const next = { ...getState(), ...patch };
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
  return next;
}
export function requireProduct(): ProductState {
  const p = getState().product;
  if (!p) throw new Error('No test product in state; spec 03-products must pass first');
  return p;
}
export function requireOrder(): OrderState {
  const o = getState().order;
  if (!o) throw new Error('No test order in state; spec 05-orders must pass first');
  return o;
}
export function readOriginal(): Original {
  return JSON.parse(fs.readFileSync(ORIGINAL_FILE, 'utf8')) as Original;
}

export interface Original {
  capturedAt: string;
  settings: Record<string, unknown>;
  policies: { slug: string; title: string; content: string }[];
  theme: Record<string, unknown>;
  seo: Record<string, unknown>;
  cmsPublished: Record<string, unknown>;
  cmsSections: {
    sectionKey: string;
    visible: boolean;
    sortOrder: number;
    draftContent: unknown;
    publishedContent: unknown;
  }[];
  collections: { id: string; name: string; isActive: boolean }[];
  couponIds: string[];
  productIds: string[];
  mediaIds: string[];
}

/* -------------------------------------------------------------------------- */
/* Misc utilities                                                             */
/* -------------------------------------------------------------------------- */
const VOLATILE = new Set(['updatedAt', 'createdAt']);
export function stripVolatile<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripVolatile) as unknown as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([k]) => !VOLATILE.has(k))
        .map(([k, x]) => [k, stripVolatile(x)]),
    ) as T;
  }
  return v;
}

export const inr = (n: number) => '₹' + (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** First number in a string such as "₹1,200 (base ₹1,000 ...)". */
export function parseMoney(text: string): number {
  const m = text.replace(/\s+/g, ' ').match(/[\d,]+(?:\.\d+)?/);
  if (!m) throw new Error(`No amount found in "${text}"`);
  return Number(m[0].replace(/,/g, ''));
}
export function allMoney(text: string): number[] {
  return [...text.matchAll(/₹\s*([\d,]+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, '')));
}

export function acceptDialogs(page: Page): void {
  page.on('dialog', (d) => {
    void d.accept().catch(() => undefined);
  });
}

/** Collects uncaught page errors so a spec can assert there were none. */
export function collectPageErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  return errs;
}

const BAD_TEXT = /\bNaN\b|\bundefined\b|\[object Object\]|\bInfinity\b/;
const FAKE_TEXT = /lorem ipsum|\bjohn doe\b|\bjane doe\b|mock data|dummy data|fake data|sample data/i;
export async function expectCleanPage(page: Page): Promise<void> {
  const text = await page.locator('body').innerText();
  expect(text, 'page text contains NaN/undefined/[object Object]').not.toMatch(BAD_TEXT);
  expect(text, 'page text contains placeholder/fake copy').not.toMatch(FAKE_TEXT);
}

export async function noHorizontalOverflow(page: Page): Promise<{ scrollWidth: number; innerWidth: number; ok: boolean }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    ok: document.documentElement.scrollWidth <= window.innerWidth + 1,
  }));
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** Unauthenticated request context (no admin cookies) for "what does the public see" checks. */
export async function withPublic<T>(fn: (ctx: APIRequestContext) => Promise<T>): Promise<T> {
  const ctx = await pwRequest.newContext({ baseURL: baseUrl(), storageState: { cookies: [], origins: [] } });
  try {
    return await fn(ctx);
  } finally {
    await ctx.dispose();
  }
}
export async function publicHtml(pathname: string): Promise<string> {
  return withPublic(async (ctx) => {
    const res = await ctx.get(pathname, { headers: { 'Cache-Control': 'no-cache' } });
    expect(res.status(), `GET ${pathname}`).toBe(200);
    return res.text();
  });
}
export async function publicJson<T = any>(pathname: string): Promise<{ status: number; body: T }> {
  return withPublic(async (ctx) => {
    const res = await ctx.get(pathname, { headers: { 'Cache-Control': 'no-cache' } });
    return { status: res.status(), body: (await res.json().catch(() => ({}))) as T };
  });
}

/* -------------------------------------------------------------------------- */
/* Admin API wrappers (same endpoints the admin UI uses; used for verification */
/* and for cleanup/restore safety nets)                                       */
/* -------------------------------------------------------------------------- */
export async function adminGet<T = any>(request: APIRequestContext, url: string): Promise<{ status: number; body: T }> {
  const res = await request.get(url);
  return { status: res.status(), body: (await res.json().catch(() => ({}))) as T };
}
export async function adminSend<T = any>(
  request: APIRequestContext,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown,
): Promise<{ status: number; body: T }> {
  const res = await request.fetch(url, { method, data });
  return { status: res.status(), body: (await res.json().catch(() => ({}))) as T };
}

export async function getProductFull(request: APIRequestContext, id: string) {
  const r = await adminGet(request, `/api/admin/products?id=${encodeURIComponent(id)}`);
  expect(r.status).toBe(200);
  return r.body.product;
}

/* -------------------------------------------------------------------------- */
/* Quote                                                                      */
/* -------------------------------------------------------------------------- */
export interface QuoteItem {
  productId: string;
  quantity: number;
  variantSelections?: { groupId: string; variantId: string }[];
  customizations?: Record<string, unknown>;
}
export interface QuoteResult {
  total: number;
  source: 'POST /api/quote' | 'create-order probe (expectedTotal mismatch)';
  status: number;
  raw: unknown;
}
export const QA_CUSTOMER = () => ({
  name: 'QA Playwright',
  email: customerEmail(),
  phone: '+919999900000',
  street: '1 QA Test Street',
  city: 'Testville',
  state: 'Test State',
  pincode: '560001',
  country: 'India',
});

function findTotal(raw: any): number | null {
  const cands = [raw?.total, raw?.totalAmount, raw?.grandTotal, raw?.quote?.total, raw?.data?.total, raw?.serverTotal];
  for (const c of cands) if (typeof c === 'number' && Number.isFinite(c)) return c;
  return null;
}

/**
 * Server-side price for a cart. Prefers POST /api/quote. If that route does not
 * exist on the deployment (it is not in the code this suite was written
 * against) it falls back to POST /api/razorpay/create-order with a deliberately
 * wrong `expectedTotal`: the server rejects it with 400 + `serverTotal` BEFORE
 * creating any order, reserving stock or consuming a coupon.
 */
export async function quote(
  request: APIRequestContext,
  items: QuoteItem[],
  opts: { couponCode?: string; paymentMethod?: 'prepaid' | 'cod' } = {},
): Promise<QuoteResult> {
  const body = { items, couponCode: opts.couponCode, paymentMethod: opts.paymentMethod ?? 'prepaid', customer: QA_CUSTOMER() };
  const q = await request.post('/api/quote', { data: body });
  if (q.status() !== 404 && q.status() !== 405) {
    const raw = await q.json().catch(() => ({}));
    expect(q.status(), `POST /api/quote -> ${JSON.stringify(raw).slice(0, 300)}`).toBe(200);
    const total = findTotal(raw);
    expect(total, 'POST /api/quote returned no recognisable total').not.toBeNull();
    return { total: total as number, source: 'POST /api/quote', status: q.status(), raw };
  }
  const probe = await request.post('/api/razorpay/create-order', { data: { ...body, expectedTotal: -1 } });
  const raw = await probe.json().catch(() => ({}));
  expect(probe.status(), `quote probe -> ${JSON.stringify(raw).slice(0, 300)}`).toBe(400);
  const total = findTotal(raw);
  expect(total, 'quote probe returned no serverTotal').not.toBeNull();
  return { total: total as number, source: 'create-order probe (expectedTotal mismatch)', status: probe.status(), raw };
}

/** Builds the cart line for the test product: Large variant + both custom fields filled. */
export function testCartItem(p: ProductState, opts: { variant?: 'first' | 'last'; filled?: boolean } = {}): QuoteItem {
  const v = (opts.variant ?? 'last') === 'last' ? p.variants[p.variants.length - 1] : p.variants[0];
  const filled = opts.filled ?? true;
  return {
    productId: p.id,
    quantity: 1,
    variantSelections: [{ groupId: p.groupId, variantId: v.id }],
    customizations: filled ? { [p.textFieldId]: 'QA ENGRAVING', [p.selectFieldId]: p.selectChoices[0] } : {},
  };
}
/** Expected unit price computed from the admin-configured values (independent of the server quote). */
export function expectedUnitPrice(p: ProductState, variantIdx: number, filled = true): number {
  return p.price + p.variants[variantIdx].priceAdjustment + (filled ? p.textFieldFee : 0);
}

/* -------------------------------------------------------------------------- */
/* Admin UI helpers                                                           */
/* -------------------------------------------------------------------------- */
export async function gotoAdmin(page: Page, pathname: string): Promise<void> {
  await page.goto(pathname);
  await expect(page, `redirected to login for ${pathname}; session invalid?`).not.toHaveURL(/\/admin\/login/);
}

/** Waits for the Next.js admin page to settle (no "Loading…" placeholders). */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

/** Polls `fn` until it resolves truthy; for CDN/ISR-cached public endpoints (published CMS is cached ~60s). */
export async function pollUntil(fn: () => Promise<boolean>, opts: { timeout?: number; interval?: number; message?: string } = {}): Promise<void> {
  await expect
    .poll(fn, { timeout: opts.timeout ?? 150_000, intervals: [opts.interval ?? 5_000], message: opts.message })
    .toBe(true);
}

/* -------------------------------------------------------------------------- */
/* Cleanup helpers                                                            */
/* -------------------------------------------------------------------------- */
export async function removeOrArchiveProduct(request: APIRequestContext, id: string): Promise<'deleted' | 'archived' | 'missing'> {
  const del = await adminSend(request, 'DELETE', `/api/admin/products?id=${encodeURIComponent(id)}`);
  if (del.status === 200) return 'deleted';
  if (del.status === 404) return 'missing';
  const arc = await adminSend(request, 'PATCH', '/api/admin/products', { id, action: 'archive' });
  expect(arc.status, 'archive product').toBe(200);
  return 'archived';
}
export async function cancelOrderIfOpen(request: APIRequestContext, id: string): Promise<'cancelled' | 'already' | 'blocked'> {
  const d = await adminGet(request, `/api/admin/orders?id=${encodeURIComponent(id)}`);
  if (d.status !== 200) return 'blocked';
  const status = d.body.order?.status;
  if (status === 'cancelled') return 'already';
  const r = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'cancel', orderId: id, note: 'QA cleanup' });
  return r.status === 200 ? 'cancelled' : 'blocked';
}
export async function removeCoupon(request: APIRequestContext, id: string): Promise<string> {
  const r = await adminSend(request, 'DELETE', '/api/admin/coupons', { id });
  return r.status === 200 ? String(r.body.result) : `status ${r.status}`;
}
export async function archiveCollection(request: APIRequestContext, id: string): Promise<void> {
  await adminSend(request, 'PATCH', '/api/admin/collections', { id, action: 'archive' });
}
/* -------------------------------------------------------------------------- */
/* Storefront helpers                                                         */
/* -------------------------------------------------------------------------- */
/** The big unit-price element on the product page. */
export const productPrice = (page: Page) => page.locator('div.text-2xl.font-black').first();

export function customTextInput(page: Page) {
  return page.getByPlaceholder('QA text', { exact: true });
}
export function customSelect(page: Page) {
  return page.locator('select').filter({ has: page.locator('option', { hasText: 'Select Option...' }) });
}

/** Opens the test product, picks the LAST variant (Large), fills both required fields and clicks Add To Cart. */
export async function configureAndAddToCart(page: Page, p: ProductState): Promise<void> {
  await page.goto(`/shop/${p.slug}`);
  await expect(page.getByRole('heading', { level: 1, name: p.name })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${p.variants[p.variants.length - 1].name}`) }).click();
  await customTextInput(page).fill('QA ENGRAVING');
  await customSelect(page).selectOption({ label: p.selectChoices[0] });
  await page.getByRole('button', { name: 'Add To Cart' }).click();
  await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
}

/** Blocks every Razorpay host so the checkout popup can never open or charge. Returns counters. */
export async function blockRazorpay(page: Page): Promise<{ aborted: () => number; completed: () => number }> {
  let aborted = 0;
  let completed = 0;
  await page.route(/https?:\/\/([^/]+\.)?razorpay\.com\//, (route) => {
    aborted++;
    void route.abort();
  });
  page.on('requestfinished', (r) => {
    if (/razorpay\.com/.test(r.url())) completed++;
  });
  return { aborted: () => aborted, completed: () => completed };
}

export async function removeMediaByAlt(request: APIRequestContext, alt: string): Promise<number> {
  const r = await adminGet(request, `/api/admin/cms/media?q=${encodeURIComponent(alt)}`);
  let n = 0;
  for (const a of r.body.assets ?? []) {
    const d = await adminSend(request, 'DELETE', `/api/admin/cms/media?id=${encodeURIComponent(a.id)}`);
    if (d.status === 200) n++;
  }
  return n;
}
