import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SHOTS = path.join(__dirname, 'screenshots');

/* ------------------------------------------------------------ programmatic PNG fixture */
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
      let v = 235 - Math.round((y / h) * 110); // vertical gradient
      if (d < w * 0.28) v = 40 + Math.round((d / (w * 0.28)) * 60); // dark disc ("face")
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
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const FIXTURE = path.join(os.tmpdir(), `daxul-lithophane-fixture-${process.pid}.png`);

const num = (s: string | null) => Number((s ?? '').replace(/[^0-9.]/g, ''));

async function openBuilder(page: Page) {
  await page.goto('/customize/lithophane');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('lithophane-file-input')).toBeAttached();
}

async function installPhaseRecorder(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __phases: string[] };
    w.__phases = [];
    const el = document.querySelector('[data-testid="lithophane-builder"]')!;
    const rec = () => {
      const p = el.getAttribute('data-phase') || '';
      if (w.__phases[w.__phases.length - 1] !== p) w.__phases.push(p);
    };
    rec();
    new MutationObserver(rec).observe(el, { attributes: true, attributeFilter: ['data-phase'] });
  });
}

async function upload(page: Page) {
  await page.getByTestId('lithophane-file-input').setInputFiles(FIXTURE);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 90_000 });
}

async function adminContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#email').fill('qa-daksh@local.invalid');
  await page.locator('#password').fill('qa-password-123!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 60_000 });
  await page.close();
  return ctx;
}

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(FIXTURE, makePng(480, 640));
});
test.afterAll(() => {
  fs.rmSync(FIXTURE, { force: true });
});

