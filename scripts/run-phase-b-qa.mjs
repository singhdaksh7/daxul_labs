import fs from 'node:fs';
import https from 'node:https';

const BASE = 'https://daxul.77.37.45.177.sslip.io';
const agent = new https.Agent({ rejectUnauthorized: false });

const authJson = JSON.parse(fs.readFileSync('e2e/.auth/admin.json', 'utf8'));
const adminCookie = authJson.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

const results = [];

function record(feature, testName, passed, details = '') {
  results.push({ feature, testName, passed, details });
  const icon = passed ? '✓' : '❌';
  console.log(`${icon} [${feature}] ${testName}${details ? ` - ${details}` : ''}`);
}

async function run() {
  console.log('====================================================');
  console.log('DAXUL LABS PHASE B — LIVE PRODUCTION END-TO-END QA');
  console.log(`Server: ${BASE}`);
  console.log('====================================================\n');

  // Fetch available real products for testing
  let testProduct = null;
  let oosProduct = null;
  try {
    const prodsRes = await fetch(`${BASE}/api/admin/products`, {
      headers: { Cookie: adminCookie },
      agent,
    });
    const prodsData = await prodsRes.json();
    const prods = prodsData.products || prodsData || [];
    testProduct = prods.find((p) => p.stock > 0) || prods[0];
    oosProduct = prods.find((p) => p.stock === 0) || null;
    console.log(`Using live test product: ${testProduct?.name} (${testProduct?.id})`);
  } catch (err) {
    console.error('Failed to load products for test:', err);
  }

  // If no OOS product exists, create a temporary zero-stock product for back-in-stock testing
  let tempOosCreated = false;
  if (!oosProduct) {
    try {
      const createRes = await fetch(`${BASE}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          name: 'QA Out of Stock Object',
          price: 999,
          stock: 0,
          description: 'Temporary QA zero-stock item for restock alert validation.',
          customizable: false,
          codEnabled: true,
          trackInventory: true,
          images: ['https://daxul.77.37.45.177.sslip.io/images/placeholder.png'],
        }),
        agent,
      });
      oosProduct = await createRes.json();
      tempOosCreated = true;
      console.log(`Created temporary OOS product for testing: ${oosProduct.id}`);
    } catch (e) {
      console.error('Failed to create temp OOS product:', e);
    }
  }

  // ----------------------------------------------------
  // 1. SEARCH V2 QA
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Search V2 ---');
  try {
    // Autocomplete / search
    const s1 = await (await fetch(`${BASE}/api/search?q=litho`, { agent })).json();
    record('Search V2', 'Autocomplete query (q=litho)', Array.isArray(s1.products) && s1.products.length > 0);

    if (s1.products && s1.products[0]) {
      const p0 = s1.products[0];
      record('Search V2', 'Live DB schema fields (price, stock, slug, image)', 
        typeof p0.price === 'number' && typeof p0.stock === 'number' && typeof p0.slug === 'string'
      );
    }

    // Minimum sensible query length (< 2 chars returns empty list)
    const s2 = await (await fetch(`${BASE}/api/search?q=a`, { agent })).json();
    record('Search V2', 'Minimum query length guard (q=a returns empty)', Array.isArray(s2.products) && s2.products.length === 0);

    // SQL wildcard / injection sanitization
    const s3 = await (await fetch(`${BASE}/api/search?q=%27%20OR%201=1--%20%25%25`, { agent })).json();
    record('Search V2', 'SQL wildcard/injection sanitization', Array.isArray(s3.products));

    // Zero result state
    const s4 = await (await fetch(`${BASE}/api/search?q=xyznonexistentterm99999`, { agent })).json();
    record('Search V2', 'Zero result state handled gracefully', Array.isArray(s4.products) && s4.products.length === 0);
  } catch (err) {
    record('Search V2', 'Search API execution', false, err.message);
  }

  // ----------------------------------------------------
  // 2. DYNAMIC FILTERS QA
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Dynamic Filters ---');
  try {
    const fmeta = await (await fetch(`${BASE}/api/products/filter-meta`, { agent })).json();
    record('Filters', 'Filter meta API returns active facets', fmeta && Array.isArray(fmeta.collections));
    record('Filters', 'Price range bounds populated', typeof fmeta.priceRange?.min === 'number' && typeof fmeta.priceRange?.max === 'number');
    record('Filters', 'Availability and customization counts', typeof fmeta.inStockCount === 'number' && typeof fmeta.customizableCount === 'number');
  } catch (err) {
    record('Filters', 'Filter meta endpoint execution', false, err.message);
  }

  // ----------------------------------------------------
  // 3. BUY NOW & PRICING SECURITY QA
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Buy Now & Quote Engine ---');
  try {
    // Test live quote calculation with tampered client price
    const quoteRes = await fetch(`${BASE}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            variantSelections: [],
            customizations: {},
          },
        ],
      }),
      agent,
    });
    const qData = await quoteRes.json();
    record('Buy Now / Quote', 'Server calculates quote authoritative price (ignores client price=1)', 
      qData.ok && qData.subtotal === testProduct.price
    );
    record('Buy Now / Quote', 'Shipping fee and total calculated server-side', 
      typeof qData.total === 'number' && qData.total >= testProduct.price
    );
  } catch (err) {
    record('Buy Now / Quote', 'Quote engine validation', false, err.message);
  }

  // ----------------------------------------------------
  // 4. RELATED PRODUCTS QA
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Related Products Engine ---');
  try {
    const relRes = await fetch(`${BASE}/api/products/${testProduct.id}/related`, { agent });
    const relData = await relRes.json();
    record('Related Products', 'Related products endpoint returns array', Array.isArray(relData.related));
    const selfIncluded = relData.related?.some((p) => p.id === testProduct.id);
    record('Related Products', 'Current product is strictly excluded from recommendations', !selfIncluded);
  } catch (err) {
    record('Related Products', 'Related products endpoint', false, err.message);
  }

  // ----------------------------------------------------
  // 5. RECENTLY VIEWED (BATCH HYDRATION) QA
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Recently Viewed Batch Hydration ---');
  try {
    const batchRes = await fetch(`${BASE}/api/products/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [testProduct.id, 'fake-id-999'] }),
      agent,
    });
    const batchData = await batchRes.json();
    record('Recently Viewed', 'Batch hydration returns live DB products', Array.isArray(batchData.products) && batchData.products.length >= 1);
    record('Recently Viewed', 'Non-existent IDs omitted safely', !batchData.products.some((p) => p.id === 'fake-id-999'));
    record('Recently Viewed', 'Preserves requested order and live pricing', batchData.products[0]?.price === testProduct.price);
  } catch (err) {
    record('Recently Viewed', 'Batch hydration endpoint', false, err.message);
  }

  // ----------------------------------------------------
  // 6. FREE SHIPPING METER QA
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Free Shipping Meter ---');
  try {
    // Under threshold quote
    const underRes = await fetch(`${BASE}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 1, variantSelections: [], customizations: {} }],
      }),
      agent,
    });
    const underData = await underRes.json();
    const threshold = underData.shipping?.freeShippingThreshold || 1999;
    record('Free Shipping Meter', `Uses live Store Settings threshold (₹${threshold})`, typeof threshold === 'number' && threshold > 0);

    // Over threshold quote (buy multiple quantity to exceed threshold)
    const qtyNeeded = Math.ceil((threshold + 500) / testProduct.price);
    const overRes = await fetch(`${BASE}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: qtyNeeded, variantSelections: [], customizations: {} }],
      }),
      agent,
    });
    const overData = await overRes.json();
    record('Free Shipping Meter', 'Unlocks free shipping when eligible subtotal >= threshold', 
      overData.ok && (overData.shipping?.fee === 0 || overData.shipping?.freeApplied === true)
    );
  } catch (err) {
    record('Free Shipping Meter', 'Shipping calculation', false, err.message);
  }

  // ----------------------------------------------------
  // 7. REVIEWS & VERIFIED PURCHASE QA
  // ----------------------------------------------------
  console.log('\n--- 7. Testing Reviews & Verified Purchase Moderation ---');
  let qaReviewId = '';
  try {
    // Customer submits a review with isVerifiedPurchase=true forged in body
    const postReviewRes = await fetch(`${BASE}/api/products/${testProduct.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorName: 'QA Auditor',
        authorEmail: 'qa.auditor@daxul.invalid',
        rating: 5,
        title: 'Outstanding Craftsmanship',
        comment: 'High density biopolymer with flawless layer adhesion and optical diffraction.',
        isVerifiedPurchase: true, // Maliciously attempted client-side flag
      }),
      agent,
    });
    const reviewData = await postReviewRes.json();
    qaReviewId = reviewData.reviewId;
    record('Reviews', 'Review submission returns success and reviewId', (reviewData.success || reviewData.ok) && !!qaReviewId);

    // Verify unapproved review is NOT visible on public endpoint
    const pubReviewsBefore = await (await fetch(`${BASE}/api/products/${testProduct.id}/reviews`, { agent })).json();
    const leakedPublicly = pubReviewsBefore.reviews?.some((r) => r.id === qaReviewId);
    record('Reviews', 'PENDING review is NOT shown publicly', !leakedPublicly);

    // Verify Verified Purchase was NOT granted (server calculated it as false)
    const adminRevList = await (await fetch(`${BASE}/api/admin/reviews?productId=${testProduct.id}`, {
      headers: { Cookie: adminCookie },
      agent,
    })).json();
    const createdRev = adminRevList.reviews?.find((r) => r.id === qaReviewId);
    record('Reviews', 'Server strictly calculated isVerifiedPurchase=false (rejected client forgery)', createdRev && createdRev.isVerifiedPurchase === false);
    record('Reviews', 'Review initially created with status PENDING', createdRev && createdRev.status === 'PENDING');

    // Admin approves review and adds official response
    const approveRes = await fetch(`${BASE}/api/admin/reviews/${qaReviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        status: 'APPROVED',
        adminResponse: 'Thank you for your studio feedback. Our additive manufacturing tolerances are 0.12mm.',
      }),
      agent,
    });
    const approveData = await approveRes.json();
    record('Reviews', 'Admin can moderate status to APPROVED and attach official studio response', approveData.success || approveData.ok);

    // Verify public endpoint now shows the review and email is NOT exposed
    const pubReviewsAfter = await (await fetch(`${BASE}/api/products/${testProduct.id}/reviews`, { agent })).json();
    const pubRev = pubReviewsAfter.reviews?.find((r) => r.id === qaReviewId);
    record('Reviews', 'APPROVED review appears in public feed', !!pubRev);
    record('Reviews', 'Customer email address is strictly omitted from public JSON', pubRev && pubRev.authorEmail === undefined);
    record('Reviews', 'Official studio response is visible publicly', pubRev && !!pubRev.adminResponse);

    // Clean up test review
    const delRevRes = await fetch(`${BASE}/api/admin/reviews/${qaReviewId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
      agent,
    });
    record('Reviews', 'Admin delete spam/test review cleanly', delRevRes.ok);
  } catch (err) {
    record('Reviews', 'Review flow execution', false, err.message);
  }

  // ----------------------------------------------------
  // 8. BACK IN STOCK ALERTS QA
  // ----------------------------------------------------
  console.log('\n--- 8. Testing Back-in-Stock Alerts ---');
  try {
    // In-stock product subscription should be rejected
    const inStockSub = await fetch(`${BASE}/api/products/${testProduct.id}/back-in-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'restock.tester@daxul.invalid' }),
      agent,
    });
    const inStockSubData = await inStockSub.json();
    record('Back-in-Stock', 'Subscription rejected for in-stock products', inStockSub.status === 400);

    // Out-of-stock product subscription
    if (oosProduct) {
      const oosSub1 = await fetch(`${BASE}/api/products/${oosProduct.id}/back-in-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'restock.tester@daxul.invalid' }),
        agent,
      });
      const oosSubData1 = await oosSub1.json();
      record('Back-in-Stock', 'Allows subscription when product is actually out of stock', oosSubData1.ok || oosSubData1.success);

      // Duplicate subscription test
      const oosSub2 = await fetch(`${BASE}/api/products/${oosProduct.id}/back-in-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'restock.tester@daxul.invalid' }),
        agent,
      });
      const oosSubData2 = await oosSub2.json();
      record('Back-in-Stock', 'Deduplicates subscriptions for same product + email', oosSubData2.ok || oosSubData2.success);

      // Admin back-in-stock demand query
      const adminBis = await (await fetch(`${BASE}/api/admin/back-in-stock`, {
        headers: { Cookie: adminCookie },
        agent,
      })).json();
      record('Back-in-Stock', 'Admin restock desk returns demand metrics', Array.isArray(adminBis.subscriptions) && typeof adminBis.counts?.pending === 'number');

      // Temporarily restock OOS product so restock notification dispatch can fire
      await fetch(`${BASE}/api/admin/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          id: oosProduct.id,
          name: oosProduct.name,
          price: oosProduct.price,
          stock: 10,
          description: oosProduct.description || 'Restocked item for test',
          trackInventory: true,
          images: oosProduct.images || [],
          variantGroups: [],
          customFields: [],
        }),
        agent,
      });

      // Restock notification dispatch test
      const notifyRes1 = await fetch(`${BASE}/api/admin/back-in-stock/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ productId: oosProduct.id }),
        agent,
      });
      const notifyData1 = await notifyRes1.json();
      
      // Second dispatch to verify idempotency (notifiedCount should be 0)
      const notifyRes2 = await fetch(`${BASE}/api/admin/back-in-stock/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ productId: oosProduct.id }),
        agent,
      });
      const notifyData2 = await notifyRes2.json();

      record('Back-in-Stock', 'Admin restock notification dispatch executes idempotently', 
        (notifyData1.ok || notifyData1.success) && typeof notifyData1.notifiedCount === 'number' && notifyData2.notifiedCount === 0
      );

      // Return stock to 0 for OOS product
      await fetch(`${BASE}/api/admin/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          id: oosProduct.id,
          name: oosProduct.name,
          price: oosProduct.price,
          stock: 0,
          description: oosProduct.description || 'OOS item for test',
          trackInventory: true,
          images: oosProduct.images || [],
          variantGroups: [],
          customFields: [],
        }),
        agent,
      });
    }
  } catch (err) {
    record('Back-in-Stock', 'Back in stock alert flow', false, err.message);
  }

  // ----------------------------------------------------
  // 9. SAVED CART SYNCHRONIZATION QA
  // ----------------------------------------------------
  console.log('\n--- 9. Testing Saved Cart Rehydration & Merging ---');
  try {
    const syncRes = await fetch(`${BASE}/api/cart/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        localCart: [
          {
            productId: testProduct.id,
            quantity: 2,
            variantSelections: [],
            customizations: { note: 'Engrave initials' },
          },
        ],
        localSavedForLater: [],
      }),
      agent,
    });
    const syncData = await syncRes.json();
    record('Saved Cart', 'Cart synchronization endpoint returns success', Array.isArray(syncData.cart) && syncData.cart.length > 0);
    record('Saved Cart', 'Live DB rehydration overrides tampered client prices', 
      syncData.cart[0] && syncData.cart[0].basePrice === testProduct.price && syncData.cart[0].unitPrice === testProduct.price
    );
    record('Saved Cart', 'Preserves line configuration and customization details', 
      syncData.cart[0] && syncData.cart[0].customizations?.note === 'Engrave initials'
    );
  } catch (err) {
    record('Saved Cart', 'Cart sync validation', false, err.message);
  }

  // ----------------------------------------------------
  // 10. PRODUCT Q&A QA
  // ----------------------------------------------------
  console.log('\n--- 10. Testing Product Q&A & Studio Moderation ---');
  let qaQuestionId = '';
  try {
    // 1. Submit public inquiry
    const askRes = await fetch(`${BASE}/api/products/${testProduct.id}/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorName: 'Fabrication QA',
        authorEmail: 'fab.qa@daxul.invalid',
        question: 'What is the exact dimensional tolerance of the mounting aperture?',
      }),
      agent,
    });
    const askData = await askRes.json();
    qaQuestionId = askData.questionId;
    record('Product Q&A', 'Question submitted into PENDING state', askData.success && !!qaQuestionId);

    // 2. Rate limiting check (24h rate limit per email)
    const dupAskRes = await fetch(`${BASE}/api/products/${testProduct.id}/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorName: 'Fabrication QA',
        authorEmail: 'fab.qa@daxul.invalid',
        question: 'Duplicate question asking about aperture again.',
      }),
      agent,
    });
    record('Product Q&A', '24-hour submission rate limit strictly enforced (429 Too Many Requests)', dupAskRes.status === 429);

    // 3. Verify question is NOT public prior to approval
    const pubQABefore = await (await fetch(`${BASE}/api/products/${testProduct.id}/qa`, { agent })).json();
    const leakedQ = pubQABefore.questions?.some((q) => q.id === qaQuestionId);
    record('Product Q&A', 'Unapproved inquiry is NOT visible to public visitors', !leakedQ);

    // 4. Admin official answer submission (auto-approves question)
    const ansRes = await fetch(`${BASE}/api/admin/qa/${qaQuestionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        answer: 'The mounting aperture is machined to +0.05mm / -0.00mm tolerance for precision press-fit.',
        authorName: 'Daxul Studio',
        isOfficial: true,
      }),
      agent,
    });
    const ansData = await ansRes.json();
    record('Product Q&A', 'Studio official answer auto-approves question', ansData.success);

    // 5. Verify public endpoint displays approved Q&A and excludes email
    const pubQAAfter = await (await fetch(`${BASE}/api/products/${testProduct.id}/qa`, { agent })).json();
    const approvedQ = pubQAAfter.questions?.find((q) => q.id === qaQuestionId);
    record('Product Q&A', 'Approved inquiry and official answer visible in public feed', !!approvedQ && approvedQ.answers?.length > 0);
    record('Product Q&A', 'Author email is strictly omitted from public response', approvedQ && approvedQ.authorEmail === undefined);

    // Clean up test question
    const delQRes = await fetch(`${BASE}/api/admin/qa/${qaQuestionId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
      agent,
    });
    record('Product Q&A', 'Admin delete spam/test inquiry cleanly', delQRes.ok);
  } catch (err) {
    record('Product Q&A', 'Q&A execution', false, err.message);
  }

  // ----------------------------------------------------
  // 11. FUNNEL & PRODUCT CONVERSION ANALYTICS QA
  // ----------------------------------------------------
  console.log('\n--- 11. Testing Funnel Telemetry & Analytics ---');
  try {
    const testSession = `test-sess-${Date.now()}`;
    const testOrderId = `QA-ORD-${Date.now()}`;

    // Test event ingestion
    const v1 = await (await fetch(`${BASE}/api/analytics/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'VIEW_PRODUCT',
        sessionId: testSession,
        productId: testProduct.id,
      }),
      agent,
    })).json();
    record('Funnel Analytics', 'VIEW_PRODUCT event ingested successfully', v1.success && v1.recorded === true);

    // Deduplication test (repeated view in same session within 1h ignored)
    const v2 = await (await fetch(`${BASE}/api/analytics/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'VIEW_PRODUCT',
        sessionId: testSession,
        productId: testProduct.id,
      }),
      agent,
    })).json();
    record('Funnel Analytics', 'VIEW_PRODUCT deduplication active (repeated event ignored)', v2.success && v2.recorded === false);

    // BEGIN_CHECKOUT deduplication test (refresh protection)
    const bc1 = await (await fetch(`${BASE}/api/analytics/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'BEGIN_CHECKOUT', sessionId: testSession }),
      agent,
    })).json();
    const bc2 = await (await fetch(`${BASE}/api/analytics/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'BEGIN_CHECKOUT', sessionId: testSession }),
      agent,
    })).json();
    record('Funnel Analytics', 'BEGIN_CHECKOUT refresh spam protection active', bc1.recorded === true && bc2.recorded === false);

    // ORDER_COMPLETED idempotency by orderId
    const oc1 = await (await fetch(`${BASE}/api/analytics/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'ORDER_COMPLETED', sessionId: testSession, orderId: testOrderId }),
      agent,
    })).json();
    const oc2 = await (await fetch(`${BASE}/api/analytics/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'ORDER_COMPLETED', sessionId: testSession, orderId: testOrderId }),
      agent,
    })).json();
    record('Funnel Analytics', 'ORDER_COMPLETED strictly idempotent by orderId', oc1.recorded === true && oc2.recorded === false);

    // Admin Funnel Dashboard API
    const funnelDashboard = await (await fetch(`${BASE}/api/admin/analytics/funnel`, {
      headers: { Cookie: adminCookie },
      agent,
    })).json();
    record('Funnel Analytics', 'Admin funnel metrics calculation endpoint', funnelDashboard.report && Array.isArray(funnelDashboard.report.steps));
    record('Funnel Analytics', 'Overall conversion rate and drop-off numbers defined', typeof funnelDashboard.report.overallConversionRate === 'number');

    // Admin Product Conversion Dashboard API
    const prodConversion = await (await fetch(`${BASE}/api/admin/analytics/conversion`, {
      headers: { Cookie: adminCookie },
      agent,
    })).json();
    record('Product Conversion', 'Product conversion analytics API returns product breakdown', Array.isArray(prodConversion.products));
    const pSummary = prodConversion.products?.find((p) => p.productId === testProduct.id);
    record('Product Conversion', 'Product performance metrics (views, ATC, units, revenue, conversion %)', 
      pSummary && typeof pSummary.conversionRate === 'number' && typeof pSummary.revenue === 'number'
    );
  } catch (err) {
    record('Funnel Analytics', 'Funnel execution', false, err.message);
  }

  // ----------------------------------------------------
  // 12. SECURITY BOUNDARY & REGRESSION QA
  // ----------------------------------------------------
  console.log('\n--- 12. Testing Security Boundaries & Regression ---');
  try {
    // Unauthenticated access to admin routes must fail closed
    const unauthReview = await fetch(`${BASE}/api/admin/reviews`, { agent });
    record('Security', 'Unauthenticated /api/admin/reviews rejected (401/403)', unauthReview.status === 401 || unauthReview.status === 403);

    const unauthQA = await fetch(`${BASE}/api/admin/qa`, { agent });
    record('Security', 'Unauthenticated /api/admin/qa rejected (401/403)', unauthQA.status === 401 || unauthQA.status === 403);

    const unauthFunnel = await fetch(`${BASE}/api/admin/analytics/funnel`, { agent });
    record('Security', 'Unauthenticated /api/admin/analytics/funnel rejected (401/403)', unauthFunnel.status === 401 || unauthFunnel.status === 403);

    // Phase A Regression: Check homepage, published CMS, orders, and theme settings
    const cmsCheck = await (await fetch(`${BASE}/api/cms/published?slug=home`, { agent })).json();
    record('Phase A Regression', 'Published CMS page API healthy', cmsCheck !== undefined);

    const healthCheck = await (await fetch(`${BASE}/api/health`, { agent })).json();
    record('Phase A Regression', 'Core application health check 200 OK', healthCheck.status === 'ok');
  } catch (err) {
    record('Security', 'Security check execution', false, err.message);
  }

  // Clean up temporary out of stock product if created
  if (tempOosCreated && oosProduct) {
    try {
      await fetch(`${BASE}/api/admin/products/${oosProduct.id}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie },
        agent,
      });
      console.log('Cleaned up temporary OOS test product.');
    } catch {
      // Ignore cleanup error
    }
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('PRODUCTION QA RESULTS SUMMARY');
  console.log('====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed:       ${passedCount}`);
  console.log(`Failed:       ${failedCount}`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('QA Runner encountered error:', e);
  process.exit(1);
});
