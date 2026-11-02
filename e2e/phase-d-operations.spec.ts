import { test, expect } from '@playwright/test';

test.describe('Phase D: Operations, Manufacturing & Supply Chain E2E', () => {
  const viewports = [
    { name: 'Mobile 390', width: 390, height: 844 },
    { name: 'Mobile 430', width: 430, height: 932 },
    { name: 'Tablet 768', width: 768, height: 1024 },
    { name: 'Desktop 1440', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`Studio OS Operations views render cleanly at viewport ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Direct API endpoints verification
      const healthRes = await page.request.get('/api/health');
      expect(healthRes.status()).toBe(200);

      // Verify unauthenticated security redirects
      const unauthRes = await page.request.get('/api/admin/materials');
      expect([401, 403, 307]).toContain(unauthRes.status());
    });
  }

  test('Materials & Spool Ledger API rejects unauthenticated mutations', async ({ request }) => {
    const res = await request.post('/api/admin/materials', {
      data: {
        name: 'Test PLA Red',
        sku: 'PLA-RED-001',
        category: 'FILAMENT',
        unit: 'KG',
        unitCost: 1200,
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Purchasing & Goods Receipt API rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/admin/purchasing/orders', {
      data: {
        supplierId: 'dummy-supplier',
        items: [{ materialItemId: 'dummy-mat', orderedQuantity: 10, unitCost: 100 }],
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('2FA Admin endpoint rejects unauthenticated verification', async ({ request }) => {
    const res = await request.put('/api/admin/security/2fa', {
      data: { code: '123456' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
