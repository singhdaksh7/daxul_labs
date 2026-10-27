import fs from 'node:fs';
import https from 'node:https';

const BASE = 'https://daxul.77.37.45.177.sslip.io';
const authState = JSON.parse(fs.readFileSync('e2e/.auth/admin.json', 'utf8'));
const cookieHeader = authState.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

const agent = new https.Agent({ rejectUnauthorized: false });

async function req(urlPath, options = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`;
  const headers = {
    ...options.headers,
    ...(options.admin ? { Cookie: cookieHeader } : {}),
  };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, {
    ...options,
    headers,
    agent,
    redirect: options.redirect || 'manual',
  });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      data = await res.json();
    } catch {}
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

const results = [];

function record(step, name, pass, details = '') {
  const res = { step, name, pass, details };
  results.push(res);
  const icon = pass ? '✓' : '✗';
  console.log(`${icon} [${step}] ${name}: ${pass ? 'PASS' : 'FAIL'} ${details ? `(${details})` : ''}`);
  if (!pass) {
    throw new Error(`QA Step Failed: [${step}] ${name} - ${details}`);
  }
}

async function run() {
  console.log('=== STARTING PRODUCTION HERO CAROUSEL & MULTI-BANNER QA SUITE ===\n');

  const tag = `prod-${Date.now().toString().slice(-5)}`;
  let bannerAId = '';
  let bannerBId = '';
  let bannerCId = '';
  let duplicatedId = '';
  let scheduledId = '';

  try {
    // 1. HEALTH CHECK
    console.log('--- Step 1: Health & Deployment Baseline ---');
    const health = await req('/api/health');
    record('1.1', 'Production API Health 200 OK', health.status === 200, `status: ${health.status}`);

    // 2. HERO BANNER ENDPOINT
    console.log('\n--- Step 2: Hero Banner Public Endpoint ---');
    const initialHero = await req('/api/banners/hero');
    record('2.1', 'GET /api/banners/hero returns 200', initialHero.status === 200, `status: ${initialHero.status}`);
    const initialList = initialHero.data?.banners || [];
    console.log(`   Found ${initialList.length} currently active hero banner(s) on production.`);

    // 3. CREATE 3 HERO SLIDES (A, B, C)
    console.log('\n--- Step 3: Admin Multi-Slide Banner Creation ---');
    const resA = await req('/api/admin/banners', {
      method: 'POST',
      admin: true,
      body: {
        name: `QA Hero A ${tag}`,
        placement: 'HOMEPAGE_HERO',
        text: `QA HERO SLIDE A ${tag}`,
        headline: `OBJECTS MADE DIFFERENTLY A ${tag}`,
        eyebrow: 'DAXUL LABS / DROP 01',
        subheadline: 'A bold editorial hero slide created via QA.',
        body: 'Manufactured with high precision additive biopolymers.',
        buttonText: 'SHOP DROP A',
        linkUrl: '/shop',
        secondaryCtaLabel: 'CUSTOMIZE',
        secondaryCtaUrl: '/customize',
        desktopImage: '/images/hero_shadow_lamp.jpg',
        mobileImage: '/images/hero_shadow_lamp.jpg',
        textAlign: 'left',
        textMode: 'dark',
        status: 'PUBLISHED',
        priority: 100,
        visible: true,
      },
    });
    record('3.1', 'Create Slide A (PUBLISHED, priority 100)', resA.status === 200 && !!resA.data?.banner?.id, `status: ${resA.status}`);
    bannerAId = resA.data?.banner?.id;

    const resB = await req('/api/admin/banners', {
      method: 'POST',
      admin: true,
      body: {
        name: `QA Hero B ${tag}`,
        placement: 'HOMEPAGE_HERO',
        text: `QA HERO SLIDE B ${tag}`,
        headline: `CUSTOM COMMISSIONS B ${tag}`,
        eyebrow: 'BESPOKE FABRICATION',
        subheadline: 'Engineered for architectural balance.',
        buttonText: 'EXPLORE BESPOKE',
        linkUrl: '/customize',
        desktopImage: '/images/custom_preview.jpg',
        mobileImage: '/images/custom_preview.jpg',
        textAlign: 'center',
        textMode: 'dark',
        status: 'PUBLISHED',
        priority: 90,
        visible: true,
      },
    });
    record('3.2', 'Create Slide B (PUBLISHED, priority 90)', resB.status === 200 && !!resB.data?.banner?.id, `status: ${resB.status}`);
    bannerBId = resB.data?.banner?.id;

    const resC = await req('/api/admin/banners', {
      method: 'POST',
      admin: true,
      body: {
        name: `QA Hero C ${tag}`,
        placement: 'HOMEPAGE_HERO',
        text: `QA HERO SLIDE C ${tag}`,
        headline: `LIMITED ARCHIVES C ${tag}`,
        eyebrow: 'ARCHIVAL STUDY',
        subheadline: 'Serialized editions in tactile graphite.',
        buttonText: 'VIEW ARCHIVES',
        linkUrl: '/collections',
        desktopImage: '/images/hero_shadow_lamp.jpg',
        mobileImage: '/images/hero_shadow_lamp.jpg',
        textAlign: 'left',
        textMode: 'dark',
        status: 'PUBLISHED',
        priority: 80,
        visible: true,
      },
    });
    record('3.3', 'Create Slide C (PUBLISHED, priority 80)', resC.status === 200 && !!resC.data?.banner?.id, `status: ${resC.status}`);
    bannerCId = resC.data?.banner?.id;

    // 4. DUPLICATE SLIDE
    console.log('\n--- Step 4: Duplicate Slide to Draft ---');
    const dupRes = await req(`/api/admin/banners/${bannerAId}/duplicate`, {
      method: 'POST',
      admin: true,
    });
    record('4.1', 'POST /api/admin/banners/:id/duplicate returns 201', dupRes.status === 201, `status: ${dupRes.status}`);
    duplicatedId = dupRes.data?.banner?.id;
    record('4.2', 'Duplicated slide has status DRAFT and visible=false', dupRes.data?.banner?.status === 'DRAFT' && dupRes.data?.banner?.visible === false, `status: ${dupRes.data?.banner?.status}`);

    // 5. DRAFT ISOLATION
    console.log('\n--- Step 5: Draft Isolation ---');
    const pubCheck = await req('/api/banners/hero');
    const pubSlides = pubCheck.data?.banners || [];
    const leakedDraft = pubSlides.find((s) => s.id === duplicatedId);
    record('5.1', 'Public hero endpoint does NOT expose draft slide', !leakedDraft, `draft leaked? ${!!leakedDraft}`);

    const previewCheck = await req('/api/banners/hero?preview=true');
    const previewSlides = previewCheck.data?.banners || [];
    const previewDraft = previewSlides.find((s) => s.id === duplicatedId);
    record('5.2', 'Preview hero endpoint DOES expose draft slide', !!previewDraft, `preview draft found? ${!!previewDraft}`);

    // 6. REORDER ENDPOINT
    console.log('\n--- Step 6: Drag Reordering Slides ---');
    const reorderRes = await req('/api/admin/banners/reorder', {
      method: 'POST',
      admin: true,
      body: {
        bannerIds: [bannerCId, bannerBId, bannerAId],
      },
    });
    record('6.1', 'POST /api/admin/banners/reorder returns 200', reorderRes.status === 200, `status: ${reorderRes.status}`);

    const reorderedCheck = await req('/api/banners/hero');
    const reorderedIds = (reorderedCheck.data?.banners || []).map((s) => s.id);
    const idxC = reorderedIds.indexOf(bannerCId);
    const idxB = reorderedIds.indexOf(bannerBId);
    const idxA = reorderedIds.indexOf(bannerAId);
    record('6.2', 'Reordered slides reflect new priority order (C > B > A)', idxC !== -1 && idxC < idxB && idxB < idxA, `order: C=${idxC}, B=${idxB}, A=${idxA}`);

    // 7. SCHEDULING VERIFICATION
    console.log('\n--- Step 7: Banner Scheduling ---');
    // Create an expired banner (yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const expRes = await req('/api/admin/banners', {
      method: 'POST',
      admin: true,
      body: {
        name: `QA Expired Banner ${tag}`,
        placement: 'HOMEPAGE_HERO',
        text: `EXPIRED BANNER ${tag}`,
        headline: `EXPIRED BANNER ${tag}`,
        status: 'PUBLISHED',
        startDate: twoDaysAgo,
        endDate: yesterday,
        priority: 999,
        visible: true,
      },
    });
    scheduledId = expRes.data?.banner?.id;
    record('7.1', 'Create expired banner record', expRes.status === 200 && !!scheduledId, `id: ${scheduledId}`);

    const scheduleCheck = await req('/api/banners/hero');
    const foundExpired = (scheduleCheck.data?.banners || []).find((s) => s.id === scheduledId);
    record('7.2', 'Expired banner is NOT displayed on public carousel', !foundExpired, `expired found? ${!!foundExpired}`);

    // 8. PUBLIC HOMEPAGE SSR CHECK
    console.log('\n--- Step 8: Public Homepage SSR Verification ---');
    const homeHtmlRes = await req('/');
    record('8.1', 'GET / returns 200', homeHtmlRes.status === 200, `status: ${homeHtmlRes.status}`);
    const htmlText = typeof homeHtmlRes.data === 'string' ? homeHtmlRes.data : '';
    record('8.2', 'Homepage HTML contains HeroCarousel element', htmlText.includes('data-carousel="hero-carousel"'), 'HeroCarousel rendered in SSR');
    record('8.3', 'Homepage HTML renders Slide C headline (first in reorder)', htmlText.includes(`LIMITED ARCHIVES C ${tag}`), 'Slide C rendered');

  } finally {
    // 9. CLEANUP
    console.log('\n--- Cleanup: Removing QA Banners from Production ---');
    const toDelete = [bannerAId, bannerBId, bannerCId, duplicatedId, scheduledId].filter(Boolean);
    for (const id of toDelete) {
      const del = await req(`/api/admin/banners?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        admin: true,
      });
      console.log(`   Deleted test banner ${id}: status ${del.status}`);
    }
  }

  console.log('\n==================================================');
  console.log(`PRODUCTION HERO CAROUSEL QA COMPLETED: ${results.filter((r) => r.pass).length}/${results.length} PASSED`);
  console.log('==================================================\n');
}

run().catch((err) => {
  console.error('\nQA execution failed:', err);
  process.exit(1);
});
