import { test, expect } from '@playwright/test';
import {
  adminEmail,
  adminGet,
  adminPassword,
  allMoney,
  collectPageErrors,
  customerEmail,
  expectCleanPage,
  getState,
  gotoAdmin,
  patchState,
  requireOrder,
  runTag,
} from './helpers';

test.describe.configure({ mode: 'serial' });

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test.describe('13 customers / analytics / audit / media', () => {
  test('customers: page loads and the QA customer (from the test order) is listed', async ({ page }) => {
    const errors = collectPageErrors(page);
    const o = requireOrder();
    await gotoAdmin(page, '/admin/customers');
    await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible();
    await expectCleanPage(page);

    await page.getByPlaceholder('Search name, email, phone').fill(customerEmail());
    await page.getByRole('button', { name: 'Search' }).click();
    const row = page.locator('tbody tr', { hasText: customerEmail() });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('QA Playwright');
    const orders = Number((await row.locator('td').nth(3).innerText()).trim());
    expect(orders).toBeGreaterThanOrEqual(1);
    const amounts = allMoney(await row.innerText());
    for (const a of amounts) expect(Number.isFinite(a)).toBe(true);
    expect(amounts[0], 'lifetime value counts only PAID, non-cancelled orders; QA orders are unpaid/cancelled').toBe(0);

    await row.getByRole('link', { name: 'QA Playwright' }).click();
    await expect(page).toHaveURL(/\/admin\/customers\/.+/);
    await expect(page.locator('main')).toContainText(o.orderNumber);
    await expectCleanPage(page);
    expect(errors, errors.join(' | ')).toHaveLength(0);
  });

  test('customers: searching a non-existent customer shows an empty state', async ({ page }) => {
    await gotoAdmin(page, `/admin/customers?q=${encodeURIComponent('zzz-no-such-customer-' + runTag())}`);
    await expect(page.getByText('No customers yet.')).toBeVisible();
  });

  test('analytics: loads with real, finite numbers (no NaN / fake metrics)', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoAdmin(page, '/admin/analytics');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/analytics/i);
    await expectCleanPage(page);
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/-?Infinity|NaN%|₹-?NaN/);
    for (const a of allMoney(text)) expect(Number.isFinite(a)).toBe(true);
    // percentages, if shown, are sane
    for (const m of text.matchAll(/(-?\d+(?:\.\d+)?)\s*%/g)) {
      const v = Number(m[1]);
      expect(v).toBeGreaterThanOrEqual(-100);
      expect(v).toBeLessThanOrEqual(10_000);
    }
    expect(errors, errors.join(' | ')).toHaveLength(0);
  });

  test('media: upload a tiny PNG, set alt text, it is served; (deleted in 15-cleanup)', async ({ page, request }) => {
    const filename = `qa-${runTag()}.png`;
    await gotoAdmin(page, '/admin/media');
    await page.locator('input[type="file"]').setInputFiles({ name: filename, mimeType: 'image/png', buffer: PNG });
    await expect(page.getByText('Uploaded.', { exact: true })).toBeVisible();
    patchState({ mediaAlt: [...getState().mediaAlt, runTag()] });

    const tile = page.getByRole('img', { name: filename });
    await expect(tile).toBeVisible();
    await tile.click();
    await expect(page.getByText('image/png')).toBeVisible();
    await page.getByLabel('Alt text').fill(`QA alt ${runTag()}`);
    await page.getByRole('button', { name: 'Save alt' }).click();
    await expect(page.getByText('Alt text saved.', { exact: true })).toBeVisible();

    const list = await adminGet(request, `/api/admin/cms/media?q=${encodeURIComponent(runTag())}`);
    const asset = (list.body.assets as { url: string; altText: string }[])[0];
    expect(asset.altText).toBe(`QA alt ${runTag()}`);
    const file = await request.get(asset.url);
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toMatch(/image\/png/);
    await expectCleanPage(page);
  });

  test('audit: page loads and shows the QA admin\'s actions across entities, with no secrets', async ({ page, request }) => {
    const errors = collectPageErrors(page);
    const pw = adminPassword();
    for (const entityType of ['Product', 'Order', 'Coupon', 'Collection', 'StorePolicy']) {
      const r = await adminGet(request, `/api/admin/audit?admin=${encodeURIComponent(adminEmail())}&entityType=${entityType}&pageSize=100`);
      expect(r.status, entityType).toBe(200);
      expect((r.body.entries as unknown[]).length, `audit entries for ${entityType}`).toBeGreaterThan(0);
      const raw = JSON.stringify(r.body);
      expect(raw.includes(pw), 'audit payload contains the admin password').toBe(false);
      expect(raw).not.toMatch(/\$2[aby]\$\d\d\$[./A-Za-z0-9]{50,}/); // no bcrypt hashes
      expect(raw).not.toMatch(/passwordHash/i);
    }
    await gotoAdmin(page, '/admin/audit');
    await expect(page.getByRole('heading', { name: 'Audit logs', level: 1 })).toBeVisible();
    await page.getByPlaceholder('Admin email').fill(adminEmail());
    await page.getByPlaceholder('Action contains...').fill('product');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.locator('tbody tr').first()).toContainText(/product/i);
    await expectCleanPage(page);
    expect(errors, errors.join(' | ')).toHaveLength(0);
  });

  test('inventory, coupons, collections and orders pages all load without errors', async ({ page }) => {
    for (const path of ['/admin/inventory', '/admin/coupons', '/admin/collections', '/admin/orders', '/admin/orders?view=manufacturing', '/admin/products', '/admin/theme', '/admin/settings', '/admin/policies', '/admin/seo']) {
      const errors = collectPageErrors(page);
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      await expectCleanPage(page);
      expect(errors, `${path}: ${errors.join(' | ')}`).toHaveLength(0);
    }
  });
});
