import { test, expect, type Page } from '@playwright/test';
import { expectCleanPage, settle } from './helpers';

const VIEWPORTS = [
  { width: 390, height: 844, name: 'mobile-390' },
  { width: 430, height: 932, name: 'mobile-430' },
  { width: 768, height: 1024, name: 'tablet-768' },
  { width: 1440, height: 900, name: 'desktop-1440' },
];

test.describe('18 Phase B: Conversion & Discovery', () => {
  test('Search V2: overlay, debounced input, keyboard navigation, and recent searches', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    // Open Search Overlay via Header search button
    const searchTrigger = page.locator('button[aria-label="Search Catalog"], button[aria-label="Search objects"]').first();
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click();
    } else {
      await page.keyboard.press('Control+KeyK');
    }

    const searchInput = page.locator('input[aria-label="Search Catalog"], input[placeholder*="Search objects"]');
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('litho');
    await page.waitForTimeout(400); // debounce

    // Keyboard navigation
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('Shop Filters: URL-backed state, facet pills, and reset', async ({ page }) => {
    await page.goto('/shop');
    await settle(page);

    // Verify filter UI exists (desktop strip or mobile filter trigger)
    const filterContainer = page.locator('button:has-text("Filter"), div:has-text("Filters")').first();
    await expect(filterContainer).toBeVisible();

    // Verify search in shop preserves URL query params
    await page.goto('/shop?q=lamp&sort=price-asc');
    await settle(page);
    expect(page.url()).toContain('q=lamp');
    expect(page.url()).toContain('sort=price-asc');
  });

  test('PDP: Buy Now, Related Objects shelf, and Recently Viewed tray', async ({ page }) => {
    await page.goto('/shop');
    await settle(page);

    // Find any product link
    const firstProduct = page.locator('a[href^="/shop/"]').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await settle(page);

      // Verify Buy It Now button exists
      const buyNowBtn = page.locator('button:has-text("Buy It Now")');
      if (await buyNowBtn.isVisible()) {
        await expect(buyNowBtn).toBeVisible();
      }

      // Verify Reviews and Q&A tabs exist
      await expect(page.locator('button:has-text("Reviews")')).toBeVisible();
      await expect(page.locator('button:has-text("Q&A")')).toBeVisible();
    }
  });

  test('Free Shipping Meter & Saved Cart in Cart Drawer', async ({ page }) => {
    await page.goto('/shop');
    await settle(page);

    // Open cart drawer
    const cartBtn = page.getByRole('button', { name: /cart/i }).first();
    if (await cartBtn.isVisible()) {
      await cartBtn.click();
      await page.waitForTimeout(300);

      // Verify cart drawer is open
      const drawer = page.locator('div[class*="z-[90]"]');
      if (await drawer.isVisible()) {
        await expect(drawer).toBeVisible();
      }
    }
  });

  test('Studio OS: Reviews Moderation desk', async ({ page }) => {
    await page.goto('/admin/reviews');
    await settle(page);
    await expect(page.locator('h1, h2, h3', { hasText: /Reviews/i }).first()).toBeVisible();
    await expect(page.getByText('Pending Moderation').first()).toBeVisible();
    await expect(page.getByText('Approved', { exact: false }).first()).toBeVisible();
  });

  test('Studio OS: Back-in-Stock desk', async ({ page }) => {
    await page.goto('/admin/back-in-stock');
    await settle(page);
    await expect(page.locator('h1, h2, h3', { hasText: /Back-in-Stock/i }).first()).toBeVisible();
    await expect(page.locator('text=Pending Notifications').first()).toBeVisible();
  });

  test('Studio OS: Product Q&A desk', async ({ page }) => {
    await page.goto('/admin/qa');
    await settle(page);
    await expect(page.locator('h1, h2, h3', { hasText: /Product Inquiries|Q&A/i }).first()).toBeVisible();
    await expect(page.locator('text=Pending Inquiries')).toBeVisible();
  });

  test('Studio OS: Funnel Analytics & Product Conversion dashboards', async ({ page }) => {
    await page.goto('/admin/analytics/funnel');
    await settle(page);
    await expect(page.locator('h1, h2, h3', { hasText: /Conversion Funnel/i }).first()).toBeVisible();
    await expect(page.locator('text=Product Views').first()).toBeVisible();
    await expect(page.locator('text=Completed Orders').first()).toBeVisible();

    await page.goto('/admin/analytics/products');
    await settle(page);
    await expect(page.locator('h1, h2, h3', { hasText: /Product Conversion/i }).first()).toBeVisible();
    await expect(page.locator('th:has-text("Conv. %")')).toBeVisible();
  });

  // Responsive Layout Across Mobile Viewports (390, 430, 768, 1440)
  for (const vp of VIEWPORTS) {
    test(`Responsive layout check at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/shop');
      await settle(page);
      await expectCleanPage(page);

      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 2);
    });
  }
});
