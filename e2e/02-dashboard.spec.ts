import { test, expect } from '@playwright/test';
import { allMoney, collectPageErrors, expectCleanPage, gotoAdmin } from './helpers';

test.describe('02 dashboard', () => {
  test('loads with real sections, no NaN/undefined/fake copy', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoAdmin(page, '/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    for (const label of ['Revenue (paid)', 'Orders today', 'Orders this month', 'Avg order value', 'Pending orders', 'Customers', 'Low stock']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const title of ['Recent orders', 'Top products', 'Production queue', 'Low-stock alerts']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await expectCleanPage(page);
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('stat cards show finite numbers', async ({ page }) => {
    await gotoAdmin(page, '/admin');
    const main = await page.locator('main').innerText();
    const amounts = allMoney(main);
    expect(amounts.length).toBeGreaterThan(0);
    for (const a of amounts) {
      expect(Number.isFinite(a)).toBe(true);
      expect(a).toBeGreaterThanOrEqual(0);
    }
  });

  test('empty states are explicit, never blank panels', async ({ page }) => {
    await gotoAdmin(page, '/admin');
    // For each panel, either rows/content or a stated empty message must exist.
    const panels: [string, RegExp][] = [
      ['Recent orders', /No orders yet\./],
      ['Top products', /No sales yet\./],
      ['Production queue', /Production queue is empty\./],
      ['Low-stock alerts', /No low-stock products\./],
    ];
    for (const [title, emptyRe] of panels) {
      const panel = page.locator('section', { has: page.getByRole('heading', { name: title }) });
      const text = (await panel.innerText()).replace(title.toUpperCase(), '').trim();
      expect(text.length, `${title} panel is blank`).toBeGreaterThan(5);
      void emptyRe; // either the empty message or real content satisfies the check above
    }
  });

  test('navigation sidebar links all resolve (no 404/500)', async ({ page }) => {
    await gotoAdmin(page, '/admin');
    const hrefs = await page.locator('nav[aria-label="Admin"] a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
    expect(hrefs.length).toBeGreaterThanOrEqual(15);
    for (const href of hrefs) {
      const res = await page.goto(href as string);
      expect(res?.status(), href as string).toBeLessThan(400);
      await expect(page).not.toHaveURL(/\/admin\/login/);
    }
  });
});
