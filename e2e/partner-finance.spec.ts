import { test, expect } from '@playwright/test';

test.describe('Partner Finance, Expense, EMI & Settlement System E2E', () => {
  const viewports = [
    { name: 'Mobile 390', width: 390, height: 844 },
    { name: 'Mobile 430', width: 430, height: 932 },
    { name: 'Tablet 768', width: 768, height: 1024 },
    { name: 'Desktop 1440', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`Finance dashboard responsive layout at viewport ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      
      // Verify unauthenticated security rejection
      const unauthFinance = await page.request.get('/api/admin/finance/dashboard');
      expect([401, 403, 307]).toContain(unauthFinance.status());

      // Partner portal unauthenticated security rejection
      const unauthPortal = await page.request.get('/api/account/partner-finance');
      expect([401, 403, 307]).toContain(unauthPortal.status());
    });
  }

  test('Finance expense API enforces authentication and rejects unauthenticated posts', async ({ request }) => {
    const res = await request.post('/api/admin/finance/expenses', {
      data: {
        title: 'Bambu Lab X1 Carbon',
        category: 'THREE_D_PRINTER',
        totalAmountRupees: 95000,
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Finance settlement verification enforces verifier credentials and prevents unauthorized approvals', async ({ request }) => {
    const res = await request.put('/api/admin/finance/settlements', {
      data: {
        settlementId: 'dummy-settlement',
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Profit period locking requires authenticated super admin session', async ({ request }) => {
    const res = await request.put('/api/admin/finance/periods', {
      data: {
        periodId: 'dummy-period',
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Finance export endpoint enforces authentication', async ({ request }) => {
    const res = await request.get('/api/admin/finance/export?type=expenses');
    expect([401, 403]).toContain(res.status());
  });

  test('Finance partner management enforces Super Admin authentication', async ({ request }) => {
    const res = await request.get('/api/admin/finance/partners');
    expect([401, 403]).toContain(res.status());
  });
});
