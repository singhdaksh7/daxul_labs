import { test, expect } from '@playwright/test';
import {
  acceptDialogs,
  adminGet,
  adminSend,
  expectCleanPage,
  gotoAdmin,
  patchState,
  requireOrder,
  runTag,
  withPublic,
} from './helpers';

test.describe.configure({ mode: 'serial' });

const STEPS = ['DESIGN PENDING', 'DESIGN APPROVED', '3D PRINTING', 'HAND FINISHING', 'QC CHECKED', 'PACKED'] as const;
const API_STATUS = ['design_pending', 'design_approved', 'printing', 'finishing', 'qc', 'packed'];

const orderStatus = async (request: import('@playwright/test').APIRequestContext, id: string) =>
  (await adminGet(request, `/api/admin/orders?id=${id}`)).body.order.status as string;

test.describe('06 manufacturing', () => {
  test('walk the order through every pre-shipping status via the UI', async ({ page, request }) => {
    const o = requireOrder();
    await gotoAdmin(page, `/admin/orders/${o.id}`);
    await expect(page.getByRole('button', { name: 'Advance to DESIGN PENDING' })).toBeVisible();
    expect(await orderStatus(request, o.id)).toBe('new');

    for (let i = 0; i < STEPS.length; i++) {
      await page.getByPlaceholder('e.g. Proof approved by customer').fill(`QA step ${STEPS[i]} ${runTag()}`);
      await page.getByRole('button', { name: `Advance to ${STEPS[i]}` }).click();
      await expect(page.getByText('Status advanced', { exact: true })).toBeVisible();
      const next = i + 1 < STEPS.length ? `Advance to ${STEPS[i + 1]}` : 'Advance to SHIPPED';
      await expect(page.getByRole('button', { name: next })).toBeVisible();
      expect(await orderStatus(request, o.id)).toBe(API_STATUS[i]);
    }
  });

  test('illegal transitions are rejected (UI + API); status does not change', async ({ page, request }) => {
    const o = requireOrder();
    await gotoAdmin(page, `/admin/orders/${o.id}`);

    // UI: SHIPPED requires courier + tracking
    await page.getByRole('button', { name: 'Advance to SHIPPED' }).click();
    await expect(page.getByText('Courier name and tracking number are required before marking as shipped')).toBeVisible();
    expect(await orderStatus(request, o.id)).toBe('packed');

    // API: there is no way to jump; only next/prev single steps are accepted
    const jump = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'move', orderId: o.id, direction: 'delivered' });
    expect(jump.status).toBe(400);
    const jump2 = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'move', orderId: o.id, status: 'delivered' });
    expect(jump2.status).toBe(400);
    const ship = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'move', orderId: o.id, direction: 'next' });
    expect(ship.status).toBe(400); // blocked: no courier/tracking yet
    const http = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'shipping', orderId: o.id, trackingUrl: 'http://insecure.example/x' });
    expect(http.status).toBe(400); // https only
    const js = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'shipping', orderId: o.id, trackingUrl: 'javascript:alert(1)' });
    expect(js.status).toBe(400);
    const unknown = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'move', orderId: 'does-not-exist', direction: 'next' });
    expect(unknown.status).toBe(404);
    expect(await orderStatus(request, o.id)).toBe('packed');
  });

  test('status history timeline lists every step in order with notes', async ({ page }) => {
    const o = requireOrder();
    await gotoAdmin(page, `/admin/orders/${o.id}`);
    const hist = page.locator('section', { has: page.getByRole('heading', { name: 'Status history' }) });
    const text = await hist.innerText();
    const order = ['NEW ORDER', ...STEPS];
    let last = -1;
    for (const label of order) {
      const idx = text.indexOf(label, last + 1);
      expect(idx, `"${label}" missing/out of order in history`).toBeGreaterThan(last);
      last = idx;
    }
    for (const label of STEPS) expect(text).toContain(`QA step ${label} ${runTag()}`);
    expect(text).toMatch(/by .+@/); // admin attribution recorded
  });

  test('set courier + tracking, then mark SHIPPED', async ({ page, request }) => {
    const o = requireOrder();
    const courier = 'QA Courier';
    const trackingNumber = `QATRK${runTag().replace(/\D/g, '').slice(-8)}`;
    await gotoAdmin(page, `/admin/orders/${o.id}`);
    await page.getByPlaceholder('Courier name').fill(courier);
    await page.getByPlaceholder('Tracking number').fill(trackingNumber);
    await page.getByPlaceholder('Tracking URL (https://...)').fill(`https://example.com/track/${trackingNumber}`);
    await page.getByRole('button', { name: 'Save shipping' }).click();
    await expect(page.getByText('Shipping details saved')).toBeVisible();
    const ship = page.locator('section', { has: page.getByRole('heading', { name: 'Shipment' }) });
    await expect(ship).toContainText(courier);
    await expect(ship).toContainText(trackingNumber);
    patchState({ order: { ...o, courier, trackingNumber } });

    await page.getByPlaceholder('e.g. Proof approved by customer').fill(`QA shipped ${runTag()}`);
    await page.getByRole('button', { name: 'Advance to SHIPPED' }).click();
    await expect(page.getByText('Status advanced', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Advance to DELIVERED' })).toBeVisible();
    expect(await orderStatus(request, o.id)).toBe('shipped');
    await expectCleanPage(page);
  });

  test('public tracking: wrong info fails, order number alone fails, matching order+email works', async ({ page }) => {
    const o = requireOrder();
    // /api/track is rate limited to 10/min per IP; this test makes 4 API calls + 1 UI search.
    await withPublic(async (ctx) => {
      const wrongEmail = await ctx.post('/api/track', { data: { orderNumber: o.orderNumber, email: `wrong-${runTag().toLowerCase()}@daxul.invalid` } });
      expect(wrongEmail.status()).toBe(404);

      const numberOnly = await ctx.post('/api/track', { data: { orderNumber: o.orderNumber } });
      expect(numberOnly.status()).toBe(400);

      const wrongOrder = await ctx.post('/api/track', { data: { orderNumber: 'ZZ-000000', email: o.email } });
      expect(wrongOrder.status()).toBe(404);
      // identical generic message => cannot be used to enumerate which order numbers exist
      expect((await wrongOrder.json()).error).toBe((await (await ctx.post('/api/track', { data: { orderNumber: o.orderNumber, email: 'x@daxul.invalid' } })).json()).error);
    });

    await withPublic(async (ctx) => {
      const ok = await ctx.post('/api/track', { data: { orderNumber: o.orderNumber, email: o.email.toUpperCase() } });
      expect(ok.status()).toBe(200);
      const j = await ok.json();
      expect(j.order.status).toBe('shipped');
      expect(j.order.courierName).toBe(o.courier);
      expect(j.order.trackingNumber).toBe(o.trackingNumber);
      const raw = JSON.stringify(j);
      // customer-safe payload only
      expect(raw).not.toMatch(/internalNotes|qcNotes|adminEmail|businessCosts|razorpay|totalAmount|street|pincode/i);
      expect(raw).not.toContain(o.email);
      expect(raw).not.toContain(`QA step`); // admin status-change notes are never exposed
      expect(j.order.statusHistory.length).toBeGreaterThanOrEqual(8);
    });

    // UI path (1 more request)
    await page.goto('/track');
    await page.getByPlaceholder('ORDER NUMBER').fill(o.orderNumber);
    await page.getByPlaceholder('EMAIL OR PHONE').fill(o.email);
    await page.getByRole('button', { name: /Track Now/ }).click();
    await expect(page.getByText(`Order #${o.orderNumber}`)).toBeVisible();
    await expect(page.getByText(/Stage:/)).toContainText(/shipped/i);
    await expect(page.getByText(o.trackingNumber as string)).toBeVisible();
    await expect(page.getByText(o.courier as string)).toBeVisible();
    await expectCleanPage(page);
  });

  test('cancel the order from the admin UI', async ({ page, request }) => {
    const o = requireOrder();
    acceptDialogs(page);
    await gotoAdmin(page, `/admin/orders/${o.id}`);
    await page.getByRole('button', { name: 'Cancel order' }).click();
    await expect(page.getByText('Order cancelled', { exact: true })).toBeVisible();
    expect(await orderStatus(request, o.id)).toBe('cancelled');
    // a cancelled order offers no further moves and cannot be cancelled again
    await expect(page.getByRole('button', { name: /^Advance to/ })).toHaveCount(0);
    const again = await adminSend(request, 'PATCH', '/api/admin/orders', { action: 'cancel', orderId: o.id });
    expect(again.status).toBe(400);

    // public tracker reflects cancellation (1 request)
    await withPublic(async (ctx) => {
      const r = await ctx.post('/api/track', { data: { orderNumber: o.orderNumber, email: o.email } });
      expect(r.status()).toBe(200);
      expect((await r.json()).order.status).toBe('cancelled');
    });
  });
});
