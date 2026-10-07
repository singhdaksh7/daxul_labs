import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  AUTH_FILE,
  adminEmail,
  adminGet,
  adminSend,
  gotoAdmin,
  pollUntil,
  publicHtml,
  publicJson,
  readOriginal,
  runTag,
  settle,
  expectCleanPage,
} from './helpers';

/**
 * Site editor QA. IMPORTANT: Publish / visibility / reorder are LIVE on the storefront.
 *  - Every edit is a reversible suffix marker on one text field per section.
 *  - Sections that already have an unpublished draft (draft != published) are SKIPPED, because publishing would
 *    also publish someone else's pending draft. Sections that are hidden are skipped for the public-visibility checks.
 *  - An afterAll safety net restores any section still carrying a marker, using the originals captured before the run.
 * GET /api/cms/published is cached (~60s), hence the polling.
 */
type Key = 'HEADER' | 'HERO' | 'FEATURED_PRODUCT' | 'COLLECTIONS' | 'CUSTOMIZATION' | 'LAB' | 'BUILDING_DAXUL' | 'FOOTER';
const KEYS: Key[] = ['HEADER', 'HERO', 'FEATURED_PRODUCT', 'COLLECTIONS', 'CUSTOMIZATION', 'LAB', 'BUILDING_DAXUL', 'FOOTER'];
const FIELD: Record<Key, { label: string; path: string; published: string }> = {
  HEADER: { label: 'Logo Subtext Tagline', path: 'logoSubtext', published: 'header' },
  HERO: { label: 'Eyebrow Tagline', path: 'eyebrow', published: 'hero' },
  FEATURED_PRODUCT: { label: 'Section Badge', path: 'badge', published: 'featuredProduct' },
  COLLECTIONS: { label: 'Section Eyebrow', path: 'eyebrow', published: 'collections' },
  CUSTOMIZATION: { label: 'Section Headline', path: 'headline', published: 'customization' },
  LAB: { label: 'Badge Label', path: 'badgeText', published: 'lab' },
  BUILDING_DAXUL: { label: 'Heading', path: 'heading', published: 'buildingDaxul' },
  FOOTER: { label: 'Tagline', path: 'tagline', published: 'footer' },
};

const marker = (k: Key) => ` [${runTag()}-${k}]`;
const dirty = new Set<Key>();
let eligible: Key[] = [];
const originalValue: Partial<Record<Key, string>> = {};

test.describe.configure({ mode: 'serial' });
test.setTimeout(600_000);

async function sections(request: APIRequestContext) {
  const r = await adminGet(request, '/api/admin/cms/sections');
  expect(r.status).toBe(200);
  return r.body.sections as { sectionKey: Key; visible: boolean; sortOrder: number; draftContent: any; publishedContent: any; name: string }[];
}
const card = (page: Page, key: Key) => page.locator('aside div.cursor-pointer').filter({ has: page.getByText(key, { exact: true }) });
const input = (page: Page, key: Key) =>
  page.locator('label').filter({ hasText: new RegExp(`^${FIELD[key].label}$`) }).locator('xpath=following-sibling::input[1]');

async function openEditor(page: Page) {
  await gotoAdmin(page, '/admin/site-editor');
  await expect(page.getByText('HOMEPAGE SECTIONS')).toBeVisible();
  await expect(card(page, 'HERO')).toBeVisible();
}
async function selectSection(page: Page, key: Key) {
  await card(page, key).click();
  await expect(input(page, key)).toBeVisible();
}
const saveDraft = async (page: Page, key: Key) => {
  await page.getByRole('button', { name: 'Save Section Draft' }).first().click();
  await expect(page.getByText(`Saved draft for ${key}`)).toBeVisible();
};
const publish = async (page: Page, key: Key) => {
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText(`Published ${key} to live storefront!`)).toBeVisible();
};

