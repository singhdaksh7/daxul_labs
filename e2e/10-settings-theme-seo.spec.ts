import { test, expect, type Page } from '@playwright/test';
import {
  AUTH_FILE,
  acceptDialogs,
  adminGet,
  adminSend,
  expectCleanPage,
  gotoAdmin,
  publicHtml,
  readOriginal,
  runTag,
  stripVolatile,
} from './helpers';

test.describe.configure({ mode: 'serial' });

const touched = { settings: false, theme: false, seo: false };
// the admin forms turn null into '' on save; treat them as equal
const norm = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(stripVolatile(o)).map(([k, v]) => [k, v === null ? '' : v]));
const mk = () => `QA${runTag().replace(/\D/g, '').slice(-6)}`;

test.describe('10 settings / theme / SEO', () => {
  test.afterAll(async ({ playwright, baseURL }) => {
    if (!touched.settings && !touched.theme && !touched.seo) return;
    const ctx = await playwright.request.newContext({ baseURL, storageState: AUTH_FILE });
    try {
      const o = readOriginal();
      if (touched.settings) await adminSend(ctx, 'PUT', '/api/admin/settings', o.settings);
      if (touched.theme) {
        const t = o.theme as Record<string, unknown>;
        await adminSend(ctx, 'PUT', '/api/admin/theme', {
          accentColor: t.accentColor, carbonColor: t.carbonColor, boneColor: t.boneColor,
          graphiteColor: t.graphiteColor, buttonRadius: t.buttonRadius, borderRadius: t.borderRadius,
        });
      }
      if (touched.seo) await adminSend(ctx, 'PUT', '/api/admin/seo', o.seo);
    } finally {
      await ctx.dispose();
    }
  });

  /* ------------------------------ settings ------------------------------ */
  test('settings: change support hours + announcement text, verify storefront, restore', async ({ page, request }) => {
    const o = readOriginal().settings as Record<string, any>;
    const m = mk();
    const hours = `${o.supportHours ?? ''} ${m}`.trim();
    const announce = `${o.announcementBarText ?? ''} ${m}`.trim();

    await gotoAdmin(page, '/admin/settings');
    await expect(page.getByLabel('Support hours', { exact: true })).toHaveValue(String(o.supportHours ?? ''));
    touched.settings = true;
    await page.getByLabel('Support hours', { exact: true }).fill(hours);
    await page.getByLabel('Announcement bar text', { exact: true }).fill(announce);
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toContainText('Saved:');
    await expect(page.getByRole('status')).toContainText('supportHours');

    const api = (await adminGet(request, '/api/admin/settings')).body.settings;
    expect(api.supportHours).toBe(hours);

    // Storefront gets settings from PostgreSQL on every request (also serialised into the page payload).
    const html = await publicHtml('/');
    expect(html, 'marker present in storefront HTML/payload').toContain(m);
    if (o.announcementBarEnabled) {
      await page.goto('/');
      await expect(page.getByText(announce).first()).toBeVisible();
    }

    // restore
    await gotoAdmin(page, '/admin/settings');
    await page.getByLabel('Support hours', { exact: true }).fill(String(o.supportHours ?? ''));
    await page.getByLabel('Announcement bar text', { exact: true }).fill(String(o.announcementBarText ?? ''));
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toContainText('Saved');
    const after = (await adminGet(request, '/api/admin/settings')).body.settings;
    expect(norm(after)).toEqual(norm(o));
    expect(await publicHtml('/')).not.toContain(m);
    touched.settings = false;
  });

  test('settings page does not expose secrets', async ({ page }) => {
    await gotoAdmin(page, '/admin/settings');
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/rzp_(live|test)_[A-Za-z0-9]+|postgres(ql)?:\/\/|AKIA[0-9A-Z]{12,}|sk_live_/);
    await expectCleanPage(page);
  });

  /* ------------------------------- theme -------------------------------- */
  const cssVar = (page: Page, name: string) =>
    page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase(), name);
  const accentInput = (page: Page) =>
    page.locator('label').filter({ hasText: 'Accent (Electric Lime)' }).locator('input:not([type="color"])');

  test('theme: accent + radius preset reach the storefront CSS vars; Reset to DAXUL default; original restored', async ({ page, request }) => {
    const o = readOriginal().theme as Record<string, string>;
    acceptDialogs(page);
    await gotoAdmin(page, '/admin/theme');
    await expect(accentInput(page)).toHaveValue(o.accentColor);
    touched.theme = true;

    await accentInput(page).fill('#FF00AA');
    await page.getByLabel('Button radius').selectOption('none');
    await page.getByLabel('Card radius').selectOption('full');
    await page.getByRole('button', { name: 'Save theme' }).click();
    await expect(page.getByRole('status')).toContainText('Theme saved.');

    await page.goto('/');
    expect(await cssVar(page, '--daxul-lime')).toBe('#ff00aa');
    expect(await cssVar(page, '--daxul-button-radius')).toBe('0px');
    expect(await cssVar(page, '--daxul-card-radius')).toBe('9999px');
    await expectCleanPage(page);

    // Reset to the DAXUL default
    await gotoAdmin(page, '/admin/theme');
    await page.getByRole('button', { name: 'Reset to DAXUL default' }).click();
    await expect(page.getByRole('status')).toContainText('Restored DAXUL defaults.');
    await page.goto('/');
    expect(await cssVar(page, '--daxul-lime')).toBe('#c8ff35');
    expect(await cssVar(page, '--daxul-black')).toBe('#0b0b0c');

    // If the pre-test theme was customised, put exactly that back
    await gotoAdmin(page, '/admin/theme');
    const cur = (await adminGet(request, '/api/admin/theme')).body.theme;
    if (JSON.stringify(stripVolatile(cur)) !== JSON.stringify(stripVolatile(o))) {
      const colors: [string, string][] = [
        ['Accent (Electric Lime)', o.accentColor], ['Carbon', o.carbonColor], ['Bone', o.boneColor], ['Graphite', o.graphiteColor],
      ];
      for (const [label, v] of colors) {
        await page.locator('label').filter({ hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) }).locator('input:not([type="color"])').fill(v);
      }
      await page.getByLabel('Button radius').selectOption(o.buttonRadius);
      await page.getByLabel('Card radius').selectOption(o.borderRadius);
      await page.getByRole('button', { name: 'Save theme' }).click();
      await expect(page.getByRole('status')).toContainText('Theme saved.');
    }
    const fin = (await adminGet(request, '/api/admin/theme')).body.theme;
    expect(stripVolatile(fin)).toEqual(stripVolatile(o));
    touched.theme = false;
    await page.goto('/');
    expect(await cssVar(page, '--daxul-lime')).toBe(String(o.accentColor).toLowerCase());
  });

  test('theme: invalid colours are rejected by the form and the API', async ({ page, request }) => {
    await gotoAdmin(page, '/admin/theme');
    await accentInput(page).fill('not-a-colour');
    await expect(page.getByRole('button', { name: 'Save theme' })).toBeDisabled();
    const r = await adminSend(request, 'PUT', '/api/admin/theme', { accentColor: 'url(javascript:alert(1))', carbonColor: '#000000', boneColor: '#ffffff', graphiteColor: '#222222', buttonRadius: 'md', borderRadius: 'md' });
    expect(r.status).toBe(400);
  });

  /* -------------------------------- SEO --------------------------------- */
  test('SEO: change the site title, verify <title>, restore', async ({ page, request }) => {
    const o = readOriginal().seo as Record<string, any>;
    const m = mk();
    const title = `${String(o.seoTitle).slice(0, 100)} ${m}`;
    await gotoAdmin(page, '/admin/seo');
    await expect(page.getByLabel(/^Site title/)).toHaveValue(String(o.seoTitle));
    touched.seo = true;
    await page.getByLabel(/^Site title/).fill(title);
    await page.getByRole('button', { name: 'Save SEO' }).click();
    await expect(page.getByRole('status')).toContainText('SEO settings saved.');

    const html = await publicHtml('/');
    const t = html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? '';
    expect(t).toContain(m);
    expect(html).toMatch(new RegExp(`property="og:title"[^>]*content="[^"]*${m}`));

    await gotoAdmin(page, '/admin/seo');
    await page.getByLabel(/^Site title/).fill(String(o.seoTitle));
    await page.getByRole('button', { name: 'Save SEO' }).click();
    await expect(page.getByRole('status')).toContainText('SEO settings saved.');
    const now = (await adminGet(request, '/api/admin/seo')).body.seo;
    expect(norm(now)).toEqual(norm(o));
    const html2 = await publicHtml('/');
    expect(html2).not.toContain(m);
    touched.seo = false;
  });

  test('SEO overview lists the QA product/collections without NaN', async ({ page }) => {
    await gotoAdmin(page, '/admin/seo');
    await expect(page.getByRole('heading', { name: /^Products \(/ })).toBeVisible();
    await expectCleanPage(page);
  });
});
