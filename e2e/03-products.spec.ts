import { test, expect } from '@playwright/test';
import { expectCleanPage, getProductFull, gotoAdmin, patchState, productName, requireProduct, runTag, inr, type ProductState } from './helpers';

const PRICE = 1000;
const STOCK = 10;
const THRESHOLD = 3;
const LARGE_ADJ = 200;
const TEXT_FEE = 150;

test.describe.configure({ mode: 'serial' });

test.describe('03 products', () => {
  test('create the QA test product through the admin UI', async ({ page }) => {
    const name = productName();
    const sku = `DTO-${runTag().replace(/\D/g, '')}`;
    await gotoAdmin(page, '/admin/products/new');
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();

    // Basics
    await page.getByLabel('Name *', { exact: true }).fill(name);
    await page.getByLabel('Subtitle', { exact: true }).fill('QA automated test object');
    await page.getByLabel('Description', { exact: true }).fill('Automated QA product. Safe to delete.');
    await expect(page.getByLabel('Slug')).not.toHaveValue('');
    const isActive = page.getByLabel('Active (visible in store)');
    await isActive.check();
    await expect(isActive).toBeChecked();

    // Pricing & inventory
    await page.getByLabel('Price (₹) *', { exact: true }).fill(String(PRICE));
    await page.getByLabel(/^SKU/).fill(sku);
    await page.getByLabel(/^Stock/).fill(String(STOCK));
    await page.getByLabel('Low-stock threshold').fill(String(THRESHOLD));
    await page.getByLabel('Customizable').check();

    // Variant group "Size" with two variants, one with a price adjustment
    await page.getByRole('button', { name: 'Add group' }).click();
    await page.getByPlaceholder('Group name (e.g. Size)').fill('Size');
    await page.getByRole('button', { name: 'Add variant' }).click();
    const names = page.getByPlaceholder('Name', { exact: true });
    await expect(names).toHaveCount(2);
    await names.nth(0).fill('Small');
    await names.nth(1).fill('Large');
    const rows = page.locator('div.grid').filter({ has: page.getByPlaceholder('SKU', { exact: true }) });
    await expect(rows).toHaveCount(2);
    await rows.nth(0).getByPlaceholder('SKU', { exact: true }).fill(`${sku}-S`);
    await rows.nth(1).getByPlaceholder('SKU', { exact: true }).fill(`${sku}-L`);
    await rows.nth(1).locator('input[type="number"]').first().fill(String(LARGE_ADJ));

    // Customization: required text field with a fee, required select field with choices
    await page.getByRole('button', { name: 'Add field' }).click();
    await page.getByRole('button', { name: 'Add field' }).click();
    const labels = page.getByPlaceholder('Label', { exact: true });
    await labels.nth(0).fill('Engraving text');
    await page.getByPlaceholder('Fee ₹').nth(0).fill(String(TEXT_FEE));
    await page.getByPlaceholder('Placeholder', { exact: true }).nth(0).fill('QA text');
    await labels.nth(1).fill('Finish');
    const typeSelects = page.locator('select').filter({ has: page.locator('option[value="textarea"]') });
    await expect(typeSelects).toHaveCount(2);
    await typeSelects.nth(1).selectOption('select');
    // select type auto-creates one blank choice row (field label inputs come first, choices follow)
    await labels.nth(2).fill('Matte');
    await page.getByRole('button', { name: 'Add choice' }).click();
    await labels.nth(3).fill('Gloss');
    const required = page.getByLabel('Required');
    await required.nth(0).check();
    await required.nth(1).check();

    await page.getByRole('button', { name: 'Create product' }).click();
    await page.waitForURL(/\/admin\/products\/(?!new)[^/]+$/, { timeout: 30_000 });
    const id = new URL(page.url()).pathname.split('/').pop() as string;

    // Verify persistence through the admin API and build the shared state for later specs
    const p = await getProductFull(page.request, id);
    expect(p.name).toBe(name);
    expect(p.price).toBe(PRICE);
    expect(p.stock).toBe(STOCK);
    expect(p.isActive).toBe(true);
    expect(p.isArchived).toBe(false);
    expect(p.variantGroups).toHaveLength(1);
    expect(p.variantGroups[0].name).toBe('Size');
    const variants = p.variantGroups[0].variants as { id: string; name: string; priceAdjustment: number }[];
    expect(variants.map((v) => v.name)).toEqual(['Small', 'Large']);
    expect(variants[1].priceAdjustment).toBe(LARGE_ADJ);
    const text = p.customFields.find((f: any) => f.label === 'Engraving text');
    const sel = p.customFields.find((f: any) => f.label === 'Finish');
    expect(text, 'text custom field saved').toBeTruthy();
    expect(text.required).toBe(true);
    expect(text.fee).toBe(TEXT_FEE);
    expect(sel, 'select custom field saved').toBeTruthy();
    expect(sel.required).toBe(true);
    expect(sel.type).toBe('select');
    const choices: string[] = (sel.choices as any[]).map((c) => (typeof c === 'string' ? c : (c.value ?? c.label)));
    expect(choices).toEqual(['Matte', 'Gloss']);

    const state: ProductState = {
      id,
      slug: p.slug,
      name,
      sku,
      price: PRICE,
      stock: STOCK,
      lowStockThreshold: THRESHOLD,
      groupId: p.variantGroups[0].id,
      variants: variants.map((v) => ({ id: v.id, name: v.name, priceAdjustment: v.priceAdjustment })),
      textFieldId: text.id,
      textFieldLabel: 'Engraving text',
      textFieldFee: TEXT_FEE,
      selectFieldId: sel.id,
      selectFieldLabel: 'Finish',
      selectChoices: choices,
    };
    patchState({ product: state });
  });

  test('edit the product and see the change persist', async ({ page }) => {
    const { id } = requireProduct();
    await gotoAdmin(page, `/admin/products/${id}`);
    await expect(page.getByLabel('Name *', { exact: true })).toHaveValue(productName());
    await page.getByLabel('Subtitle', { exact: true }).fill('QA subtitle edited');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Subtitle', { exact: true })).toHaveValue('QA subtitle edited');
    // variants and custom fields survived the round trip
    await expect(page.getByPlaceholder('Group name (e.g. Size)')).toHaveValue('Size');
    await expect(page.getByPlaceholder('Name', { exact: true })).toHaveCount(2);
    await expect(page.getByPlaceholder('Label', { exact: true }).first()).toHaveValue('Engraving text');
  });

  test('product is listed with correct price/stock/status', async ({ page }) => {
    await gotoAdmin(page, '/admin/products');
    await page.getByPlaceholder('Search name, SKU, slug').fill(runTag());
    const row = page.locator('tbody tr', { hasText: productName() });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Active');
    await expect(row).toContainText(inr(PRICE));
    await expect(row).toContainText('2 variants');
    await expect(row.locator('td').nth(4)).toHaveText(String(STOCK));
    await expectCleanPage(page);
  });
});