test.describe('08 cms / site editor', () => {
  test.beforeAll(async () => {
    const orig = readOriginal();
    eligible = [];
    for (const k of KEYS) {
      const s = orig.cmsSections.find((x) => x.sectionKey === k);
      if (!s) continue;
      const same = JSON.stringify(s.draftContent) === JSON.stringify(s.publishedContent);
      if (same && s.visible) eligible.push(k);
    }
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    if (dirty.size === 0) return;
    // Safety net: put originals back through the same admin API the editor uses.
    const ctx = await playwright.request.newContext({ baseURL, storageState: AUTH_FILE });
    try {
      const orig = readOriginal();
      for (const k of [...dirty]) {
        const s = orig.cmsSections.find((x) => x.sectionKey === k)!;
        await adminSend(ctx, 'PUT', `/api/admin/cms/sections/${k}`, { draftContent: s.draftContent });
        await adminSend(ctx, 'POST', `/api/admin/cms/sections/${k}`, { action: 'publish' });
      }
      console.log(`[qa] safety-net restored CMS sections: ${[...dirty].join(', ')}`);
    } finally {
      await ctx.dispose();
    }
  });

  test('inventory of sections: all 8 exist; note which are skipped', async ({ request }) => {
    const secs = await sections(request);
    expect(secs.map((s) => s.sectionKey).sort()).toEqual([...KEYS].sort());
    const skipped = KEYS.filter((k) => !eligible.includes(k));
    test.info().annotations.push({ type: 'cms-skipped', description: skipped.length ? `Skipped (pending draft or hidden): ${skipped.join(', ')}` : 'none' });
    expect(eligible.length, 'no CMS section is eligible for edit testing').toBeGreaterThan(0);
  });

  test('edit one text field per section + Save Draft; public site is unchanged', async ({ page, request }) => {
    await openEditor(page);
    for (const key of eligible) {
      await test.step(`${key}: edit + save draft`, async () => {
        await selectSection(page, key);
        originalValue[key] = await input(page, key).inputValue();
        await input(page, key).fill(originalValue[key] + marker(key));
        await saveDraft(page, key);
        await expect(card(page, key)).toContainText('Draft Modified');
      });
    }
    // drafts hold the marker, published does not
    const secs = await sections(request);
    for (const key of eligible) {
      const s = secs.find((x) => x.sectionKey === key)!;
      expect(s.draftContent[FIELD[key].path]).toContain(marker(key));
      expect(JSON.stringify(s.publishedContent)).not.toContain(marker(key));
    }
    // public API + HTML: marker absent
    const pub = await publicJson('/api/cms/published');
    expect(pub.status).toBe(200);
    const html = await publicHtml('/');
    for (const key of eligible) {
      expect(JSON.stringify(pub.body)).not.toContain(marker(key));
      expect(html).not.toContain(marker(key));
    }
  });

  test('Publish each section; public API and storefront show the markers', async ({ page }) => {
    await openEditor(page);
    for (const key of eligible) {
      await test.step(`${key}: publish`, async () => {
        await selectSection(page, key);
        await publish(page, key);
        dirty.add(key);
        await expect(card(page, key)).toContainText('Published');
      });
    }
    await pollUntil(
      async () => {
        const { body } = await publicJson('/api/cms/published');
        return eligible.every((k) => (body[FIELD[k].published]?.[FIELD[k].path] ?? '').includes(marker(k)));
      },
      { message: 'published CMS content did not show all markers (published endpoint is cached ~60s)' },
    );
    // storefront render (client-side fetch of the published endpoint); informational per section
    const home = await page.context().newPage();
    await home.goto('/');
    await settle(home);
    const text = await home.locator('body').innerText();
    const html = await home.content();
    const notRendered: string[] = [];
    for (const k of eligible) if (!text.includes(marker(k).trim()) && !html.includes(marker(k).trim())) notRendered.push(k);
    if (notRendered.length) {
      test.info().annotations.push({ type: 'cms-not-rendered-on-home', description: `Field is published (API) but not visible on /: ${notRendered.join(', ')}` });
    }
    await expectCleanPage(home);
    await home.close();
  });

  test('restore originals; published content equals the pre-test capture exactly', async ({ page, request }) => {
    const orig = readOriginal();
    await openEditor(page);
    for (const key of eligible) {
      await test.step(`${key}: restore + save + publish`, async () => {
        await selectSection(page, key);
        await input(page, key).fill(originalValue[key] ?? '');
        await saveDraft(page, key);
        await publish(page, key);
      });
    }
    // draft == published == original (admin view, uncached)
    const secs = await sections(request);
    for (const key of eligible) {
      const s = secs.find((x) => x.sectionKey === key)!;
      const o = orig.cmsSections.find((x) => x.sectionKey === key)!;
      if (JSON.stringify(s.publishedContent) !== JSON.stringify(o.publishedContent)) {
        // UI round-trip added/changed a key (e.g. a previously absent field became ""). Restore exactly via the API and flag it.
        test.info().annotations.push({ type: 'cms-restore-note', description: `${key}: UI restore was not byte-identical; restored via API` });
        await adminSend(request, 'PUT', `/api/admin/cms/sections/${key}`, { draftContent: o.draftContent });
        await adminSend(request, 'POST', `/api/admin/cms/sections/${key}`, { action: 'publish' });
      }
    }
    const after = await sections(request);
    for (const key of eligible) {
      const s = after.find((x) => x.sectionKey === key)!;
      const o = orig.cmsSections.find((x) => x.sectionKey === key)!;
      expect(s.publishedContent, `${key} published content restored`).toEqual(o.publishedContent);
      expect(s.draftContent, `${key} draft restored`).toEqual(o.draftContent);
    }
    // public endpoint (cached) converges to the exact original document
    await pollUntil(async () => {
      const { body } = await publicJson('/api/cms/published');
      return JSON.stringify(body) === JSON.stringify(orig.cmsPublished);
    }, { message: 'public /api/cms/published did not converge to the original content' });
    dirty.clear();
  });

  test('visibility toggle hides/shows a section (restored immediately)', async ({ page, request }) => {
    const key: Key = eligible.includes('LAB') ? 'LAB' : eligible[eligible.length - 1];
    const before = (await sections(request)).find((s) => s.sectionKey === key)!;
    expect(before.visible).toBe(true);
    await openEditor(page);
    const toggle = card(page, key).getByTitle('Toggle Visibility');
    try {
      await toggle.click();
      await expect(toggle).toHaveText('HID');
      expect((await sections(request)).find((s) => s.sectionKey === key)!.visible).toBe(false);
      if (process.env.QA_CMS_PUBLIC_LIVE_TOGGLE !== '0') {
        await pollUntil(async () => (await publicJson('/api/cms/published')).body.visibility?.[key] === false, { message: `public visibility.${key} did not flip` });
      }
    } finally {
      // restore regardless of assertion outcome
      const now = (await sections(request)).find((s) => s.sectionKey === key)!;
      if (!now.visible) {
        await gotoAdmin(page, '/admin/site-editor');
        await card(page, key).getByTitle('Toggle Visibility').click();
        await expect(card(page, key).getByTitle('Toggle Visibility')).toHaveText('VIS');
      }
    }
    expect((await sections(request)).find((s) => s.sectionKey === key)!.visible).toBe(true);
    await pollUntil(async () => (await publicJson('/api/cms/published')).body.visibility?.[key] === true, { message: `public visibility.${key} not restored` });
  });

  test('reorder sections up/down and restore the original order', async ({ page, request }) => {
    const order = async () => (await sections(request)).sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.sectionKey);
    const original = await order();
    await openEditor(page);
    const first = original[0] as Key;
    const second = original[1] as Key;
    try {
      await card(page, first).getByTitle('Move Down').click();
      await expect.poll(order).toEqual([second, first, ...original.slice(2)]);
    } finally {
      const now = await order();
      if (now[0] !== first) {
        await gotoAdmin(page, '/admin/site-editor');
        await card(page, first).getByTitle('Move Up').click();
      }
    }
    await expect.poll(order).toEqual(original);
  });

  test('mobile preview toggle resizes the preview frame', async ({ page }) => {
    await openEditor(page);
    const frameBox = page.locator('iframe[title="Live Storefront Preview"]').locator('xpath=..');
    await page.getByRole('button', { name: /Mobile \(390px\)/ }).click();
    await expect(frameBox).toHaveClass(/w-\[390px\]/);
    const w = (await frameBox.boundingBox())!.width;
    expect(Math.round(w)).toBeLessThanOrEqual(390);
    await page.getByRole('button', { name: /Desktop \(1440px\)/ }).click();
    await expect(frameBox).not.toHaveClass(/w-\[390px\]/);
  });

  test('audit log records the CMS actions made by the QA admin', async ({ page, request }) => {
    const api = await adminGet(request, `/api/admin/audit?admin=${encodeURIComponent(adminEmail())}&pageSize=100`);
    expect(api.status).toBe(200);
    const cms = (api.body.entries as { source: string; action: string; entityType: string }[]).filter((e) => e.source === 'cms');
    expect(cms.length, 'CMS audit entries for the QA admin').toBeGreaterThanOrEqual(eligible.length);
    expect(cms.some((e) => /PUBLISH/i.test(e.action))).toBe(true);
    expect(cms.some((e) => /SECTION_(SHOWN|HIDDEN)/i.test(e.action))).toBe(true);

    await gotoAdmin(page, '/admin/audit');
    await page.getByPlaceholder('Admin email').fill(adminEmail());
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.locator('tbody')).toContainText('CmsSection');
    await expectCleanPage(page);
  });
});
