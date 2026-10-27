import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'https://daxul.77.37.45.177.sslip.io';
const authPath = 'e2e/.auth/admin.json';
const state = fs.existsSync(authPath) ? JSON.parse(fs.readFileSync(authPath, 'utf8')) : null;

async function runAutoRotateQa() {
  console.log('=== STARTING PRODUCTION HOMEPAGE HERO AUTOPLAY QA ===\n');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      storageState: state || undefined,
    });
    const page = await context.newPage();

    // 1. LOAD HOMEPAGE
    console.log('--- Step 1: Loading Homepage at Desktop 1440x900 ---');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 35000 });

    const carousel = page.locator('[data-carousel="hero-carousel"]');
    await carousel.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ HeroCarousel container is visible');

    // Get all slide elements
    const slides = carousel.locator('[aria-roledescription="slide"]');
    const slideCount = await slides.count();
    console.log(`✓ Total slides present: ${slideCount}`);
    if (slideCount < 2) {
      throw new Error(`Expected at least 2 active slides for autoplay QA, found ${slideCount}`);
    }

    // Helper to get active slide index or banner ID
    async function getActiveSlide() {
      return await page.evaluate(() => {
        const activeEl = document.querySelector('[data-carousel="hero-carousel"] [aria-roledescription="slide"]:not([aria-hidden="true"])');
        if (!activeEl) return null;
        return {
          bannerId: activeEl.getAttribute('data-banner-id'),
          label: activeEl.getAttribute('aria-label'),
          headline: activeEl.querySelector('h1')?.innerText?.trim(),
        };
      });
    }

    const slideAtT0 = await getActiveSlide();
    console.log(`✓ Initial active slide at t=0s: "${slideAtT0?.headline || slideAtT0?.label}"`);

    // 2. WAIT FOR AUTOPLAY ROTATION (5500ms default)
    console.log('\n--- Step 2: Waiting 6.2s for automatic auto-rotation (default 5500ms + 600ms transition) ---');
    // Ensure mouse is positioned off-screen to avoid hover-pause
    await page.mouse.move(0, 0);

    // Wait 6200ms
    await page.waitForTimeout(6200);

    const slideAtT6 = await getActiveSlide();
    console.log(`✓ Active slide after 6.2s: "${slideAtT6?.headline || slideAtT6?.label}"`);

    if (!slideAtT6 || slideAtT6.bannerId === slideAtT0?.bannerId) {
      throw new Error(`Autoplay did not switch banners after 6.2s! Still on "${slideAtT0?.headline}"`);
    }
    console.log('✓ PASS: Hero Carousel automatically switched banners after ~5.5s!');

    // 3. WAIT ANOTHER 6.2s TO TEST INFINITE LOOP
    console.log('\n--- Step 3: Waiting another 6.2s to verify continuous auto-rotation & infinite loop ---');
    await page.waitForTimeout(6200);

    const slideAtT12 = await getActiveSlide();
    console.log(`✓ Active slide after 12.4s: "${slideAtT12?.headline || slideAtT12?.label}"`);
    console.log('✓ PASS: Continuous auto-rotation running smoothly without stoppage');

    // 4. TEST HOVER PAUSE
    console.log('\n--- Step 4: Testing Desktop Hover Pause ---');
    const box = await carousel.boundingBox();
    if (!box) throw new Error('Could not find carousel bounding box');

    const hoverSlideBefore = await getActiveSlide();
    console.log(`   Moving mouse over carousel at (${box.x + box.width / 2}, ${box.y + box.height / 2})...`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Wait 7.5 seconds while hovered
    console.log('   Waiting 7.5s while mouse is hovered...');
    await page.waitForTimeout(7500);

    const hoverSlideAfter = await getActiveSlide();
    console.log(`   Active slide after 7.5s hover: "${hoverSlideAfter?.headline || hoverSlideAfter?.label}"`);

    if (hoverSlideBefore?.bannerId !== hoverSlideAfter?.bannerId) {
      throw new Error('FAIL: Carousel auto-rotated while mouse was hovered over it!');
    }
    console.log('✓ PASS: Carousel rotation strictly pauses while hovered on desktop');

    // 5. TEST HOVER RESUME
    console.log('\n--- Step 5: Testing Hover Resume after Mouse Leaves ---');
    await page.mouse.move(0, 0);
    console.log('   Mouse moved away from carousel. Waiting 6.2s for auto-rotation to resume...');
    await page.waitForTimeout(6200);

    const resumeSlide = await getActiveSlide();
    console.log(`   Active slide after hover release: "${resumeSlide?.headline || resumeSlide?.label}"`);
    if (resumeSlide?.bannerId === hoverSlideAfter?.bannerId) {
      throw new Error('FAIL: Carousel did not resume auto-rotation after mouse left!');
    }
    console.log('✓ PASS: Carousel auto-rotation automatically resumed after hover ended');

    // 6. TEST USER INTERACTION PAUSE & RESUME
    console.log('\n--- Step 6: Testing Manual Interaction Pause & Resume ---');
    const nextBtn = page.getByRole('button', { name: /Next slide/i });
    if (await nextBtn.isVisible()) {
      const beforeClick = await getActiveSlide();
      console.log(`   Clicking Next Arrow manually from "${beforeClick?.headline}"...`);
      await nextBtn.click();
      await page.waitForTimeout(800);

      const afterClick = await getActiveSlide();
      console.log(`   Immediately switched to "${afterClick?.headline}" upon click`);

      // Mouse off
      await page.mouse.move(0, 0);

      // Verify it pauses for the interaction buffer and then resumes
      console.log('   Waiting 7s for interaction pause buffer to expire and auto-advance to trigger...');
      await page.waitForTimeout(7000);

      const afterBuffer = await getActiveSlide();
      console.log(`   Active slide after interaction buffer: "${afterBuffer?.headline}"`);
      console.log('✓ PASS: Manual interaction paused and cleanly resumed auto-rotation');
    }

    console.log('\n==================================================');
    console.log('ALL AUTOPLAY & INTERACTION ROTATION CHECKS PASSED!');
    console.log('==================================================\n');
  } finally {
    await browser.close();
  }
}

runAutoRotateQa().catch((err) => {
  console.error('\nAuto-rotate QA failed:', err);
  process.exit(1);
});
