import { test, expect } from '@playwright/test';
import { adminEmail, adminPassword, runTag, secureFill } from './helpers';

// This spec exercises the login UI, so it starts with NO session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('01 auth', () => {
  test('unauthenticated /admin redirects to /admin/login?callbackUrl=...', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login\?.*callbackUrl=/);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get('callbackUrl') ?? '')).toContain('/admin');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('unauthenticated deep link keeps the callbackUrl', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/admin\/login\?.*callbackUrl=/);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get('callbackUrl') ?? '')).toContain('/admin/orders');
  });

  test('unauthenticated admin APIs are rejected', async ({ request }) => {
    for (const url of ['/api/admin/products', '/api/admin/orders', '/api/admin/settings', '/api/admin/audit']) {
      const res = await request.get(url, { maxRedirects: 0 });
      // middleware redirects to login (3xx) or returns 401/403; it must never be 200 with data
      expect([301, 302, 303, 307, 308, 401, 403], `${url} -> ${res.status()}`).toContain(res.status());
    }
  });

  test('invalid login shows "Invalid email or password."', async ({ page }) => {
    // Unknown address on purpose: failed attempts are rate-limited per email, so we must not burn the QA admin's budget.
    await page.goto('/admin/login');
    await page.locator('#email').fill(`nobody-${runTag().toLowerCase()}@daxul.invalid`);
    await page.locator('#password').fill('Definitely-Wrong-Password-1!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password.' })).toHaveText('Invalid email or password.');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('valid login reaches the dashboard, then Sign out returns to login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('#email').fill(adminEmail());
    await secureFill(page.locator('#password'), adminPassword());
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // logout via the sidebar "Sign out" button
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 30_000 });

    // session really gone
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login\?.*callbackUrl=/);
  });
});
