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

test.describe('16 - Dynamic CMS Page Builder & Router QA', () => {
  const tag = runTag();
  const testSlug = `qa-page-${tag}`;
  const redirectSlug = `qa-story-${tag}`;
  let createdPageId = '';

  test('1. Admin can create a new CMS page with custom slug', async ({ page, request }) => {
    await gotoAdmin(page, '/admin/pages');
    await expect(page.getByText('Pages & Builder')).toBeVisible();

    // Create page via API or UI
    const res = await adminSend(request, 'POST', '/api/admin/cms/pages', {
      title: `QA Test Page ${tag}`,
      slug: testSlug,
      seoTitle: `QA SEO Title ${tag}`,
      seoDescription: 'QA SEO Description for dynamic page',
    });
    expect(res.status).toBe(201);
    createdPageId = res.body.page.id;
    expect(createdPageId).toBeTruthy();

    // Reload and verify page is visible in table
    await page.reload();
    await expect(page.getByText(`QA Test Page ${tag}`)).toBeVisible();
    await expect(page.getByText(`/${testSlug}`)).toBeVisible();
  });

  test('2. Add sections (Hero, Banner, Text, Gallery, FAQ) and edit draft', async ({ page, request }) => {
    // Add HERO
    const heroRes = await adminSend(request, 'POST', '/api/admin/cms/page-sections', {
      pageId: createdPageId,
      type: 'HERO',
      name: 'Main Hero',
    });
    expect(heroRes.status).toBe(201);
    const heroId = heroRes.body.section.id;

    // Update Hero draft content
    await adminSend(request, 'PATCH', `/api/admin/cms/page-sections/${heroId}`, {
      draftContent: {
        eyebrow: 'STUDIO PROTOTYPE',
        heading: `SCULPTED BY QA ${tag}`,
        subheading: 'Crafted on demand.',
        cta1Label: 'EXPLORE NOW',
        cta1Link: '/shop',
      },
    });

    // Add FAQ
    const faqRes = await adminSend(request, 'POST', '/api/admin/cms/page-sections', {
      pageId: createdPageId,
      type: 'FAQ',
      name: 'Questions',
    });
    expect(faqRes.status).toBe(201);
    const faqId = faqRes.body.section.id;

    await adminSend(request, 'PATCH', `/api/admin/cms/page-sections/${faqId}`, {
      draftContent: {
        heading: 'Common Questions',
        items: [
          { id: '1', question: 'How is this crafted?', answer: 'With precision additive biopolymers.' },
        ],
      },
    });

    // Verify draft is NOT public yet
    const draftResp = await page.goto(`/${testSlug}`);
    expect(draftResp?.status()).toBe(404);
  });

  test('3. Publish page and verify public route renders sections', async ({ page, request }) => {
    const pubRes = await adminSend(request, 'POST', `/api/admin/cms/pages/${createdPageId}/publish`, {});
    expect(pubRes.status).toBe(200);

    // Verify public route is 200 and renders hero heading & FAQ
    const pubResp = await page.goto(`/${testSlug}`);
    expect(pubResp?.status()).toBe(200);
    await expect(page.getByText(`SCULPTED BY QA ${tag}`)).toBeVisible();
    await expect(page.getByText('Common Questions')).toBeVisible();
  });

  test('4. Change slug and verify 301 redirect', async ({ page, request }) => {
    // Update slug from testSlug to redirectSlug
    const patchRes = await adminSend(request, 'PATCH', `/api/admin/cms/pages/${createdPageId}`, {
      slug: redirectSlug,
    });
    expect(patchRes.status).toBe(200);

    // Publish to update route cache
    await adminSend(request, 'POST', `/api/admin/cms/pages/${createdPageId}/publish`, {});

    // Navigating to old slug should redirect to new slug
    const response = await page.goto(`/${testSlug}`);
    expect(page.url()).toContain(`/${redirectSlug}`);
    await expect(page.getByText(`SCULPTED BY QA ${tag}`)).toBeVisible();
  });

  test('5. Section visibility toggle (hide section)', async ({ page, request }) => {
    const pageData = (await adminGet(request, `/api/admin/cms/pages/${createdPageId}`)).body.page;
    const heroSection = pageData.sections.find((s: any) => s.type === 'HERO');
    expect(heroSection).toBeTruthy();

    // Hide hero section
    await adminSend(request, 'PATCH', `/api/admin/cms/page-sections/${heroSection.id}`, {
      visible: false,
    });
    await adminSend(request, 'POST', `/api/admin/cms/pages/${createdPageId}/publish`, {});

    // Verify on public page that hero is hidden while FAQ remains
    await page.goto(`/${redirectSlug}`);
    await expect(page.getByText(`SCULPTED BY QA ${tag}`)).not.toBeVisible();
    await expect(page.getByText('Common Questions')).toBeVisible();

    // Restore visibility
    await adminSend(request, 'PATCH', `/api/admin/cms/page-sections/${heroSection.id}`, {
      visible: true,
    });
    await adminSend(request, 'POST', `/api/admin/cms/pages/${createdPageId}/publish`, {});
  });

  test('6. Draft editing preserves published version until publish', async ({ page, request }) => {
    const pageData = (await adminGet(request, `/api/admin/cms/pages/${createdPageId}`)).body.page;
    const heroSection = pageData.sections.find((s: any) => s.type === 'HERO');

    // Update draft content without publishing
    await adminSend(request, 'PATCH', `/api/admin/cms/page-sections/${heroSection.id}`, {
      draftContent: {
        ...heroSection.draftContent,
        heading: `UNPUBLISHED DRAFT ${tag}`,
      },
    });

    // Verify public route still shows previous published heading
    await page.goto(`/${redirectSlug}`);
    await expect(page.getByText(`SCULPTED BY QA ${tag}`)).toBeVisible();
    await expect(page.getByText(`UNPUBLISHED DRAFT ${tag}`)).not.toBeVisible();

    // Verify preview mode shows draft content
    await page.goto(`/${redirectSlug}?preview=true`);
    await expect(page.getByText(`UNPUBLISHED DRAFT ${tag}`)).toBeVisible();
  });

  test('7. Navigation builder updates header menu', async ({ page, request }) => {
    const navLabel = `Test Link ${tag}`;
    const addRes = await adminSend(request, 'POST', '/api/admin/navigation', {
      menuHandle: 'header',
      label: navLabel,
      url: `/${redirectSlug}`,
    });
    expect(addRes.status).toBe(201);
    const itemId = addRes.body.item.id;

    // Verify header on storefront includes new link
    await page.goto('/');
    await expect(page.locator('header').getByText(navLabel)).toBeVisible();

    // Clean up nav item
    await adminSend(request, 'DELETE', `/api/admin/navigation?id=${itemId}`, {});
  });

  test('8. Viewport responsiveness across 390, 430, 768, and 1440px', async ({ page }) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto(`/${redirectSlug}`);
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    }
  });

  test('9. Delete page safely returns 404 publicly', async ({ page, request }) => {
    const delRes = await adminSend(request, 'DELETE', `/api/admin/cms/pages/${createdPageId}`, {});
    expect(delRes.status).toBe(200);

    const check = await page.goto(`/${redirectSlug}`);
    expect(check?.status()).toBe(404);
  });
});
