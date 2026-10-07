import { test, expect } from '@playwright/test';
import {
  acceptDialogs,
  adminGet,
  archiveCollection,
  cancelOrderIfOpen,
  getState,
  gotoAdmin,
  patchState,
  pollUntil,
  publicJson,
  readOriginal,
  removeCoupon,
  removeMediaByAlt,
  removeOrArchiveProduct,
  runTag,
  stripVolatile,
} from './helpers';

/**
 * Runs last. Safe to re-run on its own after an aborted run:
 *   QA_RESUME=1 npm run qa:e2e -- 15-cleanup
 * Every step tolerates "already gone".
 */
let failed = false;
test.setTimeout(300_000);

const norm = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(stripVolatile(o)).map(([k, v]) => [k, v === null ? '' : v]));

test.describe('15 cleanup + originals restored', () => {
  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'passed' && testInfo.status !== 'skipped') failed = true;
  });

  test('cancel the test orders', async ({ request }) => {
    const s = getState();
    const ids = [s.order?.id, ...(s.extraOrders ?? []).map((o) => o.id)].filter(Boolean) as string[];
    for (const id of ids) {
      const r = await cancelOrderIfOpen(request, id);
      expect(['cancelled', 'already'], `order ${id}`).toContain(r);
      const d = await adminGet(request, `/api/admin/orders?id=${id}`);
      expect(d.body.order.status).toBe('cancelled');
    }
  });

  test('archive the test product (delete is impossible once it has orders) and confirm it is off the storefront', async ({ page, request }) => {
    const p = getState().product;
    test.skip(!p, 'no test product was created');
    acceptDialogs(page);
    await gotoAdmin(page, '/admin/products');
    await page.getByPlaceholder('Search name, SKU, slug').fill(runTag());
    const row = page.locator('tbody tr', { hasText: p!.name });
    if ((await row.count()) === 1) {
      await row.getByTitle('Archive').click().catch(() => undefined);
    }
    const outcome = await removeOrArchiveProduct(request, p!.id); // DELETE first; 409 (has orders) -> archive
    test.info().annotations.push({ type: 'product-cleanup', description: outcome });
    if (outcome !== 'deleted' && outcome !== 'missing') {
      const full = (await adminGet(request, `/api/admin/products?id=${p!.id}`)).body.product;
      expect(full.isArchived).toBe(true);
    }
    // not purchasable / listed publicly any more
    const pub = await page.request.get(`/shop/${p!.slug}`);
    expect([404]).toContain(pub.status());
    const shop = await page.request.get('/shop');
    expect(await shop.text()).not.toContain(p!.name);
  });

  test('delete / disable the QA coupons', async ({ request }) => {
    const digits = runTag().replace(/\D/g, '').slice(-8);
    const list = await adminGet(request, '/api/admin/coupons');
    const mine = (list.body.coupons as { id: string; code: string; isActive: boolean }[]).filter((c) => c.code.startsWith('QA') && c.code.includes(digits));
    for (const c of mine) await removeCoupon(request, c.id);
    const after = await adminGet(request, '/api/admin/coupons');
    const left = (after.body.coupons as { code: string; isActive: boolean }[]).filter((c) => c.code.startsWith('QA') && c.code.includes(digits));
    for (const c of left) expect(c.isActive, `${c.code} must be disabled (used coupons cannot be deleted)`).toBe(false);
  });

  test('archive the QA collections', async ({ request }) => {
    const list = await adminGet(request, '/api/admin/collections');
    const mine = (list.body.collections as { id: string; name: string }[]).filter((c) => c.name.includes(runTag()));
    for (const c of mine) await archiveCollection(request, c.id);
    const after = await adminGet(request, '/api/admin/collections');
    for (const c of (after.body.collections as { name: string; isActive: boolean }[]).filter((c) => c.name.includes(runTag()))) {
      expect(c.isActive, `${c.name} archived`).toBe(false);
    }
  });

  test('remove the QA media', async ({ request }) => {
    await removeMediaByAlt(request, runTag());
    const r = await adminGet(request, `/api/admin/cms/media?q=${encodeURIComponent(runTag())}`);
    expect(r.body.assets ?? []).toHaveLength(0);
  });

  test('settings, policies, theme, SEO equal the originals captured before the run', async ({ request }) => {
    const o = readOriginal();
    expect(norm((await adminGet(request, '/api/admin/settings')).body.settings)).toEqual(norm(o.settings));
    const pol = (await adminGet(request, '/api/admin/policies')).body.policies as { slug: string; title: string; content: string }[];
    for (const p of o.policies) {
      const now = pol.find((x) => x.slug === p.slug);
      expect(now?.content, `policy ${p.slug} content`).toBe(p.content);
      expect(now?.title, `policy ${p.slug} title`).toBe(p.title);
    }
    expect(stripVolatile((await adminGet(request, '/api/admin/theme')).body.theme)).toEqual(stripVolatile(o.theme));
    expect(norm((await adminGet(request, '/api/admin/seo')).body.seo)).toEqual(norm(o.seo));
  });

  test('CMS sections (draft, published, visibility, order) equal the originals; public endpoint converges', async ({ request }) => {
    const o = readOriginal();
    const now = (await adminGet(request, '/api/admin/cms/sections')).body.sections as {
      sectionKey: string; visible: boolean; sortOrder: number; draftContent: unknown; publishedContent: unknown;
    }[];
    for (const s of o.cmsSections) {
      const c = now.find((x) => x.sectionKey === s.sectionKey)!;
      expect(c.visible, `${s.sectionKey} visible`).toBe(s.visible);
      expect(c.sortOrder, `${s.sectionKey} sortOrder`).toBe(s.sortOrder);
      expect(c.publishedContent, `${s.sectionKey} published`).toEqual(s.publishedContent);
      expect(c.draftContent, `${s.sectionKey} draft`).toEqual(s.draftContent);
    }
    await pollUntil(async () => JSON.stringify((await publicJson('/api/cms/published')).body) === JSON.stringify(o.cmsPublished), {
      message: 'public /api/cms/published != original (cache may still be warming)',
    });
  });

  test('catalog state: no stray QA data; originals untouched', async ({ request }) => {
    const o = readOriginal();
    const products = (await adminGet(request, '/api/admin/products?status=all')).body.products as { id: string; name: string; isArchived: boolean; isActive: boolean }[];
    for (const id of o.productIds) expect(products.some((p) => p.id === id), `original product ${id} still exists`).toBe(true);
    const extra = products.filter((p) => !o.productIds.includes(p.id));
    for (const p of extra) {
      expect(p.name.includes(runTag()), `unexpected new product "${p.name}"`).toBe(true);
      expect(p.isArchived || !p.isActive, `${p.name} archived/hidden`).toBe(true);
    }

    const cols = (await adminGet(request, '/api/admin/collections')).body.collections as { id: string; name: string; isActive: boolean }[];
    const real = cols.filter((c) => !c.name.includes(runTag()));
    expect(real.map((c) => c.id), 'real collections keep their order').toEqual(o.collections.map((c) => c.id));
    expect(real.map((c) => c.isActive)).toEqual(o.collections.map((c) => c.isActive));

    const coupons = (await adminGet(request, '/api/admin/coupons')).body.coupons as { id: string }[];
    for (const id of o.couponIds) expect(coupons.some((c) => c.id === id), `original coupon ${id}`).toBe(true);

    const media = ((await adminGet(request, '/api/admin/cms/media')).body.assets ?? []) as { id: string }[];
    expect(media.map((m) => m.id).sort()).toEqual([...o.mediaIds].sort());
  });

  test('mark the run as cleaned (only if every cleanup/restore assertion above passed)', async () => {
    expect(failed, 'a cleanup or restore step failed; run NOT marked cleaned (re-run with QA_RESUME=1 after fixing)').toBe(false);
    patchState({ cleaned: true });
  });
});
