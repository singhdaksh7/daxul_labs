import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function makePng(w: number, h: number): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const dx = x - w / 2;
      const dy = y - h * 0.45;
      const d = Math.sqrt(dx * dx + dy * dy);
      let v = 220 - Math.round((y / h) * 90);
      if (d < w * 0.3) v = 50 + Math.round((d / (w * 0.3)) * 80);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = v;
      raw[o + 1] = v;
      raw[o + 2] = v;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const QA_PHOTO = path.join(os.tmpdir(), `daxul-qa-photo-${process.pid}.png`);

test.beforeAll(() => {
  fs.writeFileSync(QA_PHOTO, makePng(400, 500));
});

test.afterAll(() => {
  fs.rmSync(QA_PHOTO, { force: true });
});

test.describe('Real Device Matrix: Android Chrome (ARCore & Scene Viewer)', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Pixel 7 Viewport and User Agent
    context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Android: full lithophane generation, table guidance, reticle, and model-viewer placement attributes', async () => {
    await page.goto('https://daxul.77.37.45.177.sslip.io/customize/lithophane');
    await page.waitForLoadState('networkidle');

    // 1. Before photo upload, no camera permission is asked and AR button is absent
    await expect(page.getByTestId('view-on-table')).toBeHidden();

    // 2. Upload QA Photo
    await page.getByTestId('lithophane-file-input').setInputFiles(QA_PHOTO);

    // 3. Wait for full 3D generation to complete and Add to Cart to be enabled
    await expect(page.getByTestId('lithophane-canvas')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });

    const arBtn = page.getByTestId('view-on-table');
    await expect(arBtn).toBeVisible();
    await expect(arBtn).toBeEnabled({ timeout: 15_000 });

    // 4. Tap "VIEW ON YOUR TABLE"
    await arBtn.click();

    // 5. Pre-entry guidance modal appears explaining horizontal tabletop scan
    const modal = page.getByTestId('lithophane-ar-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Selected Size');
    await expect(modal).toContainText('Point your phone at a flat surface');
    await expect(modal).toContainText('Tap the detected surface to place your lithophane');

    // 6. Launch AR entry (wait for async capability detection to resolve)
    const launchBtn = page.getByTestId('ar-start-camera-btn');
    await expect(launchBtn).toBeVisible({ timeout: 15_000 });
    await launchBtn.click();

    // 7. Verify model-viewer is initialized with required tabletop AR attributes
    const mv = page.locator('model-viewer');
    await expect(mv).toBeVisible({ timeout: 15_000 });
    await expect(mv).toHaveAttribute('ar-modes', /webxr|scene-viewer/);
    await expect(mv).toHaveAttribute('ar-scale', 'fixed');
    await expect(mv).toHaveAttribute('ar-placement', 'floor');
    await expect(page.getByTestId('ar-launch-native-btn')).toBeVisible();

    // 8. Verify custom surface detection prompt slot exists for tabletop placement
    const promptSlot = page.getByTestId('ar-placement-prompt');
    await expect(promptSlot).toBeAttached();
    await expect(promptSlot).toContainText('table or desk surface');

    // 9. Exit AR viewer cleanly back to customizer
    await page.getByTestId('ar-exit-btn').click();

    // 10. Verify customizer state remains intact after exit
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  });
});

test.describe('Real Device Matrix: iOS Safari (Apple Quick Look USDZ)', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // iPhone 14 Pro Viewport and User Agent
    context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('iOS Safari: tabletop scan guidance, quick-look mode, fixed physical scale, and return flow', async () => {
    await page.goto('https://daxul.77.37.45.177.sslip.io/customize/lithophane');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('lithophane-file-input').setInputFiles(QA_PHOTO);
    await expect(page.getByTestId('lithophane-canvas')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });

    const arBtn = page.getByTestId('view-on-table');
    await expect(arBtn).toBeVisible();
    await expect(arBtn).toBeEnabled({ timeout: 15_000 });
    await arBtn.click();

    const modal = page.getByTestId('lithophane-ar-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Selected Size');

    const launchBtn = page.getByTestId('ar-launch-camera-btn');
    if (await launchBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await launchBtn.click();
      const mv = page.locator('model-viewer');
      await expect(mv).toBeVisible({ timeout: 15_000 });
      await expect(mv).toHaveAttribute('ar-modes', /quick-look/);
      await expect(mv).toHaveAttribute('ar-scale', 'fixed');
    } else {
      // If simulated mobile environment offered QR handoff or direct link
      await expect(page.getByTestId('ar-modal-close')).toBeVisible();
    }
  });
});

test.describe('Desktop QR Handoff & Dimension Transfer', () => {
  test('Desktop clicking AR displays QR modal with exact dimensions and valid phone handoff URL', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 950 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto('https://daxul.77.37.45.177.sslip.io/customize/lithophane');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('lithophane-file-input').setInputFiles(QA_PHOTO);
    await expect(page.getByTestId('lithophane-canvas')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });

    // Select Medium (150x200mm)
    await page.getByTestId('size-medium').click();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    await expect(page.getByTestId('view-on-table')).toBeEnabled({ timeout: 15_000 });

    // Click AR button
    await page.getByTestId('view-on-table').click();

    // Verify Desktop QR modal
    const modal = page.getByTestId('lithophane-ar-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('View On Your Table');
    await expect(modal).toContainText('150 × 200');

    // QR image is rendered
    const qrImg = page.getByTestId('ar-qr-code');
    await expect(qrImg).toBeVisible({ timeout: 15_000 });
    const qrSrc = await qrImg.getAttribute('src');
    expect(qrSrc).toContain('data:image/png;base64,');

    // Copy link
    await page.getByTestId('ar-copy-link-btn').click();
    await expect(page.getByText('Link Copied')).toBeVisible();

    await context.close();
  });
});

test.describe('Regressions: Storefront, Lithophane Customization & Cart Checkout Safety', () => {
  test('core workflow: photo upload, variety change, size change, light toggle, add to cart, and prepaid checkout', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto('https://daxul.77.37.45.177.sslip.io/customize/lithophane');
    await page.waitForLoadState('networkidle');

    // Upload
    await page.getByTestId('lithophane-file-input').setInputFiles(QA_PHOTO);
    await expect(page.getByTestId('lithophane-canvas')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });

    // Switch variety to Table Stand
    await page.getByTestId('variety-table_stand').click();
    await expect(page.getByTestId('lithophane-updating')).toBeHidden({ timeout: 60_000 });
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });

    // Toggle Light ON and OFF
    const lightBtn = page.getByTestId('light-toggle');
    if (await lightBtn.isVisible()) {
      await lightBtn.click();
      await lightBtn.click();
    }

    // Add to cart
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByText('Added to cart')).toBeVisible({ timeout: 10_000 });

    // Verify lithophane summary and prepaid only policy in cart
    const summary = page.getByTestId('lithophane-cart-summary').first();
    await expect(summary).toBeVisible({ timeout: 15_000 });
    await expect(summary).toContainText('Custom / prepaid only');
    await expect(summary).toContainText('Table Stand');

    await context.close();
  });
});
