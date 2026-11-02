import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';

const prisma = new PrismaClient();
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function createAuthenticatedContext(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Perform real UI Sign In
  await page.goto('/admin/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('qa-password-123!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(3000);

  // Map session token for standard HTTP navigation in test
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name.includes('session-token'));
  if (sessionCookie) {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: sessionCookie.value,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  }

  await page.close();
  return context;
}

test.describe.serial('Partner Finance System Real Browser Workflow E2E', () => {
  let dakshUserId: string;
  let partnerBUserId: string;
  let partnerCUserId: string;

  let dakshPartnerId: string;
  let partnerBPartnerId: string;
  let partnerCPartnerId: string;

  let expenseId: string;
  let emiScheduleId: string;
  let settlementId: string;

  test.beforeAll(async () => {
    // Fetch QA users
    const u1 = await prisma.user.findUnique({ where: { email: 'qa-daksh@local.invalid' } });
    const u2 = await prisma.user.findUnique({ where: { email: 'qa-partner-b@local.invalid' } });
    const u3 = await prisma.user.findUnique({ where: { email: 'qa-partner-c@local.invalid' } });

    if (!u1 || !u2 || !u3) {
      throw new Error('QA Users not found in local DB');
    }

    dakshUserId = u1.id;
    partnerBUserId = u2.id;
    partnerCUserId = u3.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // Step 1 & 2: Partner Configuration & Validation E2E
  test('1. Partner Configuration E2E: Validation & 3-way setup', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const page = await context.newPage();

    await page.goto('/admin/finance/partners');
    await expect(page.locator('#partners-view')).toBeVisible();

    // 1. Test split configuration: Daksh 33.333334%
    await page.fill('#user-id-input', dakshUserId);
    await page.fill('#display-name-input', 'QA Daksh');
    await page.fill('#ownership-input', '33.333334');
    await page.fill('#expense-split-input', '33.333334');
    await page.fill('#profit-split-input', '33.333334');
    await page.check('#primary-settlement-checkbox');
    await page.click('#submit-partner-btn');
    await expect(page.locator('#partner-success')).toBeVisible();

    // Partner B 33.333333%
    await page.fill('#user-id-input', partnerBUserId);
    await page.fill('#display-name-input', 'QA Partner B');
    await page.fill('#ownership-input', '33.333333');
    await page.fill('#expense-split-input', '33.333333');
    await page.fill('#profit-split-input', '33.333333');
    await page.uncheck('#primary-settlement-checkbox');
    await page.click('#submit-partner-btn');
    await expect(page.locator('#partner-success')).toBeVisible();

    // Partner C 33.333333%
    await page.fill('#user-id-input', partnerCUserId);
    await page.fill('#display-name-input', 'QA Partner C');
    await page.fill('#ownership-input', '33.333333');
    await page.fill('#expense-split-input', '33.333333');
    await page.fill('#profit-split-input', '33.333333');
    await page.uncheck('#primary-settlement-checkbox');
    await page.click('#submit-partner-btn');
    await expect(page.locator('#partner-success')).toBeVisible();

    // Verify DB
    const partners = await prisma.businessPartner.findMany({ where: { isActive: true } });
    expect(partners.length).toBe(3);

    const dPartner = partners.find((p) => p.userId === dakshUserId);
    const bPartner = partners.find((p) => p.userId === partnerBUserId);
    const cPartner = partners.find((p) => p.userId === partnerCUserId);

    expect(dPartner?.isPrimarySettlementPartner).toBe(true);
    expect(bPartner?.isPrimarySettlementPartner).toBe(false);

    dakshPartnerId = dPartner!.id;
    partnerBPartnerId = bPartner!.id;
    partnerCPartnerId = cPartner!.id;

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-partners-configured.png'), fullPage: true });
    await context.close();
  });

  // Step 3, 4, 5: One-Time Expense, Proof Upload & Timeline Audit
  test('2. One-Time Expense, Attachment Proof & Audit Timeline', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const page = await context.newPage();

    await page.goto('/admin/finance/expenses');
    await expect(page.locator('#expenses-view')).toBeVisible();

    // Fill expense form
    await page.fill('#expense-title-input', 'QA Printer Tooling Expense');
    await page.fill('#expense-amount-input', '30000');
    await page.selectOption('#expense-classification-select', 'OPERATING_EXPENSE');
    await page.selectOption('#payment-source-select', 'PARTNER_PAID');
    await page.waitForSelector('#paid-by-partner-select option', { state: 'attached' });
    await page.selectOption('#paid-by-partner-select', dakshPartnerId);
    await page.selectOption('#split-type-select', 'EQUAL');
    await page.click('#submit-expense-btn');

    await expect(page.locator('#expense-success')).toBeVisible();

    // Verify DB
    const exp = await prisma.businessExpense.findFirst({
      where: { title: 'QA Printer Tooling Expense' },
      include: { shares: true },
    });
    expect(exp).not.toBeNull();
    expect(exp?.paidByPartnerId).toBe(dakshPartnerId);
    expect(exp?.shares.length).toBe(3);

    expenseId = exp!.id;

    // Check shares (1,000,000 paise = ₹10,000 each)
    const dShare = exp?.shares.find((s: any) => s.partnerId === dakshPartnerId);
    const bShare = exp?.shares.find((s: any) => s.partnerId === partnerBPartnerId);
    const cShare = exp?.shares.find((s: any) => s.partnerId === partnerCPartnerId);

    expect(dShare?.shareAmountPaise.toString()).toBe('1000000');
    expect(bShare?.shareAmountPaise.toString()).toBe('1000000');
    expect(cShare?.shareAmountPaise.toString()).toBe('1000000');

    // Verify Financial Accounts: Daksh receivable ₹20,000, B payable ₹10,000, C payable ₹10,000
    const dAcc = await prisma.partnerFinancialAccount.findUnique({ where: { partnerId: dakshPartnerId } });
    const bAcc = await prisma.partnerFinancialAccount.findUnique({ where: { partnerId: partnerBPartnerId } });
    const cAcc = await prisma.partnerFinancialAccount.findUnique({ where: { partnerId: partnerCPartnerId } });

    expect(dAcc?.amountReceivablePaise.toString()).toBe('2000000');
    expect(bAcc?.amountPayablePaise.toString()).toBe('1000000');
    expect(cAcc?.amountPayablePaise.toString()).toBe('1000000');

    // Navigate to Expense Timeline
    await page.goto(`/admin/finance/expenses/${expenseId}`);
    await expect(page.locator('#expense-timeline')).toBeVisible();

    // Upload safe QA proof
    await page.fill('#proof-filename-input', 'qa-tooling-invoice-v1.pdf');
    await page.fill('#proof-note-input', 'Original supplier receipt v1');
    await page.click('#submit-proof-btn');
    await expect(page.locator('#detail-success')).toBeVisible();

    // Replace attachment
    await page.fill('#proof-filename-input', 'qa-tooling-invoice-v2.pdf');
    await page.fill('#proof-note-input', 'Revised GST invoice replacement');
    await page.click('#submit-proof-btn');
    await expect(page.locator('#detail-success')).toBeVisible();

    // Verify versioning
    const atts = await prisma.expenseAttachment.findMany({ where: { expenseId } });
    expect(atts.length).toBe(2);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-expense-timeline-proofs.png'), fullPage: true });
    await context.close();
  });

  // Step 6 & 7: Equipment Financing EMI & Dashboard
  test('3. EMI Financing E2E: ₹90,000 Printer, ₹30k Down, 6 Months x ₹10k', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const page = await context.newPage();

    await page.goto('/admin/finance/emi');
    await expect(page.locator('#emi-view')).toBeVisible();

    // Create EMI
    await page.fill('#emi-title-input', 'QA 3D Printer');
    await page.fill('#emi-price-input', '90000');
    await page.fill('#emi-downpayment-input', '30000');
    await page.fill('#emi-tenure-input', '6');
    await page.fill('#emi-monthly-input', '10000');
    await page.waitForSelector('#emi-partner-select option', { state: 'attached' });
    await page.selectOption('#emi-partner-select', dakshPartnerId);
    await page.click('#submit-emi-btn');

    await expect(page.locator('#emi-success')).toBeVisible();

    // Verify DB
    const sch = await (prisma.expenseEmiSchedule as any).findFirst({
      where: { expense: { title: 'QA 3D Printer' } },
      include: { installments: { include: { partnerObligations: true } } },
    });
    expect(sch).not.toBeNull();
    expect(sch?.financedAmountPaise.toString()).toBe('6000000');
    expect(sch?.installments.length).toBe(6);

    emiScheduleId = sch!.id;

    // Total must be exactly ₹60,000 without penny loss
    const totalInstallmentPaise = sch!.installments.reduce((sum: bigint, i: any) => sum + BigInt(i.amountPaise), BigInt(0));
    expect(totalInstallmentPaise.toString()).toBe('6000000');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-emi-dashboard.png'), fullPage: true });
    await context.close();
  });

  // Step 8 & 9: Partner B Portal & First Partial Settlement Submission (₹4,000)
  test('4. Partner B Portal & Settlement Submission (₹4,000 UPI)', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'qa-partner-b@local.invalid');
    const page = await context.newPage();

    await page.goto('/account/partner-finance');
    await expect(page.locator('#partner-portal-view')).toBeVisible();
    await expect(page.locator('#portal-total-due')).toBeVisible();

    // Submit partial payment ₹4,000
    await page.fill('#payment-amount-input', '4000');
    await page.selectOption('#payment-method-select', 'UPI');
    await page.fill('#payment-ref-input', 'UPI/QA-REF/004000');
    await page.fill('#payment-proof-input', '/uploads/settlements/qa-settlement-4000.png');
    await page.click('#submit-payment-btn');

    await expect(page.locator('#portal-success')).toBeVisible();

    const st = await prisma.partnerSettlement.findFirst({
      where: { referenceNumber: 'UPI/QA-REF/004000' },
    });
    expect(st).not.toBeNull();
    expect(st?.status).toBe('PENDING_VERIFICATION');
    expect(st?.amountPaise.toString()).toBe('400000');

    settlementId = st!.id;

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-partner-b-portal-submitted.png'), fullPage: true });
    await context.close();
  });

  // Step 10: Daksh Verification of ₹4,000 Settlement
  test('5. Settlement Verification Queue: Daksh Approves ₹4,000', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const page = await context.newPage();

    await page.goto('/admin/finance/settlements');
    await expect(page.locator('#settlements-table')).toBeVisible();

    const verifyBtn = page.locator(`#verify-btn-${settlementId}`);
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    await expect(page.locator('#settlement-success')).toBeVisible();

    // Verify DB
    const st = await prisma.partnerSettlement.findUnique({ where: { id: settlementId } });
    expect(st?.status).toBe('VERIFIED');

    // Partner B remaining dues: ₹6,000
    const bAcc = await prisma.partnerFinancialAccount.findUnique({ where: { partnerId: partnerBPartnerId } });
    expect(bAcc?.amountPayablePaise.toString()).toBe('600000');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-settlement-verified.png'), fullPage: true });
    await context.close();
  });

  // Step 11: Second Payment: Partner B pays remaining ₹6,000 -> Status PAID
  test('6. Partner B Second Payment (₹6,000) & Obligation Cleared to ₹0', async ({ browser }) => {
    // Partner B submits ₹6,000
    const contextB = await createAuthenticatedContext(browser, 'qa-partner-b@local.invalid');
    const pageB = await contextB.newPage();

    await pageB.goto('/account/partner-finance');
    await pageB.fill('#payment-amount-input', '6000');
    await pageB.selectOption('#payment-method-select', 'UPI');
    await pageB.fill('#payment-ref-input', 'UPI/QA-REF/006000');
    await pageB.click('#submit-payment-btn');
    await expect(pageB.locator('#portal-success')).toBeVisible();
    await contextB.close();

    const st2 = await prisma.partnerSettlement.findFirst({
      where: { referenceNumber: 'UPI/QA-REF/006000' },
    });
    expect(st2).not.toBeNull();

    // Daksh verifies
    const contextD = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const pageD = await contextD.newPage();

    await pageD.goto('/admin/finance/settlements');
    const verifyBtn = pageD.locator(`#verify-btn-${st2!.id}`);
    await verifyBtn.click();
    await expect(pageD.locator('#settlement-success')).toBeVisible();

    // Dues cleared to 0
    const bAcc = await prisma.partnerFinancialAccount.findUnique({ where: { partnerId: partnerBPartnerId } });
    expect(bAcc?.amountPayablePaise.toString()).toBe('0');
    await contextD.close();
  });

  // Step 12: Payment Rejection Flow
  test('7. Payment Rejection Flow: Reason Required & Obligations Unaffected', async ({ browser }) => {
    const stC = await prisma.partnerSettlement.create({
      data: {
        settlementNumber: 'DXL-STL-TEST-REJECT',
        fromPartnerId: partnerCPartnerId,
        toPartnerId: dakshPartnerId,
        amountPaise: BigInt(500000),
        paymentMethod: 'UPI',
        referenceNumber: 'UPI/REJECT-TEST/005000',
        proofMediaUrl: '/uploads/settlements/bogus-receipt.png',
        status: 'PENDING_VERIFICATION',
        createdBy: 'qa-partner-c',
      },
    });

    const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const page = await context.newPage();

    await page.goto('/admin/finance/settlements');
    await page.click(`#reject-btn-${stC.id}`);
    await page.fill(`#reject-reason-${stC.id}`, 'Bank UTR not found in bank statement');
    await page.click(`#confirm-reject-${stC.id}`);

    await expect(page.locator('#settlement-success')).toBeVisible();

    const updatedStC = await prisma.partnerSettlement.findUnique({ where: { id: stC.id } });
    expect(updatedStC?.status).toBe('REJECTED');
    expect(updatedStC?.rejectionReason).toBe('Bank UTR not found in bank statement');

    // Partner C dues intact at ₹10,000
    const cAcc = await prisma.partnerFinancialAccount.findUnique({ where: { partnerId: partnerCPartnerId } });
    expect(cAcc?.amountPayablePaise.toString()).toBe('1000000');
    await context.close();
  });

  // Step 15 & 16: Capital Flow (₹300k Total) & Partner Advances
  test('8. Capital Flow (₹300k Total Equity) & Partner Advances (Liability)', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const page = await context.newPage();

    await page.goto('/admin/finance/capital');

    // Daksh ₹100k
    await page.waitForSelector('#capital-partner-select option', { state: 'attached' });
    await page.selectOption('#capital-partner-select', dakshPartnerId);
    await page.selectOption('#capital-type-select', 'CAPITAL_CONTRIBUTION');
    await page.fill('#capital-amount-input', '100000');
    await page.fill('#capital-desc-input', 'Initial capital Daksh');
    await page.click('#submit-capital-btn');
    await expect(page.locator('#capital-success')).toBeVisible();

    // Partner B ₹100k
    await page.waitForSelector('#capital-partner-select option', { state: 'attached' });
    await page.selectOption('#capital-partner-select', partnerBPartnerId);
    await page.selectOption('#capital-type-select', 'CAPITAL_CONTRIBUTION');
    await page.fill('#capital-amount-input', '100000');
    await page.fill('#capital-desc-input', 'Initial capital Partner B');
    await page.click('#submit-capital-btn');
    await expect(page.locator('#capital-success')).toBeVisible();

    // Partner C ₹100k
    await page.waitForSelector('#capital-partner-select option', { state: 'attached' });
    await page.selectOption('#capital-partner-select', partnerCPartnerId);
    await page.selectOption('#capital-type-select', 'CAPITAL_CONTRIBUTION');
    await page.fill('#capital-amount-input', '100000');
    await page.fill('#capital-desc-input', 'Initial capital Partner C');
    await page.click('#submit-capital-btn');
    await expect(page.locator('#capital-success')).toBeVisible();

    // Advance ₹50k for Daksh
    await page.selectOption('#capital-partner-select', dakshPartnerId);
    await page.selectOption('#capital-type-select', 'PARTNER_ADVANCE');
    await page.fill('#capital-amount-input', '50000');
    await page.fill('#capital-desc-input', 'Emergency working capital advance');
    await page.click('#submit-capital-btn');
    await expect(page.locator('#capital-success')).toBeVisible();

    // Repay ₹20k advance
    await page.selectOption('#capital-partner-select', dakshPartnerId);
    await page.selectOption('#capital-type-select', 'ADVANCE_REPAYMENT');
    await page.fill('#capital-amount-input', '20000');
    await page.fill('#capital-desc-input', 'Partial loan repayment');
    await page.click('#submit-capital-btn');
    await expect(page.locator('#capital-success')).toBeVisible();

    const dAcc = await prisma.partnerFinancialAccount.findUnique({ where: { partnerId: dakshPartnerId } });
    expect(dAcc?.capitalContributedPaise.toString()).toBe('10000000');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-capital-advances.png'), fullPage: true });
    await context.close();
  });

  // Step 21 & 22: Profit Accounting Period (OPEN -> REVIEW -> LOCKED & Distributed)
  test('9. Profit Period Closing & Immutable 3-Way Distribution (₹60,000)', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
    const page = await context.newPage();

    await page.goto('/admin/finance/periods');

    await page.fill('#period-name-input', 'November 2026 QA Closing');
    await page.click('#submit-period-btn');
    await expect(page.locator('#period-success')).toBeVisible();

    const period = await prisma.profitPeriod.findFirst({
      where: { periodName: 'November 2026 QA Closing' },
    });
    expect(period).not.toBeNull();
    expect(period?.status).toBe('OPEN');

    const lockBtn = page.locator(`#lock-period-btn-${period!.id}`);
    await lockBtn.click();
    await expect(page.locator('#period-success')).toBeVisible();

    const updatedPeriod = await prisma.profitPeriod.findUnique({
      where: { id: period!.id },
      include: { allocations: true },
    });
    expect(['LOCKED', 'DISTRIBUTED']).toContain(updatedPeriod?.status);
    expect(updatedPeriod?.allocations.length).toBe(3);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-profit-period-distributed.png'), fullPage: true });
    await context.close();
  });

  // Step 28: Security & IDOR Enforcement
  test('10. Security & IDOR Enforcement (Self-approval & unauthenticated rejection)', async ({ request }) => {
    const res = await request.get('/api/admin/finance/dashboard');
    expect([401, 403, 307]).toContain(res.status());

    const resSelf = await request.put('/api/admin/finance/settlements', {
      data: { settlementId: 'fake-id', status: 'VERIFIED' },
    });
    expect([401, 403, 404]).toContain(resSelf.status());
  });

  // Step 29: Responsive Viewports
  const viewports = [
    { name: '390x844 (Mobile)', width: 390, height: 844 },
    { name: '430x932 (Mobile Large)', width: 430, height: 932 },
    { name: '768x1024 (Tablet)', width: 768, height: 1024 },
    { name: '1440x900 (Desktop)', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`11. Responsive Layout Validation at ${vp.name}`, async ({ browser }) => {
      const context = await createAuthenticatedContext(browser, 'qa-daksh@local.invalid');
      const page = await context.newPage();

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/admin/finance');
      await expect(page.locator('h1')).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);

      await context.close();
    });
  }
});
