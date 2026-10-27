import { test, expect, type Page } from '@playwright/test';
import {
  AUTH_FILE,
  adminGet,
  adminSend,
  gotoAdmin,
  runTag,
  settle,
} from './helpers';

test.describe.configure({ mode: 'serial' });
test.use({ storageState: AUTH_FILE });

test.describe('17 - Homepage Hero Carousel & Multi-Banner Studio QA', () => {
  const tag = runTag();
  let bannerAId = '';
  let bannerBId = '';
  let bannerCId = '';
  let draftBannerId = '';
  let duplicatedBannerId = '';

  test.afterAll(async ({ request }) => {
    // Cleanup any test banners created
    const ids = [bannerAId, bannerBId, bannerCId, draftBannerId, duplicatedBannerId].filter(Boolean);
    for (const id of ids) {
      await adminSend(request, 'DELETE', `/api/admin/banners?id=${encodeURIComponent(id)}`).catch(() => undefined);
    }
  });

  test('1. Admin Banners UI displays placement tabs and loads Homepage Hero tab', async ({ page }) => {
    await gotoAdmin(page, '/admin/banners');
    await settle(page);

    // Verify placement tabs exist
    await expect(page.getByRole('button', { name: /HOMEPAGE HERO/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ANNOUNCEMENT/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PROMOTIONAL/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PAGE HERO/i })).toBeVisible();

    // Verify "+ Create Banner" button is present
    await expect(page.getByRole('button', { name: /Create Banner/i })).toBeVisible();
  });

  test('2. Admin can create 3 Hero slides with full typography and CTA config', async ({ request }) => {
    // Create Slide A
    const resA = await adminSend(request, 'POST', '/api/admin/banners', {
      name: `QA Hero A ${tag}`,
      placement: 'HOMEPAGE_HERO',
      text: `QA HERO SLIDE A ${tag}`,
      headline: `OBJECTS MADE DIFFERENTLY A ${tag}`,
      eyebrow: 'DAXUL LABS / DROP 01',
      subheadline: 'A bold editorial hero slide created via QA.',
      body: 'High precision additive biopolymers.',
      buttonText: 'SHOP DROP A',
      linkUrl: '/shop',
      secondaryCtaLabel: 'CUSTOMIZE',
      secondaryCtaUrl: '/customize',
      desktopImage: '/images/hero-default.webp',
      mobileImage: '/images/hero-default.webp',
      textAlign: 'left',
      textMode: 'dark',
      status: 'PUBLISHED',
      priority: 1,
      visible: true,
    });
    expect(resA.status).toBe(200);
    bannerAId = resA.body.banner.id;
    expect(bannerAId).toBeTruthy();

    // Create Slide B
    const resB = await adminSend(request, 'POST', '/api/admin/banners', {
      name: `QA Hero B ${tag}`,
      placement: 'HOMEPAGE_HERO',
      text: `QA HERO SLIDE B ${tag}`,
      headline: `CUSTOM COMMISSIONS B ${tag}`,
      eyebrow: 'BESPOKE FABRICATION',
      subheadline: 'Engineered for architectural balance.',
      buttonText: 'EXPLORE BESPOKE',
      linkUrl: '/customize',
      desktopImage: '/images/hero-default.webp',
      mobileImage: '/images/hero-default.webp',
      textAlign: 'center',
      textMode: 'dark',
      status: 'PUBLISHED',
      priority: 2,
      visible: true,
    });
    expect(resB.status).toBe(200);
    bannerBId = resB.body.banner.id;

    // Create Slide C
    const resC = await adminSend(request, 'POST', '/api/admin/banners', {
      name: `QA Hero C ${tag}`,
      placement: 'HOMEPAGE_HERO',
      text: `QA HERO SLIDE C ${tag}`,
      headline: `LIMITED ARCHIVES C ${tag}`,
      eyebrow: 'ARCHIVAL STUDY',
      subheadline: 'Serialized editions in tactile graphite.',
      buttonText: 'VIEW ARCHIVES',
      linkUrl: '/collections',
      desktopImage: '/images/hero-default.webp',
      mobileImage: '/images/hero-default.webp',
      textAlign: 'left',
      textMode: 'dark',
      status: 'PUBLISHED',
      priority: 3,
      visible: true,
    });
    expect(resC.status).toBe(200);
    bannerCId = resC.body.banner.id;
  });

  test('3. Duplicate slide creates a DRAFT copy safely', async ({ request }) => {
    const dupRes = await adminSend(request, 'POST', `/api/admin/banners/${bannerAId}/duplicate`, {});
    expect(dupRes.status).toBe(201);
    expect(dupRes.body.banner.status).toBe('DRAFT');
    expect(dupRes.body.banner.name).toContain('(Copy)');
    duplicatedBannerId = dupRes.body.banner.id;
  });

  test('4. Draft banners are NOT visible to the public endpoint', async ({ request }) => {
    // Query public endpoint
    const pubRes = await request.get('/api/banners/hero');
    expect(pubRes.status()).toBe(200);
    const pubData = await pubRes.json();
    const slides = pubData.slides || [];

    // Ensure duplicatedBannerId (DRAFT) is NOT in the public response
    const foundDraft = slides.find((s: any) => s.id === duplicatedBannerId);
    expect(foundDraft).toBeUndefined();

    // Ensure published slides are present
    const foundA = slides.find((s: any) => s.id === bannerAId);
    expect(foundA).toBeDefined();
  });

  test('5. Reorder endpoint updates priorities correctly', async ({ request }) => {
    // Reorder: place C first, then B, then A
    const reorderRes = await adminSend(request, 'POST', '/api/admin/banners/reorder', {
      bannerIds: [bannerCId, bannerBId, bannerAId],
    });
    expect(reorderRes.status).toBe(200);

    // Verify public API returns C first
    const pubRes = await request.get('/api/banners/hero');
    const pubData = await pubRes.json();
    const slides = pubData.slides || [];
    const ids = slides.map((s: any) => s.id);
    const posC = ids.indexOf(bannerCId);
    const posB = ids.indexOf(bannerBId);
    const posA = ids.indexOf(bannerAId);

    expect(posC).toBeLessThan(posB);
    expect(posB).toBeLessThan(posA);

    // Reset order back: A first, then B, then C
    await adminSend(request, 'POST', '/api/admin/banners/reorder', {
      bannerIds: [bannerAId, bannerBId, bannerCId],
    });
  });

  test('6. Public homepage renders HeroCarousel with controls (arrows, dots, loop)', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    // Verify HeroCarousel container is present
    const carousel = page.locator('[data-carousel="hero-carousel"]');
    await expect(carousel).toBeVisible();

    // Verify Slide A headline is visible initially
    await expect(page.getByText(`OBJECTS MADE DIFFERENTLY A ${tag}`)).toBeVisible();
    await expect(page.getByRole('link', { name: 'SHOP DROP A' })).toBeVisible();

    // Verify arrow controls exist
    const nextBtn = page.getByRole('button', { name: /Next slide/i });
    const prevBtn = page.getByRole('button', { name: /Previous slide/i });
    await expect(nextBtn).toBeVisible();
    await expect(prevBtn).toBeVisible();

    // Click next -> transitions to Slide B
    await nextBtn.click();
    await expect(page.getByText(`CUSTOM COMMISSIONS B ${tag}`)).toBeVisible();

    // Click next -> transitions to Slide C
    await nextBtn.click();
    await expect(page.getByText(`LIMITED ARCHIVES C ${tag}`)).toBeVisible();

    // Click next -> loops back to Slide A
    await nextBtn.click();
    await expect(page.getByText(`OBJECTS MADE DIFFERENTLY A ${tag}`)).toBeVisible();

    // Test dots navigation: click dot 2 (for slide B)
    const dot2 = page.getByRole('button', { name: /Go to slide 2/i });
    await dot2.click();
    await expect(page.getByText(`CUSTOM COMMISSIONS B ${tag}`)).toBeVisible();

    // Keyboard navigation: Press ArrowLeft to go back to slide A
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText(`OBJECTS MADE DIFFERENTLY A ${tag}`)).toBeVisible();
  });

  test('7. Fallback behavior: 1 active banner hides carousel controls', async ({ page, request }) => {
    // Disable B and C temporarily
    await adminSend(request, 'POST', '/api/admin/banners', { id: bannerBId, visible: false });
    await adminSend(request, 'POST', '/api/admin/banners', { id: bannerCId, visible: false });

    await page.goto('/');
    await settle(page);

    // Slide A should still be visible
    await expect(page.getByText(`OBJECTS MADE DIFFERENTLY A ${tag}`)).toBeVisible();

    // With only 1 active banner, carousel arrows and dots should NOT be present
    await expect(page.getByRole('button', { name: /Next slide/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Go to slide 2/i })).toHaveCount(0);

    // Re-enable B and C
    await adminSend(request, 'POST', '/api/admin/banners', { id: bannerBId, visible: true });
    await adminSend(request, 'POST', '/api/admin/banners', { id: bannerCId, visible: true });
  });

  test('8. Responsive viewports QA (390px, 430px, 768px, 1440px)', async ({ page }) => {
    const viewports = [
      { name: 'Mobile 390', width: 390, height: 844 },
      { name: 'Mobile 430', width: 430, height: 932 },
      { name: 'Tablet 768', width: 768, height: 1024 },
      { name: 'Desktop 1440', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await settle(page);

      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth, `Horizontal scroll overflow detected at ${vp.name}`).toBeLessThanOrEqual(clientWidth + 2);

      // Verify hero carousel is visible
      const carousel = page.locator('[data-carousel="hero-carousel"]');
      await expect(carousel).toBeVisible();

      // Verify headline is visible and legible
      await expect(page.getByText(`OBJECTS MADE DIFFERENTLY A ${tag}`)).toBeVisible();
    }
  });

  test('9. Mobile swipe gesture advances slides', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await settle(page);

    const carousel = page.locator('[data-carousel="hero-carousel"]');
    await expect(carousel).toBeVisible();
    await expect(page.getByText(`OBJECTS MADE DIFFERENTLY A ${tag}`)).toBeVisible();

    // Simulate touch swipe left: from x=300 to x=50
    const box = await carousel.boundingBox();
    if (box) {
      const startX = box.x + box.width * 0.8;
      const endX = box.x + box.width * 0.2;
      const y = box.y + box.height * 0.5;

      // Dispatch touch events
      await page.dispatchEvent('[data-carousel="hero-carousel"]', 'touchstart', {
        touches: [{ clientX: startX, clientY: y }],
      });
      await page.dispatchEvent('[data-carousel="hero-carousel"]', 'touchmove', {
        touches: [{ clientX: endX, clientY: y }],
      });
      await page.dispatchEvent('[data-carousel="hero-carousel"]', 'touchend', {});

      // Verify transition to Slide B
      await expect(page.getByText(`CUSTOM COMMISSIONS B ${tag}`)).toBeVisible();
    }
  });
});
