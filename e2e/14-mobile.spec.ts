import { test, expect, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import {
  SHOT_DIR,
  blockRazorpay,
  configureAndAddToCart,
  ensureDir,
  noHorizontalOverflow,
  requireOrder,
  requireProduct,
  runTag,
  settle,
} from './helpers';

/**
 * Responsive QA at 390 / 430 / 768 / 1440. Assertions are soft so every page at every width is examined and reported.
 * Screenshots (e2e/screenshots, git-ignored) are taken for non-login pages only.
 */
const WIDTHS = [390, 430, 768, 1440] as const;

async function inViewport(page: Page, loc: Locator, what: string) {
  await loc.first().scrollIntoViewIfNeeded();
  const box = await loc.first().boundingBox();
  const vw = page.viewportSize()!.width;
  expect.soft(box, `${what}: has a box`).not.toBeNull();
  if (box) {
    expect.soft(box.x, `${what}: left edge on screen`).toBeGreaterThanOrEqual(-1);
    expect.soft(box.x + box.width, `${what}: right edge within ${vw}px`).toBeLessThanOrEqual(vw + 1);
  }
  await expect.soft(loc.first(), `${what}: clickable`).toBeEnabled();
  await loc.first().click({ trial: true }).catch((e) => {
    expect.soft(false, `${what}: not clickable (${String(e.message).split('\n')[0]})`).toBe(true);
  });
}

async function checkPage(page: Page, width: number, name: string, url?: string) {
  if (url) await page.goto(url);
  await settle(page);
  const o = await noHorizontalOverflow(page);
  expect.soft(o.ok, `[${width}px] ${name}: horizontal overflow (scrollWidth ${o.scrollWidth} > innerWidth ${o.innerWidth})`).toBe(true);
  ensureDir(SHOT_DIR);
  await page.screenshot({ path: path.join(SHOT_DIR, `${width}-${name}.png`), fullPage: false });
}

for (const width of WIDTHS) {
  test.describe(`viewport ${width}px`, () => {
    test.use({ viewport: { width, height: width >= 1024 ? 900 : 844 } });

    test('storefront: home, shop, product, cart drawer, checkout', async ({ page }) => {
      const p = requireProduct();
      await blockRazorpay(page);

      await checkPage(page, width, 'home', '/');
      await inViewport(page, page.getByRole('button', { name: 'View Cart' }), 'header cart button');

      await checkPage(page, width, 'shop', '/shop');
      await inViewport(page, page.getByPlaceholder('SEARCH CATALOG...'), 'shop search');
      await page.getByPlaceholder('SEARCH CATALOG...').fill(runTag());
      await inViewport(page, page.getByRole('link', { name: p.name }), 'product card link');

      await checkPage(page, width, 'product', `/shop/${p.slug}`);
      await inViewport(page, page.getByRole('button', { name: 'Add To Cart' }), 'Add To Cart');
      await inViewport(page, page.getByRole('button', { name: new RegExp(`^${p.variants[0].name}`) }), 'variant button');

      await configureAndAddToCart(page, p);
      await checkPage(page, width, 'cart');
      await inViewport(page, page.getByRole('link', { name: /Proceed to Checkout/ }), 'Proceed to Checkout');

      await page.getByRole('link', { name: /Proceed to Checkout/ }).click();
      await page.waitForURL(/\/checkout$/);
      await checkPage(page, width, 'checkout');
      await inViewport(page, page.getByRole('button', { name: /^Place Order/ }), 'Place Order');
      await inViewport(page, page.locator('label', { hasText: 'Full Name' }).locator('xpath=following-sibling::input[1]'), 'checkout name field');
      // never place the order from this spec
    });

    test('admin: dashboard, product editor, order detail, site editor, media', async ({ page }) => {
      const p = requireProduct();
      const o = requireOrder();

      await checkPage(page, width, 'admin-dashboard', '/admin');
      await expect.soft(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
      if (width < 1024) {
        const menu = page.getByRole('button', { name: 'Open menu' });
        await inViewport(page, menu, 'admin menu button');
        await menu.click();
        await expect.soft(page.getByRole('link', { name: 'Orders', exact: true })).toBeVisible();
        await expect.soft(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
        await page.getByRole('button', { name: 'Close menu' }).first().click();
      } else {
        await expect.soft(page.getByRole('navigation', { name: 'Admin' })).toBeVisible();
        await expect.soft(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
      }

      await checkPage(page, width, 'admin-product-editor', `/admin/products/${p.id}`);
      await expect.soft(page.getByLabel('Name *', { exact: true })).toHaveValue(p.name);
      await inViewport(page, page.getByRole('button', { name: 'Save changes' }), 'Save changes');

      await checkPage(page, width, 'admin-order-detail', `/admin/orders/${o.id}`);
      await expect.soft(page.getByRole('heading', { name: `Order ${o.orderNumber}` })).toBeVisible();
      await inViewport(page, page.getByRole('button', { name: 'Save shipping' }), 'Save shipping');

      await checkPage(page, width, 'admin-site-editor', '/admin/site-editor');
      await expect.soft(page.getByText('HOMEPAGE SECTIONS')).toBeVisible();
      await inViewport(page, page.getByRole('button', { name: 'Save Section Draft' }).first(), 'Save Section Draft');

      await checkPage(page, width, 'admin-media', '/admin/media');
      await expect.soft(page.getByRole('heading', { name: 'Media library', level: 1 })).toBeVisible();
      await inViewport(page, page.getByText('Upload image / video'), 'media upload button');
    });
  });
}
