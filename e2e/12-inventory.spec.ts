import { test, expect, type Page } from '@playwright/test';
import { adminEmail, adminGet, expectCleanPage, getProductFull, gotoAdmin, requireProduct, runTag } from './helpers';

test.describe.configure({ mode: 'serial' });

const DELTA = 5;
let startStock = 0;

const productRow = (page: Page, name: string) =>
  page.locator('tbody tr').filter({ has: page.getByText(name, { exact: true }) }).filter({ has: page.locator('td', { hasText: /^—$/ }) });

async function search(page: Page) {
  await gotoAdmin(page, '/admin/inventory');
  await page.getByPlaceholder('Search SKU or product').fill(runTag());
  await expect(page.locator('tbody tr').first()).toContainText(requireProduct().name);
}
async function adjust(page: Page, delta: string, reason: string, note: string) {
  await productRow(page, requireProduct().name).getByRole('button', { name: 'Adjust' }).click();
  await page.getByPlaceholder('+10 or -2').fill(delta);
  await page.getByLabel('Reason').selectOption(reason);
  await page.getByLabel('Note', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test.describe('12 inventory', () => {
  test('current stock reflects the order reservations', async ({ request, page }) => {
    const p = requireProduct();
    const full = await getProductFull(request, p.id);
    startStock = full.stock;
    // started at p.stock; the test order (and the usage-limit coupon order) each reserved 1
    expect(startStock).toBeLessThanOrEqual(p.stock - 1);
    await search(page);
    await expect(productRow(page, p.name).locator('td').nth(3)).toContainText(String(startStock));
    await expectCleanPage(page);
  });

  test(`adjust stock +${DELTA} with a reason; ledger row appears`, async ({ page, request }) => {
    const p = requireProduct();
    await search(page);
    await adjust(page, `+${DELTA}`, 'production_added', `QA ${runTag()}`);
    await expect(page.getByText(`Stock updated. New quantity: ${startStock + DELTA}`)).toBeVisible();
    await expect(productRow(page, p.name).locator('td').nth(3)).toContainText(String(startStock + DELTA));
    expect((await getProductFull(request, p.id)).stock).toBe(startStock + DELTA);

    await productRow(page, p.name).getByRole('button', { name: 'History' }).click();
    await expect(page.getByText(`History: ${p.name}`)).toBeVisible();
    const rows = page.locator('div.fixed tbody tr');
    const mine = rows.filter({ hasText: `QA ${runTag()}` });
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText(`+${DELTA}`);
    await expect(mine).toContainText(String(startStock + DELTA));
    await expect(mine).toContainText('production_added');
    await expect(mine).toContainText(adminEmail());
    // the order reservations are in the ledger too, as negative deltas
    await expect(rows.filter({ hasText: 'order' }).first()).toBeVisible();
  });

  test('cannot adjust below zero; zero/non-integer deltas are blocked', async ({ page }) => {
    const p = requireProduct();
    await search(page);
    await adjust(page, String(-(startStock + DELTA + 100)), 'correction', 'QA should fail');
    await expect(page.getByText('Adjustment would make stock negative')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click(); // modal stays open after a failed apply
    // Apply is disabled for 0 and decimals
    await productRow(page, p.name).getByRole('button', { name: 'Adjust' }).click();
    await page.getByPlaceholder('+10 or -2').fill('0');
    await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await page.getByPlaceholder('+10 or -2').fill('1.5');
    await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  test('low-stock threshold above stock flips the status to "low" and the dashboard alert; restoring flips it back', async ({ page, request }) => {
    const p = requireProduct();
    const stock = (await getProductFull(request, p.id)).stock as number;

    // raise threshold to stock via the product editor
    await gotoAdmin(page, `/admin/products/${p.id}`);
    await page.getByLabel('Low-stock threshold').fill(String(stock));
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible();

    await search(page);
    await expect(productRow(page, p.name).locator('td').nth(5)).toHaveText('low');
    await page.locator('select').filter({ has: page.locator('option[value="low"]') }).selectOption('low');
    await expect(productRow(page, p.name)).toHaveCount(1);

    await gotoAdmin(page, '/admin');
    const alerts = page.locator('section', { has: page.getByRole('heading', { name: 'Low-stock alerts' }) });
    await expect(alerts).toContainText(p.name);
    await expect(alerts).toContainText(`${stock} left (min ${stock})`);

    // restore threshold
    await gotoAdmin(page, `/admin/products/${p.id}`);
    await page.getByLabel('Low-stock threshold').fill(String(p.lowStockThreshold));
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
    await search(page);
    await expect(productRow(page, p.name).locator('td').nth(5)).toHaveText('ok');
    await gotoAdmin(page, '/admin');
    await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Low-stock alerts' }) })).not.toContainText(p.name);
  });

  test(`restore the quantity with an opposite adjustment (-${DELTA})`, async ({ page, request }) => {
    const p = requireProduct();
    await search(page);
    await adjust(page, `-${DELTA}`, 'correction', `QA restore ${runTag()}`);
    await expect(page.getByText(`Stock updated. New quantity: ${startStock}`)).toBeVisible();
    expect((await getProductFull(request, p.id)).stock).toBe(startStock);
    const hist = await adminGet(request, `/api/admin/inventory?productId=${p.id}`);
    const notes = (hist.body.history as { note: string | null; delta: number }[]).map((h) => `${h.delta}:${h.note ?? ''}`);
    expect(notes.some((n) => n.startsWith(`${DELTA}:QA ${runTag()}`))).toBe(true);
    expect(notes.some((n) => n.startsWith(`-${DELTA}:QA restore`))).toBe(true);
  });
});
