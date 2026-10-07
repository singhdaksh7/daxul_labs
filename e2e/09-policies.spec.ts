import { test, expect } from '@playwright/test';
import { AUTH_FILE, adminGet, adminSend, expectCleanPage, gotoAdmin, publicHtml, readOriginal, runTag } from './helpers';

test.describe.configure({ mode: 'serial' });

const SLUG = 'returns';
let touched = false;

test.describe('09 policies', () => {
  test.afterAll(async ({ playwright, baseURL }) => {
    if (!touched) return;
    const ctx = await playwright.request.newContext({ baseURL, storageState: AUTH_FILE });
    try {
      const o = readOriginal().policies.find((p) => p.slug === SLUG)!;
      await adminSend(ctx, 'PUT', '/api/admin/policies', { slug: SLUG, title: o.title, content: o.content });
    } finally {
      await ctx.dispose();
    }
  });

  test('edit the returns policy; public page shows the marker; raw HTML is stripped', async ({ page, request }) => {
    const orig = readOriginal().policies.find((p) => p.slug === SLUG);
    expect(orig, 'returns policy exists in the original capture').toBeTruthy();
    const mk = `QA policy marker ${runTag()}`;

    await gotoAdmin(page, '/admin/policies');
    await page.getByRole('button', { name: SLUG, exact: true }).click();
    const ta = page.getByLabel(/^Content \(markdown\)/);
    await expect(ta).toHaveValue(orig!.content);
    touched = true;
    await ta.fill(`${orig!.content}\n\n${mk}\n\n<script>window.__qa_policy_xss=1</script>`);
    // live preview is rendered through the safe renderer: no script executes
    await page.getByRole('button', { name: 'Save policy' }).click();
    await expect(page.getByRole('status')).toContainText('Saved.');
    await expect(page.getByRole('status')).toContainText('Raw HTML was removed');

    const saved = (await adminGet(request, '/api/admin/policies')).body.policies.find((p: any) => p.slug === SLUG);
    expect(saved.content).toContain(mk);
    expect(saved.content).not.toContain('<script');

    await page.goto(`/policies/${SLUG}`);
    await expect(page.getByText(mk)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__qa_policy_xss)).toBeUndefined();
    const html = await publicHtml(`/policies/${SLUG}`);
    expect(html).not.toContain('<script>window.__qa_policy_xss');
    await expectCleanPage(page);
  });

  test('restore the original text exactly', async ({ page, request }) => {
    const orig = readOriginal().policies.find((p) => p.slug === SLUG)!;
    await gotoAdmin(page, '/admin/policies');
    await page.getByRole('button', { name: SLUG, exact: true }).click();
    const ta = page.getByLabel(/^Content \(markdown\)/);
    await ta.fill(orig.content);
    await page.getByRole('button', { name: 'Save policy' }).click();
    await expect(page.getByRole('status')).toContainText('Saved.');

    const now = (await adminGet(request, '/api/admin/policies')).body.policies.find((p: any) => p.slug === SLUG);
    expect(now.content).toBe(orig.content);
    expect(now.title).toBe(orig.title);
    touched = false;
    await page.goto(`/policies/${SLUG}`);
    await expect(page.locator('body')).not.toContainText(`QA policy marker ${runTag()}`);
  });

  test('every policy page renders', async ({ page }) => {
    for (const p of readOriginal().policies) {
      const res = await page.goto(`/policies/${p.slug}`);
      expect(res?.status(), p.slug).toBe(200);
      await expectCleanPage(page);
    }
  });
});
