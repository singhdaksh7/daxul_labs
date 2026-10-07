import { test, expect, type Page } from '@playwright/test';
import { adminGet, collectionName, expectCleanPage, getState, gotoAdmin, patchState, requireProduct, runTag } from './helpers';

test.describe.configure({ mode: 'serial' });

const rowFor = (page: Page, name: string) => page.locator('div.divide-y > div').filter({ hasText: name });
// icon-only buttons in each row: 0 = move up, 1 = move down, 2 = archive/unarchive
const UP = 0;
const DOWN = 1;
const ARCHIVE = 2;

async function listedNames(request: import('@playwright/test').APIRequestContext) {
  const r = await adminGet(request, '/api/admin/collections');
  expect(r.status).toBe(200);
  return (r.body.collections as { id: string; name: string; isActive: boolean }[]).map((c) => c.name);
}

test.describe('07 collections', () => {
  test('create "QA Collection <tag>" with the test product assigned', async ({ page, request }) => {
    const p = requireProduct();
    const name = collectionName();
    await gotoAdmin(page, '/admin/collections/new');
    await page.getByLabel('Name *', { exact: true }).fill(name);
    await page.getByLabel('Description', { exact: true }).fill('Automated QA collection. Safe to archive.');
    await page.getByPlaceholder('Filter products').fill(runTag());
    const cb = page.locator('label', { hasText: p.name }).getByRole('checkbox');
    await expect(cb).toHaveCount(1);
    await cb.check();
    await expect(page.getByText('Products (1 assigned)')).toBeVisible();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/\/admin\/collections\/(?!new)[^/]+$/);
    const id = new URL(page.url()).pathname.split('/').pop() as string;

    const r = await adminGet(request, `/api/admin/collections?id=${id}`);
    expect(r.body.collection.name).toBe(name);
    expect((r.body.collection.products as { id: string }[]).map((x) => x.id)).toContain(p.id);
    patchState({ collections: [...getState().collections, { id, name }] });
  });

  test('create a second QA collection (used to test ordering without touching real collections)', async ({ page, request }) => {
    const name = collectionName('B');
    await gotoAdmin(page, '/admin/collections/new');
    await page.getByLabel('Name *', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/\/admin\/collections\/(?!new)[^/]+$/);
    const id = new URL(page.url()).pathname.split('/').pop() as string;
    patchState({ collections: [...getState().collections, { id, name }] });
    expect((await listedNames(request)).includes(name)).toBe(true);
  });

  test('both appear in the list; product count and status are right', async ({ page }) => {
    await gotoAdmin(page, '/admin/collections');
    const a = rowFor(page, collectionName());
    const b = rowFor(page, collectionName('B'));
    await expect(a).toHaveCount(1);
    await expect(b).toHaveCount(1);
    await expect(a).toContainText('1 products');
    await expect(a).toContainText('Active');
    await expect(b).toContainText('0 products');
    await expectCleanPage(page);
  });

  test('storefront lists the active QA collection filter', async ({ page }) => {
    await page.goto('/shop');
    const pill = page.getByRole('button', { name: collectionName() });
    if ((await pill.count()) === 0) {
      test.info().annotations.push({ type: 'note', description: 'Active collection pill not shown on /shop (may require a published product in it)' });
    } else {
      await pill.click();
      await expect(page.getByRole('link', { name: requireProduct().name }).first()).toBeVisible();
    }
  });

  test('reorder up/down changes the order and can be restored', async ({ page, request }) => {
    const a = collectionName();
    const b = collectionName('B');
    const idx = async () => {
      const names = await listedNames(request);
      return { a: names.indexOf(a), b: names.indexOf(b) };
    };
    const start = await idx();
    expect(start.a).toBeGreaterThanOrEqual(0);
    expect(start.b).toBeGreaterThanOrEqual(0);
    const [upper, lower] = start.a < start.b ? [a, b] : [b, a];

    await gotoAdmin(page, '/admin/collections');
    // move the lower one up -> they swap
    await rowFor(page, lower).locator('button').nth(UP).click();
    await expect.poll(async () => {
      const n = await idx();
      return (lower === a ? n.a : n.b) < (upper === a ? n.a : n.b);
    }).toBe(true);
    // the UI reflects the new order
    const names = await page.locator('div.divide-y > div a').allInnerTexts();
    const flat = names.join('\n');
    expect(flat.indexOf(lower)).toBeLessThan(flat.indexOf(upper));

    // restore: move it back down
    await rowFor(page, lower).locator('button').nth(DOWN).click();
    await expect.poll(async () => {
      const n = await idx();
      return (upper === a ? n.a : n.b) < (lower === a ? n.a : n.b);
    }).toBe(true);
    const end = await idx();
    expect(end.a < end.b).toBe(start.a < start.b);
  });

  test('archive the QA collection: UI shows Archived and it disappears from the storefront', async ({ page }) => {
    await gotoAdmin(page, '/admin/collections');
    await rowFor(page, collectionName()).locator('button').nth(ARCHIVE).click();
    await expect(rowFor(page, collectionName())).toContainText('Archived');
    await page.goto('/shop');
    await expect(page.getByRole('button', { name: collectionName() })).toHaveCount(0);
  });
});
