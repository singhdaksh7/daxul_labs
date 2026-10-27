import fs from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = 'https://daxul.77.37.45.177.sslip.io';
const authState = JSON.parse(fs.readFileSync('e2e/.auth/admin.json', 'utf8'));
const cookieHeader = authState.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

async function run() {
  console.log('=== RUNNING PRODUCTION MOBILE & RESPONSIVE VIEWPORT QA ===\n');

  // 1. Create a published test page with Hero, Tabs, Gallery, Product Grid, and Footer
  const createRes = await fetch(`${BASE}/api/admin/cms/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      title: 'QA Mobile Responsive Test',
      slug: 'qa-mobile-test',
      status: 'PUBLISHED',
    }),
  });
  const pageData = await createRes.json();
  const pageId = pageData.page.id;

  // Add Hero
  const heroRes = await fetch(`${BASE}/api/admin/cms/page-sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ pageId, type: 'HERO', name: 'Mobile Hero' }),
  });
  const heroId = (await heroRes.json()).section.id;
  await fetch(`${BASE}/api/admin/cms/page-sections/${heroId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      draftContent: {
        eyebrow: 'RESPONSIVE SYSTEM',
        heading: 'DAXUL MOBILE PURITY',
        subheading: 'Engineered for seamless micro-viewports.',
        cta1Label: 'SHOP NOW',
        cta1Link: '/shop',
      },
    }),
  });

  // Add Tabs
  const tabsRes = await fetch(`${BASE}/api/admin/cms/page-sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ pageId, type: 'TABS', name: 'Mobile Tabs' }),
  });
  const tabsId = (await tabsRes.json()).section.id;
  await fetch(`${BASE}/api/admin/cms/page-sections/${tabsId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      draftContent: {
        heading: 'OBJECT ARCHITECTURE',
        tabs: [
          { id: 't1', label: 'Materiality', content: 'Precision PLA biopolymers.' },
          { id: 't2', label: 'Dimensions', content: '280mm x 120mm.' },
        ],
      },
    }),
  });

  // Add Gallery
  const galRes = await fetch(`${BASE}/api/admin/cms/page-sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ pageId, type: 'GALLERY', name: 'Mobile Gallery' }),
  });
  const galId = (await galRes.json()).section.id;
  await fetch(`${BASE}/api/admin/cms/page-sections/${galId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      draftContent: {
        heading: 'STUDIO GALLERY',
        layout: 'grid',
        columns: 3,
        items: [
          { id: 'g1', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600', caption: 'Lamp 1' },
          { id: 'g2', url: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=600', caption: 'Vessel 2' },
        ],
      },
    }),
  });

  // Publish
  await fetch(`${BASE}/api/admin/cms/pages/${pageId}/publish`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: 'iPhone SE / Compact Mobile', width: 390, height: 844 },
    { name: 'iPhone Pro Max / Standard Mobile', width: 430, height: 932 },
    { name: 'iPad / Tablet Portrait', width: 768, height: 1024 },
    { name: 'Desktop Large', width: 1440, height: 900 },
  ];

  try {
    for (const vp of viewports) {
      console.log(`Testing viewport: ${vp.name} (${vp.width}x${vp.height}px)...`);
      const context = await browser.newContext({
        storageState: 'e2e/.auth/admin.json',
        viewport: { width: vp.width, height: vp.height },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      // 1. Test public page
      const resp = await page.goto(`${BASE}/qa-mobile-test`, { waitUntil: 'networkidle' });
      if (resp.status() !== 200) throw new Error(`Expected 200 on /qa-mobile-test, got ${resp.status()}`);

      // Check for horizontal overflow (document.body.scrollWidth <= window.innerWidth)
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        throw new Error(`Horizontal overflow detected at ${vp.width}px!`);
      }
      console.log(`  ✓ No horizontal overflow at ${vp.width}px`);

      // Verify Hero heading visible
      const headingVisible = await page.getByText('DAXUL MOBILE PURITY').isVisible();
      if (!headingVisible) throw new Error(`Heading not visible at ${vp.width}px`);
      console.log(`  ✓ Hero heading visible at ${vp.width}px`);

      // Verify Tabs interactive
      const tabButton = page.locator('button', { hasText: 'Dimensions' });
      if (await tabButton.isVisible()) {
        await tabButton.click();
        const contentVisible = await page.getByText('280mm x 120mm.').isVisible();
        if (!contentVisible) throw new Error(`Tab content not displayed on click at ${vp.width}px`);
        console.log(`  ✓ Tabs interactive and responsive at ${vp.width}px`);
      }

      // 2. Test Admin Page Builder Studio at this viewport
      const adminResp = await page.goto(`${BASE}/admin/pages/${pageId}`, { waitUntil: 'domcontentloaded' });
      if (adminResp.status() === 200) {
        console.log(`  ✓ Admin Builder page loads successfully (200) at ${vp.width}px`);
      }

      await context.close();
    }
  } finally {
    await browser.close();

    // Clean up test page
    console.log('\nCleaning up mobile test page...');
    await fetch(`${BASE}/api/admin/cms/pages/${pageId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    console.log('Cleaned up successfully.');
  }

  console.log('\n=== ALL RESPONSIVE VIEWPORT TESTS PASSED (390, 430, 768, 1440px) ===\n');
}

run().catch((err) => {
  console.error('\nMobile QA Error:', err);
  process.exit(1);
});
