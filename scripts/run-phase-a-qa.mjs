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
  console.log('DAXUL LABS PHASE A — LIVE PRODUCTION END-TO-END QA');
  console.log(`Server: ${BASE}`);
  console.log('====================================================\n');

  // 1. PINCODE ESTIMATION ENGINE
  console.log('--- 1. Testing Pincode Engine ---');
  try {
    const r1 = await (await fetch(`${BASE}/api/shipping/pincode-check?pincode=110001`, { agent })).json();
    record('Pincode', 'Delhi NCR Metro (110001)', r1.serviceable && r1.tier === 'metro' && r1.codAvailable);

    const r2 = await (await fetch(`${BASE}/api/shipping/pincode-check?pincode=400001`, { agent })).json();
    record('Pincode', 'Mumbai Metro (400001)', r2.serviceable && r2.tier === 'metro' && r2.state === 'Maharashtra');

    const r3 = await (await fetch(`${BASE}/api/shipping/pincode-check?pincode=302001`, { agent })).json();
    record('Pincode', 'Jaipur Tier-1 (302001)', r3.serviceable && r3.tier === 'tier1' && r3.estimatedTransitDaysMin >= 3);

    const r4 = await (await fetch(`${BASE}/api/shipping/pincode-check?pincode=000000`, { agent })).json();
    record('Pincode', 'Invalid Pincode Rejection (000000)', !r4.valid && !r4.serviceable);

    const r5 = await (await fetch(`${BASE}/api/shipping/pincode-check?pincode=ABCXYZ`, { agent })).json();
    record('Pincode', 'Non-numeric PIN rejection', !r5.valid && !r5.serviceable);
  } catch (err) {
    record('Pincode', 'Pincode API reachable', false, err.message);
  }

  // 2. TEMPORARY QA PRODUCT CREATION
  console.log('\n--- 2. Setting Up Temporary QA Test Product ---');
  let testProductId = '';
  try {
    const createProdRes = await fetch(`${BASE}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'QA Lithophane Ambient Lamp',
        price: 1499,
        stock: 50,
        description: 'Precision engineered parametric lithophane night lamp.',
        customizable: false,
        codEnabled: true,
        trackInventory: true,
        images: ['https://daxul.77.37.45.177.sslip.io/images/placeholder.png'],
      }),
      agent,
    });
    const prodData = await createProdRes.json();
    if (prodData.success && prodData.product?.id) {
      testProductId = prodData.product.id;
      record('Catalog', 'Temporary QA Product Created', true, `Product ID: ${testProductId}`);
    } else {
      record('Catalog', 'Temporary QA Product Created', false, prodData.error || 'Failed');
    }
  } catch (err) {
    record('Catalog', 'Product setup', false, err.message);
  }

  // 3. ABANDONED CHECKOUT TELEMETRY & STUDIO OS RECOVERY
  console.log('\n--- 3. Testing Abandoned Checkout Telemetry ---');
  let testCartId = `qa-cart-${Date.now()}`;
  let recoveryToken = '';
  try {
    const abRes = await fetch(`${BASE}/api/checkout/abandoned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartId: testCartId,
        email: `qa-abandoned-${Date.now()}@daxul.invalid`,
        phone: '9876543210',
        name: 'QA Abandoned Customer',
        subtotal: 1499,
        estimatedTotal: 1599,
        currentStep: 'payment',
        items: [{ name: 'Lithophane Ambient Lamp', quantity: 1, unitPrice: 1499 }],
      }),
      agent,
    });
    const abData = await abRes.json();
    recoveryToken = abData.recoveryToken;
    record('Abandoned Checkout', 'Session Telemetry Ingestion', abRes.ok && !!recoveryToken, `Token: ${recoveryToken?.slice(0, 8)}...`);

    // Verify Admin Dashboard access
    const adminAbRes = await fetch(`${BASE}/api/admin/abandoned-checkouts`, {
      headers: { Cookie: adminCookie },
      agent,
    });
    const adminAbData = await adminAbRes.json();
    const found = adminAbData.checkouts?.some((s) => s.cartId === testCartId);
    record('Abandoned Checkout', 'Studio OS Abandoned Dashboard View', adminAbRes.ok && found);

    // Verify unauthenticated security rejection
    const unauthAbRes = await fetch(`${BASE}/api/admin/abandoned-checkouts`, { agent });
    record('Abandoned Checkout', 'Security: 401 for unauthorized callers', unauthAbRes.status === 401);
  } catch (err) {
    record('Abandoned Checkout', 'Flow execution', false, err.message);
  }

  // 4. GUEST CHECKOUT & AUTOMATIC JOB TICKET CREATION
  console.log('\n--- 4. Testing Guest Checkout Flow ---');
  let guestEmail = `qa-guest-${Date.now()}@daxul.invalid`;
  let guestOrderNumber = '';
  let guestOrderId = '';
  try {
    const orderRes = await fetch(`${BASE}/api/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: testProductId, quantity: 1 }],
        paymentMethod: 'cod',
        customer: {
          name: 'QA Guest User',
          email: guestEmail,
          phone: '9876543210',
          street: '42 Cyber City, DLF Phase 2',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          country: 'India',
        },
      }),
      agent,
    });
    const orderData = await orderRes.json();
    if (orderData.success) {
      guestOrderNumber = orderData.orderNumber;
      guestOrderId = orderData.orderId;
      record('Guest Checkout', 'Order Placement without Registration', true, `Order #${guestOrderNumber}`);
    } else {
      record('Guest Checkout', 'Order Placement without Registration', false, orderData.error || 'Failed');
    }
  } catch (err) {
    record('Guest Checkout', 'Order Placement', false, err.message);
  }

  // 5. GUEST ORDER LOOKUP & TRACKING
  console.log('\n--- 5. Testing Guest Order Tracking ---');
  try {
    if (guestOrderNumber) {
      const trackRes = await fetch(`${BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: guestOrderNumber, email: guestEmail }),
        agent,
      });
      const trackData = await trackRes.json();
      record('Order Tracking', 'Guest Lookup by Order + Email', trackRes.ok && trackData.order?.orderNumber === guestOrderNumber);

      const trackWrong = await fetch(`${BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: guestOrderNumber, email: 'wrong@daxul.invalid' }),
        agent,
      });
      record('Order Tracking', 'Security: Rejection of wrong email', trackWrong.status === 404);
    }
  } catch (err) {
    record('Order Tracking', 'Tracking endpoint check', false, err.message);
  }

  // 6. 1-CLICK POST-PURCHASE ACCOUNT UPGRADE
  console.log('\n--- 6. Testing 1-Click Post-Purchase Account Conversion ---');
  let customerCookie = '';
  const customerPassword = 'SecurePassword123!';
  try {
    if (guestOrderNumber) {
      const regRes = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: guestEmail,
          password: customerPassword,
          name: 'QA Converted Customer',
          phone: '9876543210',
          orderNumber: guestOrderNumber,
        }),
        agent,
      });
      const regData = await regRes.json();
      record('Account Upgrade', 'Guest to Registered Account Conversion', regRes.ok && regData.success);

      // Now authenticate as the new customer
      const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { agent });
      const { csrfToken } = await csrfRes.json();
      const setCookie = csrfRes.headers.get('set-cookie') || '';
      const csrfCookie = setCookie.split(';')[0];

      const params = new URLSearchParams({
        csrfToken,
        email: guestEmail,
        password: customerPassword,
        json: 'true',
      });
      const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: csrfCookie,
        },
        body: params.toString(),
        agent,
        redirect: 'manual',
      });
      const rawCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie') || ''];
      customerCookie = rawCookies.map((c) => c.split(';')[0]).join('; ');
      record('Account Upgrade', 'Customer Session Authentication', loginRes.status === 200 && !!customerCookie);
    }
  } catch (err) {
    record('Account Upgrade', 'Registration execution', false, err.message);
  }

  // 7. CUSTOMER ACCOUNT V2 APIS & ADDRESS SYNC
  console.log('\n--- 7. Testing Customer Account V2 APIs ---');
  try {
    if (customerCookie) {
      // Profile
      const profRes = await fetch(`${BASE}/api/account/profile`, { headers: { Cookie: customerCookie }, agent });
      const profData = await profRes.json();
      record('Customer Account', 'Profile retrieval', profRes.ok && profData.user?.email === guestEmail.toLowerCase());

      // Addresses: verify default address was created automatically from previous order!
      const addrRes = await fetch(`${BASE}/api/account/addresses`, { headers: { Cookie: customerCookie }, agent });
      const addrData = await addrRes.json();
      const hasDefault = addrData.addresses?.some((a) => a.isDefault && a.city === 'Gurugram');
      record('Customer Account', 'Previous Order Address Saved as Default', addrRes.ok && hasDefault);

      // Order history: verify previous order is linked to this account!
      const ordRes = await fetch(`${BASE}/api/account/orders`, { headers: { Cookie: customerCookie }, agent });
      const ordData = await ordRes.json();
      const hasLinkedOrder = ordData.orders?.some((o) => o.orderNumber === guestOrderNumber);
      record('Customer Account', 'Previous Guest Order Linked to Account', ordRes.ok && hasLinkedOrder);

      // Wishlist: Add, Get, Remove
      const addWish = await fetch(`${BASE}/api/account/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
        body: JSON.stringify({ productId: testProductId }),
        agent,
      });
      record('Wishlist', 'Database Wishlist Sync (Add item)', addWish.ok);

      const getWish = await fetch(`${BASE}/api/account/wishlist`, { headers: { Cookie: customerCookie }, agent });
      const wishData = await getWish.json();
      const inWish = wishData.wishlist?.some((p) => p.id === testProductId);
      record('Wishlist', 'Database Wishlist Retrieval & Content Verification', getWish.ok && inWish);
    }
  } catch (err) {
    record('Customer Account', 'Account portal checks', false, err.message);
  }

  // 8. TAX INVOICE GENERATION & PERMISSION AUDIT
  console.log('\n--- 8. Testing Tax Invoice Access & Security ---');
  try {
    if (guestOrderNumber) {
      // 1. Admin access
      const adminInv = await fetch(`${BASE}/api/orders/${guestOrderNumber}/invoice`, { headers: { Cookie: adminCookie }, agent });
      const adminInvHtml = await adminInv.text();
      record('Tax Invoice', 'Admin Printable Tax Invoice Access', adminInv.status === 200 && /tax invoice/i.test(adminInvHtml));

      // 2. Customer owner access
      if (customerCookie) {
        const custInv = await fetch(`${BASE}/api/orders/${guestOrderNumber}/invoice`, { headers: { Cookie: customerCookie }, agent });
        record('Tax Invoice', 'Authenticated Customer Owner Invoice Access', custInv.status === 200);
      }

      // 3. Unauthorized access
      const unauthInv = await fetch(`${BASE}/api/orders/${guestOrderNumber}/invoice`, { agent });
      record('Tax Invoice', 'Security: 401/403 Unauthorized for Public Access', [401, 403].includes(unauthInv.status));
    }
  } catch (err) {
    record('Tax Invoice', 'Invoice checks', false, err.message);
  }

  // 9. 3D PRODUCTION FLEET & JOB TICKETS
  console.log('\n--- 9. Testing 3D Production Job Tickets & Printer Fleet ---');
  let testPrinterId = '';
  try {
    // 1. Create a temporary test printer
    const createPrRes = await fetch(`${BASE}/api/admin/production/printers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Bambu Lab X1-Carbon #QA-Test',
        model: 'Bambu X1-Carbon Combo',
        location: 'Studio Bench 1',
        status: 'AVAILABLE',
      }),
      agent,
    });
    const prData = await createPrRes.json();
    testPrinterId = prData.printer?.id;
    record('Production Fleet', 'Temporary 3D Printer Provisioning', createPrRes.ok && !!testPrinterId);

    // 2. Fetch Job Tickets for our order
    const ticketsRes = await fetch(`${BASE}/api/admin/production/tickets`, { headers: { Cookie: adminCookie }, agent });
    const ticketsData = await ticketsRes.json();
    const orderTicket = ticketsData.tickets?.find((t) => t.orderId === guestOrderId);
    record('Production Fleet', 'Automatic ProductionJobTicket Generation', !!orderTicket, orderTicket ? `Ticket #${orderTicket.ticketNumber}` : 'None found');

    if (orderTicket) {
      // Advance Ticket: QUEUED -> PRINTING (Assign to printer)
      const advRes = await fetch(`${BASE}/api/admin/production/tickets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          ticketId: orderTicket.id,
          status: 'PRINTING',
          printerId: testPrinterId,
          actualGrams: 142.5,
        }),
        agent,
      });
      record('Production Fleet', 'Job Ticket Status Progression (PRINTING)', advRes.ok);

      // Perform Digital QC Checklist
      const qcRes = await fetch(`${BASE}/api/admin/production/tickets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          ticketId: orderTicket.id,
          status: 'QC',
          qcChecklist: [
            { item: 'dimensions', passed: true },
            { item: 'surfaceFinish', passed: true },
            { item: 'electronics', passed: true },
          ],
          qcNotes: 'QA digital inspection verified cleanly',
        }),
        agent,
      });
      record('Production QC', 'Digital QC Checklist Completion', qcRes.ok);

      // Finalize to DONE
      const doneRes = await fetch(`${BASE}/api/admin/production/tickets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          ticketId: orderTicket.id,
          status: 'DONE',
        }),
        agent,
      });
      record('Production Fleet', 'Job Ticket Completion (DONE)', doneRes.ok);
    }
  } catch (err) {
    record('Production Fleet', 'Fleet execution', false, err.message);
  }

  // 10. CUSTOM 3D DESIGN APPROVAL WORKFLOW
  console.log('\n--- 10. Testing Custom 3D Design Approval Workflow ---');
  try {
    if (guestOrderId && guestOrderNumber) {
      // 1. Admin uploads 3D proof
      const proofRes = await fetch(`${BASE}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          orderId: guestOrderId,
          action: 'designProof',
          designProofUrl: 'https://daxul.77.37.45.177.sslip.io/renders/sample_lithophane_proof.png',
          notes: 'Please inspect the 3D projection curve and lettering.',
          designStatus: 'AWAITING_CUSTOMER',
        }),
        agent,
      });
      record('Design Approval', 'Admin 3D Proof Upload & Dispatch', proofRes.ok);

      // 2. Customer requests revision
      const revRes = await fetch(`${BASE}/api/orders/${guestOrderNumber}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
        body: JSON.stringify({
          type: 'request_design_changes',
          feedback: 'Please make the base text 10% bolder for sharper shadow cast.',
        }),
        agent,
      });
      record('Design Approval', 'Customer Revision Request Submission', revRes.ok);

      // 3. Customer approves revision
      const appRes = await fetch(`${BASE}/api/orders/${guestOrderNumber}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
        body: JSON.stringify({
          type: 'approve_design',
        }),
        agent,
      });
      record('Design Approval', 'Customer 3D Proof Approval', appRes.ok);
    }
  } catch (err) {
    record('Design Approval', 'Approval workflow execution', false, err.message);
  }

  // 11. CUSTOMER CANCELLATION REQUEST & ADMIN RESOLUTION
  console.log('\n--- 11. Testing Order Cancellation Request & Admin Approval ---');
  try {
    if (guestOrderNumber && guestOrderId) {
      // Customer requests cancellation
      const cancelReqRes = await fetch(`${BASE}/api/orders/${guestOrderNumber}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
        body: JSON.stringify({
          type: 'cancel_request',
          reason: 'QA Test Cancellation Request',
        }),
        agent,
      });
      record('Cancellation', 'Customer Cancellation Request Submission', cancelReqRes.ok);

      // Admin resolves cancellation request (approves)
      const adminCancelRes = await fetch(`${BASE}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          orderId: guestOrderId,
          action: 'resolveCancellation',
          approved: true,
          note: 'Approved during Phase A QA test run',
        }),
        agent,
      });
      record('Cancellation', 'Admin Cancellation Approval & Order Cancellation', adminCancelRes.ok);
    }
  } catch (err) {
    record('Cancellation', 'Cancellation workflow', false, err.message);
  }

  // 12. PAYMENT RECONCILIATION DASHBOARD
  console.log('\n--- 12. Testing Payment Reconciliation Dashboard ---');
  try {
    const payRes = await fetch(`${BASE}/admin/payments`, { headers: { Cookie: adminCookie }, agent });
    record('Payment Reconciliation', 'Admin Payments Reconciliation View Access', payRes.status === 200);
  } catch (err) {
    record('Payment Reconciliation', 'Reconciliation dashboard', false, err.message);
  }

  // 13. CLEANUP OF TEST FIXTURES
  console.log('\n--- 13. Cleaning Up Test Fixtures ---');
  if (testPrinterId) {
    try {
      const delPrRes = await fetch(`${BASE}/api/admin/production/printers?id=${testPrinterId}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie },
        agent,
      });
      record('Cleanup', 'Temporary 3D Printer Removal', delPrRes.ok);
    } catch (err) {
      record('Cleanup', 'Printer removal', false, err.message);
    }
  }

  if (testProductId) {
    try {
      // Archive product rather than hard-delete since it is referenced by our audited test order
      const archRes = await fetch(`${BASE}/api/admin/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ id: testProductId, action: 'archive' }),
        agent,
      });
      record('Cleanup', 'Temporary QA Product Archived for Audit', archRes.ok);
    } catch (err) {
      record('Cleanup', 'Product archiving', false, err.message);
    }
  }

  console.log('\n====================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter((r) => r.passed).length} | FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ❌'}`);
  console.log('====================================================');
}

run().catch((e) => {
  console.error('QA Runner encountered fatal error:', e);
  process.exit(1);
});
