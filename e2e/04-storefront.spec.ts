import { test, expect, type Page } from '@playwright/test';
import {
  QA_CUSTOMER,
  allMoney,
  blockRazorpay,
  configureAndAddToCart,
  customSelect,
  customTextInput,
  expectCleanPage,
  expectedUnitPrice,
  parseMoney,
  productPrice,
  quote,
  requireProduct,
  runTag,
  testCartItem,
} from './helpers';

const p = () => requireProduct();
const drawerLoc = (page: Page) => page.locator('div[class*="z-[90]"]');

async function fillCheckoutForm(page: Page) {
  const c = QA_CUSTOMER();
  const field = (label: string) => page.locator('label', { hasText: label }).locator('xpath=following-sibling::input[1]');
  await field('Full Name').fill(c.name);
  await field('Email Address').fill(c.email);
  await field('Street Address').fill(c.street);
  await field('City').fill(c.city);
  await field('State').fill(c.state);
  await field('PIN Code').fill(c.pincode);
  await field('Phone Number').fill(c.phone);
}

test.describe('04 storefront', () => {
  test('product is visible in /shop and at /shop/<slug>', async ({ page }) => {
    await page.goto('/shop');
    await page.getByPlaceholder('SEARCH CATALOG...').fill(runTag());
    const link = page.getByRole('link', { name: p().name }).first();
    await expect(link).toBeVisible();
    await expectCleanPage(page);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/shop/${p().slug}$`));
    await expect(page.getByRole('heading', { level: 1, name: p().name })).toBeVisible();
    await expect(page.getByText('Size', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Engraving text').first()).toBeVisible();
    await expect(page.getByText('Finish', { exact: true }).first()).toBeVisible();
    await expectCleanPage(page);
  });

  test('admin cost data is not leaked into the public product page', async ({ request }) => {
    const res = await request.get(`/shop/${p().slug}`);
    const html = await res.text();
    expect(html).not.toMatch(/businessCosts|filamentCostPerGram|filamentGrams|ledElectronicsCost/);
  });

  test('variant change updates the price; required customization blocks add-to-cart', async ({ page }) => {
    const prod = p();
    await page.goto(`/shop/${prod.slug}`);
    const price = productPrice(page);
    // default = first variant (Small, +0)
    await expect(price).toContainText('₹');
    expect(parseMoney(await price.innerText())).toBe(expectedUnitPrice(prod, 0, false));

    await page.getByRole('button', { name: new RegExp(`^${prod.variants[1].name}`) }).click();
    await expect.poll(async () => parseMoney(await price.innerText())).toBe(expectedUnitPrice(prod, 1, false));

    // required validation: nothing filled -> blocked
    await page.getByRole('button', { name: 'Add To Cart' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Please complete' })).toBeVisible();
    await expect(page.getByText(`${prod.textFieldLabel} is required.`)).toBeVisible();
    await expect(page.getByText(`${prod.selectFieldLabel} is required.`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your Cart' })).toHaveCount(0);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).not.toContain(prod.id);

    // filling only one required field is still blocked
    await customTextInput(page).fill('QA ENGRAVING');
    await expect.poll(async () => parseMoney(await price.innerText())).toBe(expectedUnitPrice(prod, 1, true));
    await page.getByRole('button', { name: 'Add To Cart' }).click();
    await expect(page.getByText(`${prod.selectFieldLabel} is required.`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your Cart' })).toHaveCount(0);
  });

  test('add to cart -> price matches server quote -> cart persists -> checkout reaches payment step without charging', async ({ page, request }) => {
    const prod = p();
    const rz = await blockRazorpay(page);
    let quoted = 0;

    await test.step('configure + add', async () => {
      await configureAndAddToCart(page, prod);
      const drawer = drawerLoc(page);
      await expect(drawer).toContainText(prod.name);
      await expect(drawer).toContainText(`Size: ${prod.variants[1].name}`);
      await expect(drawer).toContainText(`${prod.textFieldLabel}:`);
      await expect(drawer).toContainText('QA ENGRAVING');
      await expect(drawer).toContainText(prod.selectChoices[0]);
    });

    await test.step('cart total equals server quote', async () => {
      const q = await quote(request, [testCartItem(prod)]);
      quoted = q.total;
      test.info().annotations.push({ type: 'quote-source', description: q.source });
      const totalRow = drawerLoc(page).locator('div.flex.justify-between', { hasText: 'Estimated Total' }).last();
      const shown = allMoney(await totalRow.innerText())[0];
      expect(shown, 'drawer Estimated Total vs server quote').toBe(q.total);
      // unit price shown for the line = base + variant + fee
      const lineMoney = allMoney(await drawerLoc(page).locator('.flex-1.space-y-1').first().innerText());
      expect(lineMoney).toContain(expectedUnitPrice(prod, 1, true));
    });

    await test.step('cart persists across reload', async () => {
      await page.reload();
      await page.getByRole('button', { name: 'View Cart' }).click();
      const drawer = drawerLoc(page);
      await expect(drawer).toContainText(`Size: ${prod.variants[1].name}`);
      await expect(drawer).toContainText('QA ENGRAVING');
    });

    await test.step('checkout page: summary matches quote, payment step reachable, Razorpay never opens', async () => {
      await page.getByRole('link', { name: /Proceed to Checkout/ }).click();
      await expect(page).toHaveURL(/\/checkout$/);
      await expect(page.getByRole('heading', { name: 'Complete Your Order' })).toBeVisible();
      await expect(page.getByText(/Order Summary \(1 Objects\)/)).toBeVisible();
      await expect(page.getByRole('heading', { name: /2\. Payment Option/ })).toBeVisible();
      await fillCheckoutForm(page);

      const prepaid = page.getByRole('radio').first();
      await expect(prepaid).toBeChecked();
      const cod = page.getByRole('radio').nth(1);
      if (await cod.isEnabled()) {
        test.info().annotations.push({ type: 'note', description: 'COD is enabled for a customizable product (customProductsPrepaidOnly=false on this deployment)' });
      } else {
        await expect(page.getByText(/Disabled for customized items|prepaid-only|currently unavailable/)).toBeVisible();
      }

      const place = page.getByRole('button', { name: /^Place Order/ });
      await expect(place).toBeEnabled();
      expect(allMoney(await place.innerText())[0], 'Place Order button total vs quote').toBe(quoted);
      const est = page.locator('div.flex.justify-between', { hasText: 'Estimated Total' }).last();
      expect(allMoney(await est.innerText())[0]).toBe(quoted);

      // We intentionally STOP here: no order is placed from this spec and no payment is started.
      expect(await page.evaluate(() => typeof (window as unknown as { Razorpay?: unknown }).Razorpay)).toBe('undefined');
      await expect(page.locator('iframe[src*="razorpay"]')).toHaveCount(0);
      expect(rz.completed(), 'a Razorpay request completed').toBe(0);
      await expectCleanPage(page);
    });
  });

  test('empty-cart checkout shows an empty state', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Your Checkout Cart is Empty')).toBeVisible();
  });
});
