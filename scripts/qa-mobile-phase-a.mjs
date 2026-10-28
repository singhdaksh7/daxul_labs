import fs from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = 'https://daxul.77.37.45.177.sslip.io';

const authJson = JSON.parse(fs.readFileSync('e2e/.auth/admin.json', 'utf8'));

const viewports = [
  { name: 'iPhone 14 (390px)', width: 390, height: 844 },
  { name: 'iPhone Pro Max (430px)', width: 430, height: 932 },
  { name: 'iPad / Tablet (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1440px)', width: 1440, height: 900 },
];

const pagesToTest = [
  { name: 'Shop Catalog', path: '/shop', auth: false },
  { name: 'Checkout Form', path: '/checkout', auth: false },
  { name: 'Account Portal', path: '/account', auth: false },
  { name: 'Order Tracking', path: '/track', auth: false },
  { name: 'Admin Abandoned Carts', path: '/admin/abandoned-checkouts', auth: true },
  { name: 'Admin Payment Reconciliation', path: '/admin/payments', auth: true },
  { name: 'Admin 3D Production Desk', path: '/admin/production', auth: true },
];

async function run() {
  console.log('====================================================');
  console.log('DAXUL LABS — RESPONSIVE & MOBILE VIEWPORT QA (Step 22)');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  let totalTests = 0;
  let passedTests = 0;

  for (const vp of viewports) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      ignoreHTTPSErrors: true,
    });

    // Add admin cookies
    await context.addCookies(authJson.cookies);

    const page = await context.newPage();

    for (const target of pagesToTest) {
      totalTests++;
      try {
        await page.goto(`${BASE}${target.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(500);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          return {
            hasOverflow: docWidth > winWidth + 1, // allow 1px subpixel tolerance
            docWidth,
            winWidth,
          };
        });

        if (!overflow.hasOverflow) {
          passedTests++;
          console.log(`✓ [${vp.width}px] ${target.name} — No horizontal overflow (${overflow.docWidth}px / ${overflow.winWidth}px)`);
        } else {
          console.log(`❌ [${vp.width}px] ${target.name} — OVERFLOW DETECTED: content is ${overflow.docWidth}px, viewport is ${overflow.winWidth}px`);
        }
      } catch (err) {
        console.log(`❌ [${vp.width}px] ${target.name} — Error loading: ${err.message}`);
      }
    }

    await context.close();
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`MOBILE QA TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`RESULT: ${totalTests === passedTests ? 'ALL VIEWPORTS PASSED ✓' : 'OVERFLOW FOUND ❌'}`);
  console.log('====================================================');
}

run().catch((e) => {
  console.error('Mobile QA fatal error:', e);
  process.exit(1);
});
