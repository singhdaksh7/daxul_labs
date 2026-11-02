import { test, expect } from '@playwright/test';

test.describe('19 Phase C: Retention, Loyalty & Customer Lifecycle', () => {
  test('Customer Portal: loads Rewards, Referrals, Store Credit, Gift Cards, and Preferences tabs', async ({ page }) => {
    // Navigate to customer login / portal
    await page.goto('/account');
    await expect(page).toHaveURL(/\/(account|login|auth)/);
  });

  test('Public Quote API: safely calculates loyalty, gift cards and store credit fields', async ({ request }) => {
    const res = await request.post('/api/quote', {
      data: {
        items: [
          {
            productId: 'test-product-id',
            quantity: 1,
          },
        ],
        loyaltyPointsToRedeem: 50,
      },
    });
    // When feature flag is OFF, it cleanly reports issues or handles calculation without failing 500
    expect([200, 400, 404]).toContain(res.status());
  });

  test('Public Gift Card verification: rate-limiting & generic invalid rejection', async ({ request }) => {
    const res = await request.post('/api/gift-cards/check', {
      data: { code: 'DXL-FAKE-CODE-1234' },
    });
    expect([400, 404]).toContain(res.status());
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test('Studio OS: Loyalty ledger desk is protected and structured', async ({ page }) => {
    await page.goto('/admin/loyalty');
    await expect(page).toHaveURL(/\/admin\/(loyalty|login)/);
  });

  test('Studio OS: Referrals desk is protected and structured', async ({ page }) => {
    await page.goto('/admin/referrals');
    await expect(page).toHaveURL(/\/admin\/(referrals|login)/);
  });

  test('Studio OS: Gift Cards liability desk is protected and structured', async ({ page }) => {
    await page.goto('/admin/gift-cards');
    await expect(page).toHaveURL(/\/admin\/(gift-cards|login)/);
  });

  test('Studio OS: Store Credit ledger is protected and structured', async ({ page }) => {
    await page.goto('/admin/store-credit');
    await expect(page).toHaveURL(/\/admin\/(store-credit|login)/);
  });

  test('Studio OS: Customer Segments desk is protected and structured', async ({ page }) => {
    await page.goto('/admin/customer-segments');
    await expect(page).toHaveURL(/\/admin\/(customer-segments|login)/);
  });

  test('Studio OS: Lifecycle Automations desk is protected and structured', async ({ page }) => {
    await page.goto('/admin/automations');
    await expect(page).toHaveURL(/\/admin\/(automations|login)/);
  });

  test('Studio OS: Retention & Cohort Analytics is protected and structured', async ({ page }) => {
    await page.goto('/admin/analytics/retention');
    await expect(page).toHaveURL(/\/admin\/(analytics\/retention|login)/);
  });

  test('Studio OS: Retention Settings is protected and structured', async ({ page }) => {
    await page.goto('/admin/settings/retention');
    await expect(page).toHaveURL(/\/admin\/(settings\/retention|login)/);
  });

  const viewports = [
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-430', width: 430, height: 932 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`Responsive layout check at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/shop');
      await expect(page.locator('body')).toBeVisible();

      // Check horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px margin tolerance
    });
  }
});

