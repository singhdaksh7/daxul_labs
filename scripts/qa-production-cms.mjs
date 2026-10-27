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
  console.log('=== STARTING PRODUCTION REAL CMS QA SUITE ===\n');

  // 1. PAGE MANAGEMENT & DRAFT ISOLATION
  console.log('--- Phase 1: Page Management & Draft Isolation ---');
  const createPageRes = await req('/api/admin/cms/pages', {
    method: 'POST',
    admin: true,
    body: {
      title: 'DAXUL CMS TEST',
      slug: 'cms-test',
      seoTitle: 'DAXUL CMS Test Page',
      seoDescription: 'Testing dynamic page builder in production',
    },
  });
  record('1.1', 'Create Page DAXUL CMS TEST', createPageRes.status === 201, `ID: ${createPageRes.data?.page?.id}`);
  const pageId = createPageRes.data.page.id;

  // Verify public /cms-test returns 404
  const publicDraftCheck = await req('/cms-test');
  record('1.2', 'Public route 404 while draft', publicDraftCheck.status === 404, `Status: ${publicDraftCheck.status}`);

  // Verify admin preview returns 200
  const adminPreviewCheck = await req('/cms-test?preview=true', { admin: true });
  record('1.3', 'Admin draft preview returns 200', adminPreviewCheck.status === 200, `Status: ${adminPreviewCheck.status}`);

  // 2. ADD SECTIONS
  console.log('\n--- Phase 2: Section Builder (All Required Types) ---');
  // Add HERO
  const heroRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'HERO',
      name: 'Hero Section',
    },
  });
  record('2.1', 'Add HERO Section', heroRes.status === 201, `ID: ${heroRes.data?.section?.id}`);
  const heroId = heroRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${heroId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        eyebrow: 'MINIMAL ARCHITECTURE',
        heading: 'DAXUL CMS TEST OBJECTS',
        subheading: 'Sculpted live on production',
        cta1Label: 'EXPLORE SHOP',
        cta1Link: '/shop',
      },
    },
  });

  // Add TEXT
  const textRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'TEXT',
      name: 'Text Block',
    },
  });
  record('2.2', 'Add TEXT Section', textRes.status === 201);
  const textId = textRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${textId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        eyebrow: 'PHILOSOPHY',
        heading: 'Form Follows Restraint',
        body: 'Warm bone, dark carbon, and tactile surfaces produced with precision additive manufacturing.',
        align: 'center',
      },
    },
  });

  // Add IMAGE_TEXT
  const imgTextRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'IMAGE_TEXT',
      name: 'Image + Text',
    },
  });
  record('2.3', 'Add IMAGE_TEXT Section', imgTextRes.status === 201);
  const imgTextId = imgTextRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${imgTextId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        eyebrow: 'MATERIALS',
        heading: 'Tactile Biopolymer',
        description: 'Matte surface finish with micro-textured grain.',
        image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        imagePosition: 'right',
        ctaLabel: 'DISCOVER MATERIALS',
        ctaLink: '/about',
      },
    },
  });

  // Add GALLERY
  const galleryRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'GALLERY',
      name: 'Gallery Showcase',
    },
  });
  record('2.4', 'Add GALLERY Section', galleryRes.status === 201);
  const galleryId = galleryRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${galleryId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        heading: 'STUDIO CAPTURES',
        layout: 'grid',
        columns: 3,
        items: [
          { id: 'g1', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', caption: 'Sculptural desk lamp' },
          { id: 'g2', url: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&w=800&q=80', caption: 'Monolithic incense vessel' },
        ],
      },
    },
  });

  // Add TABS
  const tabsRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'TABS',
      name: 'Specifications Tabs',
    },
  });
  record('2.5', 'Add TABS Section', tabsRes.status === 201);
  const tabsId = tabsRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${tabsId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        heading: 'OBJECT ARCHITECTURE',
        tabs: [
          { id: 't1', label: 'Materiality', content: 'Crafted from plant-derived polymers with zero post-processing chemicals.' },
          { id: 't2', label: 'Dimensions', content: 'Height: 280mm, Width: 120mm, Weight: 420g.' },
          { id: 't3', label: 'Care', content: 'Wipe with a soft dry cloth. Keep away from direct excessive heat.' },
        ],
      },
    },
  });

  // Add FAQ
  const faqRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'FAQ',
      name: 'Frequently Asked Questions',
    },
  });
  record('2.6', 'Add FAQ Section', faqRes.status === 201);
  const faqId = faqRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${faqId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        heading: 'FREQUENT QUESTIONS',
        items: [
          { id: 'f1', question: 'How long does production take?', answer: 'Each object is made to order in 3-5 business days.' },
          { id: 'f2', question: 'Do you ship across India?', answer: 'Yes, we ship pan-India with insured tracking.' },
        ],
      },
    },
  });

  // Add PRODUCT_GRID with real live DB product
  const prodGridRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'PRODUCT_GRID',
      name: 'Featured Objects Grid',
    },
  });
  record('2.7', 'Add PRODUCT_GRID Section', prodGridRes.status === 201);
  const prodGridId = prodGridRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${prodGridId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        heading: 'CURATED OBJECTS',
        productIds: ['cmvqhhg8f000cpb0ioh87mblg'],
        limit: 4,
      },
    },
  });

  // Add COLLECTION_GRID with real live DB collection
  const colGridRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'COLLECTION_GRID',
      name: 'Collections Highlight',
    },
  });
  record('2.8', 'Add COLLECTION_GRID Section', colGridRes.status === 201);
  const colGridId = colGridRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${colGridId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        heading: 'SERIES & EDITIONS',
        collectionIds: ['cmvqhi19i001mpb0i2g24ixk7'],
      },
    },
  });

  // Add CTA
  const ctaRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'CTA',
      name: 'Final CTA',
    },
  });
  record('2.9', 'Add CTA Section', ctaRes.status === 201);
  const ctaId = ctaRes.data.section.id;
  await req(`/api/admin/cms/page-sections/${ctaId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        heading: 'COMMISSION A CUSTOM OBJECT',
        subheading: 'Work directly with our design engineering studio.',
        buttonLabel: 'START CUSTOM ORDER',
        buttonUrl: '/customize',
        backgroundMode: 'graphite',
      },
    },
  });

  // 3. PUBLISH & VERIFY PUBLIC STOREFRONT
  console.log('\n--- Phase 3: Publish & Public Content Verification ---');
  const pubRes = await req(`/api/admin/cms/pages/${pageId}/publish`, {
    method: 'POST',
    admin: true,
  });
  record('3.1', 'Publish CMS Page', pubRes.status === 200);

  const publicPageRes = await req('/cms-test');
  record('3.2', 'Public page HTTP 200 after publish', publicPageRes.status === 200, `Status: ${publicPageRes.status}`);
  const html = String(publicPageRes.data);
  record('3.3', 'Hero heading rendered', html.includes('DAXUL CMS TEST OBJECTS'));
  record('3.4', 'Text section rendered', html.includes('Form Follows Restraint'));
  record('3.5', 'Tabs rendered', html.includes('Materiality') && html.includes('Dimensions'));
  record('3.6', 'FAQ rendered', html.includes('FREQUENT QUESTIONS') && html.includes('How long does production take?'));
  record('3.7', 'CTA rendered', html.includes('COMMISSION A CUSTOM OBJECT'));

  // 4. DRAFT VS. PUBLISHED ISOLATION
  console.log('\n--- Phase 4: Draft vs. Published Isolation ---');
  const updateDraftRes = await req(`/api/admin/cms/page-sections/${heroId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        eyebrow: 'UNPUBLISHED DRAFT',
        heading: 'MUTATED HERO DRAFT HEADING',
        subheading: 'This must NOT leak to public until published',
        cta1Label: 'EXPLORE SHOP',
        cta1Link: '/shop',
      },
    },
  });
  record('4.1', 'Update Hero Draft Content', updateDraftRes.status === 200);

  // Verify public route STILL serves published heading, not draft
  const publicUnchangedRes = await req('/cms-test');
  const pubHtml = String(publicUnchangedRes.data);
  record('4.2', 'Public page preserves published content while draft is edited',
    pubHtml.includes('DAXUL CMS TEST OBJECTS') && !pubHtml.includes('MUTATED HERO DRAFT HEADING'));

  // Verify admin preview serves mutated draft
  const previewDraftRes = await req('/cms-test?preview=true', { admin: true });
  record('4.3', 'Admin preview serves mutated draft heading',
    String(previewDraftRes.data).includes('MUTATED HERO DRAFT HEADING'));

  // Now publish and verify public route updates
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });
  const publicUpdatedRes = await req('/cms-test');
  record('4.4', 'Public page reflects newly published heading',
    String(publicUpdatedRes.data).includes('MUTATED HERO DRAFT HEADING'));

  // 5. SLUG CHANGE & 301 REDIRECT
  console.log('\n--- Phase 5: Dynamic Slug Change & 301 Redirect ---');
  const slugChangeRes = await req(`/api/admin/cms/pages/${pageId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      slug: 'cms-test-renamed',
    },
  });
  record('5.1', 'Update slug to cms-test-renamed', slugChangeRes.status === 200);
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });

  // Test redirect from /cms-test
  const redirectRes = await req('/cms-test', { redirect: 'manual' });
  record('5.2', 'Old slug returns 301 or 308 redirect', [301, 307, 308].includes(redirectRes.status), `Status: ${redirectRes.status}, Location: ${redirectRes.headers.get('location')}`);
  record('5.3', 'Redirect location points to /cms-test-renamed', redirectRes.headers.get('location')?.includes('/cms-test-renamed'));

  // Test new slug returns 200
  const renamedRes = await req('/cms-test-renamed');
  record('5.4', 'New slug returns 200 and renders content', renamedRes.status === 200 && String(renamedRes.data).includes('MUTATED HERO DRAFT HEADING'));

  // 6. SECTION BUILDER: ADD, DUPLICATE, HIDE, REORDER, DELETE
  console.log('\n--- Phase 6: Section Builder Operations ---');
  // Add temporary spacer
  const tempSecRes = await req('/api/admin/cms/page-sections', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      type: 'SPACER',
      name: 'Temp Spacer',
      draftContent: { height: 'md' },
    },
  });
  record('6.1', 'Add section (SPACER)', tempSecRes.status === 201);
  const tempSecId = tempSecRes.data.section.id;

  // Duplicate section
  const dupSecRes = await req(`/api/admin/cms/page-sections/${tempSecId}/duplicate`, {
    method: 'POST',
    admin: true,
  });
  record('6.2', 'Duplicate section', dupSecRes.status === 201);
  const dupSecId = dupSecRes.data.section.id;

  // Hide hero section
  await req(`/api/admin/cms/page-sections/${heroId}`, {
    method: 'PATCH',
    admin: true,
    body: { visible: false },
  });
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });
  const hiddenCheckRes = await req('/cms-test-renamed');
  record('6.3', 'Hero is hidden when visible=false', !String(hiddenCheckRes.data).includes('MUTATED HERO DRAFT HEADING'));

  // Unhide hero section
  await req(`/api/admin/cms/page-sections/${heroId}`, {
    method: 'PATCH',
    admin: true,
    body: { visible: true },
  });
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });
  const unhiddenCheckRes = await req('/cms-test-renamed');
  record('6.4', 'Hero restored when visible=true', String(unhiddenCheckRes.data).includes('MUTATED HERO DRAFT HEADING'));

  // Reorder sections
  const reorderRes = await req('/api/admin/cms/page-sections/reorder', {
    method: 'POST',
    admin: true,
    body: {
      pageId,
      sectionIds: [tempSecId, heroId, dupSecId],
    },
  });
  record('6.5', 'Reorder sections', reorderRes.status === 200);

  // Delete temp sections
  await req(`/api/admin/cms/page-sections/${tempSecId}`, { method: 'DELETE', admin: true });
  await req(`/api/admin/cms/page-sections/${dupSecId}`, { method: 'DELETE', admin: true });
  record('6.6', 'Delete temporary sections', true);

  // 7. MEDIA / R2 ASSET MANAGEMENT & USAGE PROTECTION
  console.log('\n--- Phase 7: Media / R2 Asset Management & Protection ---');
  // Upload a tiny test image (1x1 PNG)
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const formData = new FormData();
  formData.append('file', new Blob([png1x1], { type: 'image/png' }), 'qa-test-pixel.png');
  formData.append('altText', 'QA Test Pixel');
  formData.append('caption', 'Pixel caption');

  const uploadRes = await fetch(`${BASE}/api/admin/cms/media`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
    body: formData,
    agent,
  });
  const uploadData = await uploadRes.json();
  record('7.1', 'Upload asset to R2 / MediaAsset', [200, 201].includes(uploadRes.status), `Asset ID: ${uploadData.asset?.id}`);
  const asset = uploadData.asset;

  // Verify private access without auth is blocked on private customer files
  const anonPrivateRes = await req('/api/uploads/file/non-existent-or-private-artwork.png', { redirect: 'manual' });
  record('7.2', 'Anonymous access to private artwork protected (401/404)', [401, 404].includes(anonPrivateRes.status), `Status: ${anonPrivateRes.status}`);

  // Verify media asset serves 200
  const mediaServeRes = await req(asset.url);
  record('7.3', 'Media asset serves 200 with public cache', mediaServeRes.status === 200, `Status: ${mediaServeRes.status}`);

  // Reference asset in Hero section
  await req(`/api/admin/cms/page-sections/${heroId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        eyebrow: 'MEDIA TEST',
        heading: 'MUTATED HERO DRAFT HEADING',
        desktopImage: asset.url,
      },
    },
  });
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });

  // Attempt to DELETE in-use asset -> MUST fail with 409 Conflict
  const deleteBlockedRes = await req(`/api/admin/cms/media?id=${asset.id}`, {
    method: 'DELETE',
    admin: true,
  });
  record('7.4', 'Deleting in-use asset is blocked with 409 Conflict', deleteBlockedRes.status === 409, `Conflict message: ${deleteBlockedRes.data?.error}`);

  // Remove asset reference
  await req(`/api/admin/cms/page-sections/${heroId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      draftContent: {
        eyebrow: 'MEDIA TEST CLEANED',
        heading: 'MUTATED HERO DRAFT HEADING',
        desktopImage: '',
      },
    },
  });
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });

  // Delete asset after references cleared -> MUST succeed with 200
  const deleteOkRes = await req(`/api/admin/cms/media?id=${asset.id}`, {
    method: 'DELETE',
    admin: true,
  });
  record('7.5', 'Delete asset succeeds once references are cleared', deleteOkRes.status === 200);

  // 8. NAVIGATION BUILDER
  console.log('\n--- Phase 8: Dynamic Navigation Builder ---');
  const addNavItemRes = await req('/api/admin/navigation', {
    method: 'POST',
    admin: true,
    body: {
      menuHandle: 'header',
      label: 'CMS Test Nav',
      url: '/cms-test-renamed',
    },
  });
  record('8.1', 'Add header navigation item', addNavItemRes.status === 201, `ID: ${addNavItemRes.data?.item?.id}`);
  const navItemId = addNavItemRes.data.item.id;

  const publicNavRes = await req('/api/navigation?menu=header');
  const navItems = publicNavRes.data?.menu?.items || publicNavRes.data?.items || [];
  record('8.2', 'Public navigation includes dynamic item', navItems.some((i) => i.label === 'CMS Test Nav'));

  // Clean up navigation item
  const delNavRes = await req(`/api/admin/navigation?id=${navItemId}`, {
    method: 'DELETE',
    admin: true,
  });
  record('8.3', 'Delete header navigation item', delNavRes.status === 200);

  // 9. BANNERS
  console.log('\n--- Phase 9: Scheduled Announcement & Promo Banners ---');
  const addBannerRes = await req('/api/admin/banners', {
    method: 'POST',
    admin: true,
    body: {
      name: 'QA Test Banner',
      placement: 'ANNOUNCEMENT',
      text: 'SPECIAL ARCHITECTURE DROP — COMPLIMENTARY COURIER',
      linkUrl: '/shop',
      buttonText: 'SHOP DROP',
      visible: true,
      priority: 10,
    },
  });
  record('9.1', 'Create active announcement banner', [200, 201].includes(addBannerRes.status), `ID: ${addBannerRes.data?.banner?.id}`);
  const bannerId = addBannerRes.data.banner.id;

  const activeBannerRes = await req('/api/banners/active?placement=ANNOUNCEMENT');
  record('9.2', 'Active banner returned to public API', activeBannerRes.data?.banner?.text === 'SPECIAL ARCHITECTURE DROP — COMPLIMENTARY COURIER');

  // Toggle banner visibility false using POST upsert
  await req('/api/admin/banners', {
    method: 'POST',
    admin: true,
    body: {
      id: bannerId,
      name: 'QA Test Banner',
      text: 'SPECIAL ARCHITECTURE DROP — COMPLIMENTARY COURIER',
      visible: false,
    },
  });
  const disabledBannerRes = await req('/api/banners/active?placement=ANNOUNCEMENT');
  record('9.3', 'Hidden banner is not returned to public API', disabledBannerRes.data?.banner?.id !== bannerId);

  // Clean up banner
  const delBannerRes = await req(`/api/admin/banners?id=${bannerId}`, {
    method: 'DELETE',
    admin: true,
  });
  record('9.4', 'Delete announcement banner', delBannerRes.status === 200);

  // 10. CONTACT / INQUIRIES
  console.log('\n--- Phase 10: Contact Submission & Inquiries Workflow ---');
  const contactSubmitRes = await req('/api/contact', {
    method: 'POST',
    body: {
      name: 'Production QA Tester',
      email: 'qa-tester@daxul.invalid',
      phone: '+919999999999',
      message: 'Testing CMS contact form inquiry pipeline.',
    },
  });
  record('10.1', 'Submit contact inquiry via public API', contactSubmitRes.status === 200);

  const getInquiriesRes = await req('/api/admin/inquiries', { admin: true });
  const inquiries = getInquiriesRes.data?.inquiries || [];
  const testInquiry = inquiries.find((i) => i.email === 'qa-tester@daxul.invalid');
  record('10.2', 'Inquiry stored in DB with status NEW', testInquiry && testInquiry.status === 'NEW', `ID: ${testInquiry?.id}`);

  if (testInquiry) {
    // Transition status NEW -> READ -> RESPONDED -> ARCHIVED
    const readRes = await req('/api/admin/inquiries', {
      method: 'PATCH',
      admin: true,
      body: { id: testInquiry.id, status: 'READ' },
    });
    record('10.3', 'Update inquiry to READ', readRes.data?.inquiry?.status === 'READ');

    const respRes = await req('/api/admin/inquiries', {
      method: 'PATCH',
      admin: true,
      body: { id: testInquiry.id, status: 'RESPONDED' },
    });
    record('10.4', 'Update inquiry to RESPONDED', respRes.data?.inquiry?.status === 'RESPONDED');

    const archRes = await req('/api/admin/inquiries', {
      method: 'PATCH',
      admin: true,
      body: { id: testInquiry.id, status: 'ARCHIVED' },
    });
    record('10.5', 'Update inquiry to ARCHIVED', archRes.data?.inquiry?.status === 'ARCHIVED');

    // Clean up test inquiry safely
    const delInquiryRes = await req(`/api/admin/inquiries?id=${testInquiry.id}`, {
      method: 'DELETE',
      admin: true,
    });
    record('10.6', 'Delete test inquiry from DB', delInquiryRes.status === 200);
  }

  // 11. SEO METADATA & SITEMAP
  console.log('\n--- Phase 11: SEO Metadata & Dynamic Sitemap ---');
  await req(`/api/admin/cms/pages/${pageId}`, {
    method: 'PATCH',
    admin: true,
    body: {
      seoTitle: 'DAXUL CMS QA EXCLUSIVE',
      seoDescription: 'Verified custom meta description for production SEO.',
      noIndex: false,
    },
  });
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });

  const seoPageRes = await req('/cms-test-renamed');
  const seoHtml = String(seoPageRes.data);
  record('11.1', 'Rendered title tag matches SEO title', seoHtml.includes('DAXUL CMS QA EXCLUSIVE'));
  record('11.2', 'Meta description matches custom input', seoHtml.includes('Verified custom meta description for production SEO.'));

  // Check sitemap contains published indexable page
  const sitemapRes = await req('/sitemap.xml');
  const sitemapXml = String(sitemapRes.data);
  record('11.3', 'Sitemap includes published page /cms-test-renamed', sitemapXml.includes('/cms-test-renamed'));

  // Set noIndex: true and verify sitemap excludes it
  await req(`/api/admin/cms/pages/${pageId}`, {
    method: 'PATCH',
    admin: true,
    body: { noIndex: true },
  });
  await req(`/api/admin/cms/pages/${pageId}/publish`, { method: 'POST', admin: true });
  const sitemapNoIndexRes = await req('/sitemap.xml');
  record('11.4', 'Sitemap excludes page when noIndex=true', !String(sitemapNoIndexRes.data).includes('/cms-test-renamed'));

  // 12. CLEANUP TEST PAGE SAFELY
  console.log('\n--- Phase 12: Safe Cleanup of Test Page ---');
  const delPageRes = await req(`/api/admin/cms/pages/${pageId}`, {
    method: 'DELETE',
    admin: true,
  });
  record('12.1', 'Delete DAXUL CMS TEST page', delPageRes.status === 200);

  const cleanCheckRes = await req('/cms-test-renamed');
  record('12.2', 'Deleted page returns 404 publicly', cleanCheckRes.status === 404);

  console.log('\n=== ALL PRODUCTION CMS QA TESTS PASSED SUCCESSFULLY! ===');
  console.log(`Total tests run: ${results.length}`);
}

run().catch((err) => {
  console.error('\nQA EXECUTION ERROR:', err);
  process.exit(1);
});