test.describe.serial('Custom Lithophane Builder', () => {
  let ctx: BrowserContext;
  let page: Page;
  let uploadedName = '';
  let orderId = '';
  const generateCalls: string[] = [];

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await ctx.newPage();
    page.on('request', (r) => {
      if (r.url().includes('/api/lithophane/generate') && r.method() === 'POST') generateCalls.push(r.url());
    });
  });
  test.afterAll(async () => {
    await ctx.close();
  });

  test('CTA on /customize links to the builder', async () => {
    await page.goto('/customize');
    await page.waitForLoadState('networkidle');
    const cta = page.getByRole('link', { name: /Customize Lithophane/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/customize/lithophane');
  });

  test('upload shows generation states and an interactive 3D preview', async () => {
    await openBuilder(page);
    await installPhaseRecorder(page);
    const uploadResp = page.waitForResponse((r) => r.url().includes('/api/lithophane/upload') && r.request().method() === 'POST');
    await page.getByTestId('lithophane-file-input').setInputFiles(FIXTURE);
    const body = await (await uploadResp).json();
    uploadedName = body.file.filename;
    expect(body.file.url).toBeUndefined(); // no public URL
    await expect(page.getByTestId('lithophane-status')).toBeVisible();
    await expect(page.getByTestId('lithophane-canvas').locator('canvas')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('What do you want to build?')).toBeVisible();
    const phases = await page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);
    for (const p of ['uploading', 'processing', 'generating', 'ready']) expect(phases).toContain(p);
    expect(phases.indexOf('uploading')).toBeLessThan(phases.indexOf('processing'));
    expect(phases.indexOf('processing')).toBeLessThan(phases.indexOf('generating'));
    expect(phases.indexOf('generating')).toBeLessThan(phases.indexOf('ready'));
    // the status text has no fake percentages
    expect(await page.getByTestId('lithophane-builder').innerText()).not.toMatch(/\d+\s?%/);
    await expect(page.getByTestId('variety-photo_frame')).toHaveAttribute('aria-checked', 'true');
    // (React StrictMode double-mounts effects in dev, so the build counter is >= 1, not exactly 1)
    await expect(page.getByTestId('lithophane-canvas')).toHaveAttribute('data-relief-builds', /^[1-9]/);
    // 3D controls exist
    for (const id of ['view-front', 'view-perspective', 'view-reset', 'light-on', 'light-off']) await expect(page.getByTestId(id)).toBeVisible();
    await page.getByTestId('view-front').click();
    await page.getByTestId('view-perspective').click();
    await page.getByTestId('view-reset').click();
    // all three varieties are offered with a starting price from the DB
    for (const k of ['photo_frame', 'table_stand', 'light_box']) await expect(page.getByTestId(`variety-${k}`)).toContainText('From');
  });

  test('switching variety swaps the shell, auto-selects its default size and never re-uploads', async () => {
    let uploads = 0;
    const onReq = (r: { url(): string; method(): string }) => {
      if (r.url().includes('/api/lithophane/upload') && r.method() === 'POST') uploads++;
    };
    page.on('request', onReq);
    await page.getByTestId('size-small').click();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    const shellBefore = Number(await page.getByTestId('lithophane-canvas').getAttribute('data-shell-builds'));
    await page.getByTestId('variety-table_stand').click();
    await expect(page.getByTestId('variety-table_stand')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('size-medium')).toHaveAttribute('aria-checked', 'true'); // variety default size
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    expect(Number(await page.getByTestId('lithophane-canvas').getAttribute('data-shell-builds'))).toBeGreaterThan(shellBefore);
    await expect(page.getByTestId('option-stand_type')).toBeVisible();
    await page.getByTestId('variety-light_box').click();
    await expect(page.getByTestId('option-light_temperature')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    await page.getByTestId('variety-table_stand').click();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    page.off('request', onReq);
    expect(uploads).toBe(0);
  });

  test('size change regenerates with the Updating state; Add to Cart is disabled meanwhile', async () => {
    const before = generateCalls.length;
    const dimsBefore = await page.getByTestId('lithophane-dims').innerText();
    await page.getByTestId('size-large').click();
    await expect(page.getByTestId('lithophane-updating')).toBeVisible();
    await expect(page.getByTestId('lithophane-updating')).toHaveText('Updating your lithophane...');
    await expect(page.getByTestId('add-to-cart')).toBeDisabled();
    await expect(page.getByTestId('add-to-cart')).toHaveText('Updating preview...');
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    await expect(page.getByTestId('lithophane-updating')).toBeHidden();
    expect(generateCalls.length).toBeGreaterThan(before);
    expect(await page.getByTestId('lithophane-dims').innerText()).not.toBe(dimsBefore);
  });

  test('orientation change regenerates and swaps the panel shape', async () => {
    const before = generateCalls.length;
    await page.getByTestId('orientation-landscape').click();
    await expect(page.getByTestId('add-to-cart')).toBeDisabled();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    expect(generateCalls.length).toBeGreaterThan(before);
    const [w, h] = (await page.getByTestId('lithophane-dims').innerText()).match(/Panel (\d+) x (\d+)/)!.slice(1).map(Number);
    expect(w).toBeGreaterThan(h);
    await page.getByTestId('orientation-portrait').click();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
  });

  test('light on/off is instant and does not regenerate anything', async () => {
    const canvas = page.getByTestId('lithophane-canvas');
    const calls = generateCalls.length;
    const builds = await canvas.getAttribute('data-relief-builds');
    const shells = await canvas.getAttribute('data-shell-builds');
    await expect(canvas).toHaveAttribute('data-light', 'off');
    await page.getByTestId('light-on').click();
    await expect(canvas).toHaveAttribute('data-light', 'on', { timeout: 1000 });
    await expect(page.getByTestId('lithophane-updating')).toBeHidden();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();
    await page.screenshot({ path: path.join(SHOTS, 'lithophane-light-on.png') });
    await page.getByTestId('light-off').click();
    await expect(canvas).toHaveAttribute('data-light', 'off', { timeout: 1000 });
    await page.waitForTimeout(1200);
    expect(generateCalls.length).toBe(calls);
    expect(await canvas.getAttribute('data-relief-builds')).toBe(builds);
    expect(await canvas.getAttribute('data-shell-builds')).toBe(shells);
  });

  test('crop change (debounced) regenerates', async () => {
    const before = generateCalls.length;
    await page.getByTestId('crop-zoom').fill('1.6');
    await expect(page.getByTestId('add-to-cart')).toBeDisabled();
    await expect(page.getByTestId('lithophane-updating')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    expect(generateCalls.length).toBe(before + 1); // one debounced request, not one per slider tick
    await page.getByTestId('crop-cx').fill('0.3');
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    await expect.poll(() => generateCalls.length).toBe(before + 2);
  });

  test('price comes from the server; options and quantity update it without regenerating', async () => {
    const calls = generateCalls.length;
    const p0 = num(await page.getByTestId('lithophane-price').innerText());
    expect(p0).toBeGreaterThan(0);
    await page.getByTestId('option-gift_packaging-yes').click();
    await expect.poll(async () => num(await page.getByTestId('lithophane-price').innerText())).toBe(p0 + 149);
    await page.getByTestId('qty-plus').click();
    await expect.poll(async () => num(await page.getByTestId('lithophane-price').innerText())).toBe((p0 + 149) * 2);
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();
    await page.waitForTimeout(800);
    expect(generateCalls.length).toBe(calls); // non-geometry change: no regeneration
    await page.getByTestId('qty-minus').click();
    await expect.poll(async () => num(await page.getByTestId('lithophane-price').innerText())).toBe(p0 + 149);
    // switching variety updates the price immediately
    await page.getByTestId('variety-light_box').click();
    await expect.poll(async () => num(await page.getByTestId('lithophane-price').innerText())).not.toBe(p0 + 149);
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
    await page.getByTestId('variety-table_stand').click();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled({ timeout: 60_000 });
  });

  test('add to cart shows the lithophane summary with the prepaid-only mark', async () => {
    await page.getByTestId('add-to-cart').click();
    const summary = page.getByTestId('lithophane-cart-summary').first();
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Custom / prepaid only');
    await expect(summary).toContainText('Table Stand');
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('daxul_cart_v3') || '[]'));
    expect(cart).toHaveLength(1);
    const l = cart[0].lithophane;
    expect(l.filename).toBe(uploadedName);
    expect(l.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(l.generationId).toBeTruthy();
    expect(l.options.gift_packaging).toBe('yes');
    expect(cart[0].prepaidOnly).toBe(true);
    await page.screenshot({ path: path.join(SHOTS, 'lithophane-cart-drawer.png') });
  });

  test('checkout shows the custom summary and refuses COD (prepaid only)', async () => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('lithophane-cart-summary')).toBeVisible();
    await expect(page.getByTestId('lithophane-cart-summary')).toContainText('Custom / prepaid only');
    const cod = page.locator('input[name="payment"]').nth(1);
    await expect(cod).toBeDisabled({ timeout: 30_000 });
    await expect(page.getByText(/requires prepaid payment|prepaid-only|customized/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, 'lithophane-checkout.png'), fullPage: true });
  });

  test('server rejects COD and tampered lithophane lines; prepaid order is created with a frozen snapshot', async ({ browser }) => {
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('daxul_cart_v3') || '[]'));
    const item = cart[0];
    const { thumbnail, optionSummary, unitPrice, varietyName, sizeName, widthMm, heightMm, thicknessMm, ...litho } = item.lithophane;
    void [thumbnail, optionSummary, unitPrice, varietyName, sizeName, widthMm, heightMm, thicknessMm];
    const customer = { name: 'QA Litho', email: 'qa-litho@local.invalid', phone: '9999999999', street: '1 Test Street', city: 'Delhi', state: 'Delhi', pincode: '110001' };
    const line = { productId: item.productId, quantity: item.quantity, lithophane: litho };

    const cod = await page.request.post('/api/razorpay/create-order', { data: { items: [line], paymentMethod: 'cod', customer } });
    expect(cod.status()).toBe(400);
    expect(JSON.stringify(await cod.json())).toMatch(/prepaid/i);

    const tampered = await page.request.post('/api/razorpay/create-order', {
      data: { items: [{ ...line, unitPrice: 1, lithophane: { ...litho, hash: 'f'.repeat(64) } }], paymentMethod: 'prepaid', customer },
    });
    expect(tampered.status()).toBe(400);

    // a stranger (no owner cookie) cannot order with someone else's photo
    const stranger = await browser.newContext();
    const sres = await stranger.request.post('/api/razorpay/create-order', { data: { items: [line], paymentMethod: 'prepaid', customer } });
    expect(sres.status()).toBe(400);
    expect(JSON.stringify(await sres.json())).toMatch(/photo/i);
    // and cannot read it
    const file = await stranger.request.get(`/api/uploads/file/${uploadedName}`);
    expect(file.status()).toBe(404);
    await stranger.close();

    // client price hint is ignored/verified: server price wins
    const quote = await page.request.post('/api/quote', { data: { items: [{ ...line }], paymentMethod: 'prepaid' } });
    const q = await quote.json();
    expect(q.ok).toBe(true);
    const serverUnit = q.lines[0].unitPrice;
    expect(serverUnit).toBeGreaterThan(100);

    const ok = await page.request.post('/api/razorpay/create-order', { data: { items: [line], paymentMethod: 'prepaid', customer } });
    const okBody = await ok.json();
    expect(ok.status(), JSON.stringify(okBody)).toBe(200);
    orderId = okBody.orderId;
    expect(okBody.subtotal).toBeCloseTo(serverUnit * item.quantity, 2);

    // the owner can read the photo
    expect((await page.request.get(`/api/uploads/file/${uploadedName}`)).status()).toBe(200);
  });

  test('admin order detail shows the photo, configuration and workflow stage', async ({ browser }) => {
    expect(orderId).toBeTruthy();
    const actx = await adminContext(browser);
    const ap = await actx.newPage();
    await ap.goto(`/admin/orders/${orderId}`);
    await ap.waitForLoadState('networkidle');
    const panel = ap.getByTestId('admin-lithophane-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Table Stand');
    await expect(panel).toContainText('Gift packaging: Yes');
    await expect(panel).toContainText('PENDING');
    const photo = ap.getByTestId('admin-lithophane-photo');
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    const select = ap.getByTestId('lithophane-stage-select');
    await expect(select).toHaveValue('new_order');
    expect((await select.locator('option').allInnerTexts()).join('|')).toBe(
      'New Order|Upload Reviewed|Design Prep|Proof Ready|Customer Approval|Printing|Finishing|Packed|Shipped|Delivered',
    );
    await select.selectOption('design_prep');
    await expect(ap.getByText('Stage updated')).toBeVisible();
    await ap.reload();
    await ap.waitForLoadState('networkidle');
    await expect(ap.getByTestId('lithophane-stage-select')).toHaveValue('design_prep');
    await expect(ap.getByText(/Lithophane stage: New Order -> Design Prep/)).toBeVisible();
    await ap.screenshot({ path: path.join(SHOTS, 'lithophane-admin-order.png'), fullPage: true });

    // admin config page loads and lists the seeded placeholder sizes
    await ap.goto('/admin/lithophane');
    await ap.waitForLoadState('networkidle');
    await expect(ap.getByTestId('lithophane-admin')).toBeVisible();
    await expect(ap.getByText('Lithophane Photo Frame (photo_frame)')).toBeVisible();
    await actx.close();
  });

  test('admin price edits change new quotes but not the placed order', async ({ browser }) => {
    const actx = await adminContext(browser);
    const res = await actx.request.get('/api/admin/lithophane');
    const data = await res.json();
    const v = data.varieties.find((x: { key: string }) => x.key === 'table_stand');
    const original = v.basePrice;
    const ok = await actx.request.patch(`/api/admin/lithophane/varieties/${v.id}`, { data: { basePrice: original + 500 } });
    expect(ok.status()).toBe(200);
    try {
      const sizeMed = v.sizes.find((s: { isDefault: boolean }) => s.isDefault);
      const q = await page.request.post('/api/lithophane/quote', { data: { varietyKey: 'table_stand', sizeId: sizeMed.id, options: {}, quantity: 1 } });
      expect((await q.json()).price.base).toBe(original + 500);
      const ap = await actx.newPage();
      await ap.goto(`/admin/orders/${orderId}`);
      await ap.waitForLoadState('networkidle');
      await expect(ap.getByTestId('admin-lithophane-panel')).toContainText(new RegExp(`base [^0-9]*${String(original).replace(/(\d)(?=(\d{3})+$)/g, '$1,?')}`));
      await ap.close();
    } finally {
      await actx.request.patch(`/api/admin/lithophane/varieties/${v.id}`, { data: { basePrice: original } });
    }
    await actx.close();
  });

  test('responsive screenshots at 390, 430, 768 and 1440 with no horizontal overflow', async ({ browser }) => {
    for (const width of [390, 430, 768, 1440]) {
      const c = await browser.newContext({ viewport: { width, height: width >= 768 ? 1000 : 844 } });
      const p = await c.newPage();
      await openBuilder(p);
      const noOverflowEmpty = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      expect(noOverflowEmpty, `empty state overflow at ${width}`).toBe(true);
      await upload(p);
      await expect(p.getByTestId('lithophane-canvas').locator('canvas')).toBeVisible();
      await p.waitForTimeout(600);
      const overflow = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      expect(overflow.sw, `overflow at ${width}`).toBeLessThanOrEqual(overflow.iw + 1);
      await p.screenshot({ path: path.join(SHOTS, `lithophane-${width}.png`), fullPage: true });
      await c.close();
    }
  });
});
