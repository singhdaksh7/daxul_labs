import { test, expect } from '@playwright/test';
import {
  QA_CUSTOMER,
  adminGet,
  allMoney,
  expectCleanPage,
  gotoAdmin,
  inr,
  patchState,
  quote,
  requireOrder,
  requireProduct,
  testCartItem,
  type OrderState,
} from './helpers';

test.describe.configure({ mode: 'serial' });

/**
 * The test product is customizable, so COD is not allowed (customProductsPrepaidOnly). The order is therefore
 * created exactly like the checkout does for prepaid: POST /api/razorpay/create-order. That creates a PENDING
 * order + a Razorpay order object, and NO payment/charge (nobody opens the Razorpay popup).
 */
test.describe('05 orders', () => {
  test('COD is rejected for the customizable test product', async ({ request }) => {
    const p = requireProduct();
    const res = await request.post('/api/razorpay/create-order', {
      data: { items: [testCartItem(p)], paymentMethod: 'cod', customer: QA_CUSTOMER(), expectedTotal: 1 },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/prepaid/i);
  });

  test('server rejects a tampered client total and tampered unit price (no order created)', async ({ request }) => {
    const p = requireProduct();
    const before = (await adminGet(request, `/api/admin/products?id=${p.id}`)).body.product.stock;
    const bad = await request.post('/api/razorpay/create-order', {
      data: { items: [testCartItem(p)], paymentMethod: 'prepaid', customer: QA_CUSTOMER(), expectedTotal: 1 },
    });
    expect(bad.status()).toBe(400);
    const bad2 = await request.post('/api/razorpay/create-order', {
      data: { items: [{ ...testCartItem(p), unitPrice: 1 }], paymentMethod: 'prepaid', customer: QA_CUSTOMER() },
    });
    expect(bad2.status()).toBe(400);
    const after = (await adminGet(request, `/api/admin/products?id=${p.id}`)).body.product.stock;
    expect(after, 'stock must be untouched by rejected checkouts').toBe(before);
  });

  test('create a pending prepaid order via create-order; total equals the server quote', async ({ request }) => {
    const p = requireProduct();
    const items = [testCartItem(p)];
    const q = await quote(request, items);
    test.info().annotations.push({ type: 'quote-source', description: q.source });
    const res = await request.post('/api/razorpay/create-order', {
      data: { items, paymentMethod: 'prepaid', customer: QA_CUSTOMER(), expectedTotal: q.total },
    });
    const body = await res.json();
    expect(res.status(), JSON.stringify(body).slice(0, 300)).toBe(200);
    expect(body.success).toBe(true);
    expect(body.totalAmount).toBe(q.total);
    expect(body.orderNumber).toMatch(/^[A-Z0-9]+-\d+$/);
    expect(body.amount, 'Razorpay amount is in paise').toBe(Math.round(q.total * 100));
    expect(body.razorpayOrderId, 'a Razorpay order was created (no charge)').toBeTruthy();

    const order: OrderState = {
      id: body.orderId,
      orderNumber: body.orderNumber,
      email: QA_CUSTOMER().email,
      total: body.totalAmount,
      quoteTotal: q.total,
    };
    patchState({ order });

    // stock reserved exactly once
    const stock = (await adminGet(request, `/api/admin/products?id=${p.id}`)).body.product.stock;
    expect(stock).toBe(p.stock - 1);
  });

  test('order appears in /admin/orders with totals equal to the quote', async ({ page }) => {
    const o = requireOrder();
    await gotoAdmin(page, `/admin/orders?q=${encodeURIComponent(o.orderNumber)}`);
    const row = page.locator('tbody tr', { hasText: o.orderNumber });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(inr(o.quoteTotal));
    await expect(row).toContainText('pending');
    await expect(row).toContainText('prepaid');
    await expect(row).toContainText('NEW ORDER');
    await expect(row).toContainText(o.email);
    await expectCleanPage(page);
  });

  test('order detail shows customization data, variant, amounts and a consistent total', async ({ page }) => {
    const o = requireOrder();
    const p = requireProduct();
    await gotoAdmin(page, `/admin/orders?q=${encodeURIComponent(o.orderNumber)}`);
    await page.getByRole('link', { name: o.orderNumber }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/orders/${o.id}$`));
    await expect(page.getByRole('heading', { name: `Order ${o.orderNumber}` })).toBeVisible();

    const items = page.locator('section', { has: page.getByRole('heading', { name: 'Items' }) });
    await expect(items).toContainText(p.name);
    await expect(items).toContainText('Large');
    await expect(items).toContainText('Customization');
    await expect(items).toContainText('QA ENGRAVING');
    await expect(items).toContainText(p.selectChoices[0]);
    await expect(items).toContainText(inr(p.price + p.variants[1].priceAdjustment));

    const amount = page.locator('section', { has: page.getByRole('heading', { name: 'Amount' }) });
    const val = async (k: string) => {
      const row = amount.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${k}$`) }) });
      return allMoney(await row.innerText())[0];
    };
    const subtotal = await val('Subtotal');
    const shipping = await val('Shipping');
    const total = await val('Total');
    expect(total).toBe(o.quoteTotal);
    expect(subtotal + shipping).toBe(total); // no coupon, no COD fee on this order

    await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Payment' }) })).toContainText('PREPAID');
    await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Payment' }) })).toContainText('pending');
    await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Status history' }) })).toContainText('NEW ORDER');
    await expectCleanPage(page);
  });

  test('order is listed in the Customizations production view', async ({ page }) => {
    const o = requireOrder();
    await gotoAdmin(page, '/admin/orders?view=customizations');
    await expect(page.getByRole('link', { name: o.orderNumber })).toBeVisible();
    await gotoAdmin(page, '/admin/orders?view=manufacturing');
    await expect(page.getByRole('link', { name: o.orderNumber })).toBeVisible();
  });
});
