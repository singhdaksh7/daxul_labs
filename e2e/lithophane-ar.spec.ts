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
      const dy = y - h * 0.42;
      const d = Math.sqrt(dx * dx + dy * dy);
      let v = 230 - Math.round((y / h) * 100);
      if (d < w * 0.28) v = 50 + Math.round((d / (w * 0.28)) * 60);
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

const FIXTURE = path.join(os.tmpdir(), `daxul-litho-ar-fixture-${process.pid}.png`);

test.beforeAll(() => {
  fs.writeFileSync(FIXTURE, makePng(360, 480));
});

test.afterAll(() => {
  fs.rmSync(FIXTURE, { force: true });
});

test.describe.serial('Lithophane AR Tabletop Experience ("View on your table")', () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    page = await ctx.newPage();
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('AR button is absent on initial load before photo upload', async () => {
    await page.goto('/customize/lithophane');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('lithophane-file-input')).toBeAttached();
    // AR button MUST NOT be present before model is generated
    await expect(page.getByTestId('view-on-table')).toBeHidden();
  });

  test('generates lithophane and displays "VIEW ON YOUR TABLE" button', async () => {
    await page.getByTestId('lithophane-file-input').setInputFiles(FIXTURE);

    // Wait until generation finishes and 3D preview is ready
    await expect(page.getByTestId('lithophane-canvas')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });

    // The AR button should now be visible
    const arBtn = page.getByTestId('view-on-table');
    await expect(arBtn).toBeVisible();
    await expect(arBtn).toContainText('VIEW ON YOUR TABLE');
    await expect(arBtn).toContainText('See it at real size in your space.');
    await expect(arBtn).toBeEnabled();
  });

  test('size change invalidates current AR state and disables AR button during regeneration', async () => {
    const arBtn = page.getByTestId('view-on-table');
    await expect(arBtn).toBeEnabled();

    // Click large size
    await page.getByTestId('size-large').click();

    // During update, updating overlay is visible and AR button should be disabled
    await expect(page.getByTestId('lithophane-updating')).toBeVisible();
    await expect(arBtn).toBeDisabled();

    // Once update finishes, AR button is re-enabled with new physical dimensions
    await expect(page.getByTestId('lithophane-updating')).toBeHidden({ timeout: 60_000 });
    await expect(arBtn).toBeEnabled();
  });

  test('desktop user clicking AR opens QR code handoff modal with physical scale info', async () => {
    await page.getByTestId('view-on-table').click();

    const modal = page.getByTestId('lithophane-ar-modal');
    await expect(modal).toBeVisible();

    // Contains physical scale notice
    await expect(modal).toContainText('Selected Size');
    await expect(modal).toContainText('AR shows the product approximately at its selected real-world manufacturing size.');

    // Displays high-contrast QR code
    await expect(page.getByTestId('ar-qr-code')).toBeVisible({ timeout: 15_000 });

    // Copy link button works
    const copyBtn = page.getByTestId('ar-copy-link-btn');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(page.getByText('Link Copied')).toBeVisible();

    // Close modal
    await page.getByTestId('ar-modal-close').click();
    await expect(modal).toBeHidden();
  });

  test('private AR endpoints strictly reject unauthorized or invalid tokens', async ({ request }) => {
    // 1. Invalid token should return 400 or 404
    const resInvalid = await request.get('/api/lithophane/ar/session/bad_token_123');
    expect([400, 404]).toContain(resInvalid.status());

    // 2. Fake 48-char hex token that does not exist in store returns 404
    const resNotFound = await request.get('/api/lithophane/ar/session/111122223333444455556666777788889999aaaabbbbcccc');
    expect(resNotFound.status()).toBe(404);

    // 3. Requesting model binary with invalid token returns 401 or 404
    const resModelInvalid = await request.get('/api/lithophane/ar/model/invalid_random_token');
    expect([400, 401, 404]).toContain(resModelInvalid.status());
  });

  test('mobile handoff route /ar/lithophane/[token] handles invalid or expired token gracefully', async () => {
    await page.goto('/ar/lithophane/expired_or_fake_token_12345');
    await page.waitForLoadState('networkidle');

    // Should display graceful notice and link back to Lithophane customizer without crashing
    await expect(page.getByText(/AR Link Expired or Invalid/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Open Lithophane Builder/i })).toBeVisible();
  });
});

