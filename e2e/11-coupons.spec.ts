import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  QA_CUSTOMER,
  acceptDialogs,
  adminSend,
  cancelOrderIfOpen,
  expectCleanPage,
  getState,
  gotoAdmin,
  patchState,
  quote,
  requireProduct,
  runTag,
  testCartItem,
} from './helpers';

test.describe.configure({ mode: 'serial' });

const digits = () => runTag().replace(/\D/g, '').slice(-8);
const CODE = {
  pct: () => `QAP${digits()}`,
  fixed: () => `QAF${digits()}`,
  expired: () => `QAX${digits()}`,
  limited: () => `QAL${digits()}`,
};
const PCT = 10;
const FIXED = 100;

let base = 0; // quote total with no coupon
let unit = 0; // line subtotal

const day = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const rowFor = (page: Page, code: string) => page.locator('tbody tr').filter({ has: page.getByText(code, { exact: true }) });

async function createCoupon(
  page: Page,
  c: { code: string; type: 'percentage' | 'fixed'; value: number; min?: number; limit?: number; start?: string; expiry?: string },
) {
  await gotoAdmin(page, '/admin/coupons');
  const form = page.locator('form');
  await form.getByPlaceholder('WELCOME10').fill(c.code);
  await form.locator('select').selectOption(c.type);
  const nums = form.locator('input[type="number"]');
  await nums.nth(0).fill(String(c.value));
  if (c.min !== undefined) await nums.nth(1).fill(String(c.min));
  if (c.limit !== undefined) await nums.nth(2).fill(String(c.limit));
  const dates = form.locator('input[type="date"]');
  if (c.start) await dates.nth(0).fill(c.start);
  if (c.expiry) await dates.nth(1).fill(c.expiry);
  await form.getByRole('button', { name: 'Create coupon' }).click();
  await expect(page.getByText('Coupon created', { exact: true })).toBeVisible();
  await expect(rowFor(page, c.code)).toHaveCount(1);
}

async function couponTotal(request: APIRequestContext, code: string): Promise<{ rejected: boolean; total: number }> {
  try {
    const q = await quote(request, [testCartItem(requireProduct())], { couponCode: code });
    return { rejected: false, total: q.total };
  } catch {
    return { rejected: true, total: NaN };
  }
}

test.describe('11 coupons', () => {
  test('baseline quote for the test cart (no coupon)', async ({ request }) => {
    const p = requireProduct();
    const q = await quote(request, [testCartItem(p)]);
    base = q.total;
    unit = p.price + p.variants[1].priceAdjustment + p.textFieldFee;
    expect(base).toBeGreaterThanOrEqual(unit);
  });

  test('create a percentage and a fixed coupon through the UI', async ({ page }) => {
    await createCoupon(page, { code: CODE.pct(), type: 'percentage', value: PCT });
    await createCoupon(page, { code: CODE.fixed(), type: 'fixed', value: FIXED });
    const row = rowFor(page, CODE.pct());
    await expect(row).toContainText(`${PCT}%`);
    await expect(row).toContainText('active');
    await expect(rowFor(page, CODE.fixed())).toContainText(`₹${FIXED}`);
    await expectCleanPage(page);
  });

  test('server quote applies percentage and fixed discounts correctly (case-insensitive code)', async ({ request }) => {
    const pct = await quote(request, [testCartItem(requireProduct())], { couponCode: CODE.pct() });
    expect(pct.total).toBeCloseTo(base - unit * (PCT / 100), 2);
    const lower = await quote(request, [testCartItem(requireProduct())], { couponCode: CODE.pct().toLowerCase() });
    expect(lower.total).toBeCloseTo(pct.total, 2);
    const fixed = await quote(request, [testCartItem(requireProduct())], { couponCode: CODE.fixed() });
    expect(fixed.total).toBeCloseTo(base - FIXED, 2);
  });

  test('expired coupon (expiry in the past) gives no discount', async ({ page, request }) => {
    await createCoupon(page, { code: CODE.expired(), type: 'percentage', value: 50, start: day(-30), expiry: day(-1) });
    await expect(rowFor(page, CODE.expired())).toContainText(day(-1));
    const r = await couponTotal(request, CODE.expired());
    // acceptable behaviours: coupon ignored (total == baseline) or explicitly rejected; never a discount
    if (!r.rejected) expect(r.total).toBeCloseTo(base, 2);
  });

  test('coupon not yet started (future start date) gives no discount', async ({ page, request }) => {
    await createCoupon(page, { code: `${CODE.expired()}F`, type: 'percentage', value: 50, start: day(5), expiry: day(30) });
    const r = await couponTotal(request, `${CODE.expired()}F`);
    if (!r.rejected) expect(r.total).toBeCloseTo(base, 2);
  });

  test('unknown coupon code gives no discount', async ({ request }) => {
    const r = await couponTotal(request, `NOPE${digits()}`);
    if (!r.rejected) expect(r.total).toBeCloseTo(base, 2);
  });

  test('validation: percentage over 100, duplicate code and bad characters are rejected', async ({ page, request }) => {
    const over = await adminSend(request, 'POST', '/api/admin/coupons', { code: `QAB${digits()}`, discountType: 'percentage', discountValue: 150, minOrderValue: 0, isActive: true });
    expect(over.status).toBe(400);
    const bad = await adminSend(request, 'POST', '/api/admin/coupons', { code: 'bad code!', discountType: 'fixed', discountValue: 5, minOrderValue: 0, isActive: true });
    expect(bad.status).toBe(400);
    // duplicate via the UI
    await gotoAdmin(page, '/admin/coupons');
    const form = page.locator('form');
    await form.getByPlaceholder('WELCOME10').fill(CODE.pct());
    await form.locator('input[type="number"]').nth(0).fill('5');
    await form.getByRole('button', { name: 'Create coupon' }).click();
    await expect(page.getByText('A coupon with this code already exists')).toBeVisible();
  });

  test('usage limit: a 1-use coupon works once, then stops discounting and can only be disabled', async ({ page, request }) => {
    const p = requireProduct();
    await createCoupon(page, { code: CODE.limited(), type: 'percentage', value: PCT, limit: 1 });
    await expect(rowFor(page, CODE.limited())).toContainText('0 / 1');

    const items = [testCartItem(p)];
    const first = await quote(request, items, { couponCode: CODE.limited() });
    expect(first.total).toBeCloseTo(base - unit * (PCT / 100), 2);

    // consume it with a real (pending, prepaid, not paid) order
    const res = await request.post('/api/razorpay/create-order', {
      data: { items, paymentMethod: 'prepaid', couponCode: CODE.limited(), customer: QA_CUSTOMER(), expectedTotal: first.total },
    });
    const body = await res.json();
    expect(res.status(), JSON.stringify(body).slice(0, 300)).toBe(200);
    expect(body.totalAmount).toBeCloseTo(first.total, 2);
    const st = getState();
    patchState({ extraOrders: [...(st.extraOrders ?? []), { id: body.orderId, orderNumber: body.orderNumber }] });

    const second = await couponTotal(request, CODE.limited());
    if (!second.rejected) expect(second.total, 'limit reached -> no discount').toBeCloseTo(base, 2);

    await gotoAdmin(page, '/admin/coupons');
    await expect(rowFor(page, CODE.limited())).toContainText('1 / 1');
    // used coupons are disabled, never deleted (history preserved)
    acceptDialogs(page);
    await rowFor(page, CODE.limited()).getByRole('button', { name: 'Disable' }).click();
    await expect(page.getByText('Coupon disabled', { exact: true })).toBeVisible();
    await expect(rowFor(page, CODE.limited())).toContainText('disabled');
    patchState({ coupons: [...getState().coupons, { id: 'n/a', code: CODE.limited() }] });

    // the order that consumed the coupon is no longer needed
    await cancelOrderIfOpen(request, body.orderId);
  });

  test('disabling a coupon via edit stops its discount; then delete the unused QA coupons', async ({ page, request }) => {
    acceptDialogs(page);
    await gotoAdmin(page, '/admin/coupons');
    // edit -> untick Active -> save
    await rowFor(page, CODE.pct()).getByRole('button', { name: 'Edit' }).click();
    await page.locator('form').getByRole('checkbox', { name: 'Active' }).uncheck();
    await page.locator('form').getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Coupon updated', { exact: true })).toBeVisible();
    await expect(rowFor(page, CODE.pct())).toContainText('disabled');
    const r = await couponTotal(request, CODE.pct());
    if (!r.rejected) expect(r.total).toBeCloseTo(base, 2);

    // delete unused coupons (never applied to an order)
    for (const code of [CODE.pct(), CODE.fixed(), CODE.expired(), `${CODE.expired()}F`]) {
      await gotoAdmin(page, '/admin/coupons');
      await rowFor(page, code).getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText('Coupon deleted', { exact: true })).toBeVisible();
      await expect(rowFor(page, code)).toHaveCount(0);
    }
  });
});
