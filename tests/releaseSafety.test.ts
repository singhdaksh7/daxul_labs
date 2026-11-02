import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ prisma: {} as any }));
vi.mock('@/lib/db', () => ({ prisma: state.prisma, default: state.prisma }));

import { priceCartDetailed } from '@/lib/pricing';
import { codEligibility, DEFAULT_COD_SETTINGS } from '@/lib/shipping';
import { sanitizeCart } from '@/lib/storeContext';

const ordinary = {
  id: 'p1', name: 'Desk Lamp', slug: 'desk-lamp', price: 799, images: ['/a.png'], sku: 'LAMP', isActive: true, isArchived: false,
  prepaidOnly: false, codEnabled: true, customizable: false, trackInventory: true, stock: 10, variantGroups: [], customFields: [],
};
const carrier = { ...ordinary, id: 'prod-litho', name: 'Custom Lithophane', slug: 'custom-lithophane', price: 0, prepaidOnly: true, codEnabled: false, trackInventory: false };

function db(products: any[]) {
  return { product: { findMany: vi.fn().mockResolvedValue(products) } } as any;
}

describe('release safety: ordinary products are unaffected by the lithophane release', () => {
  it('prices an ordinary product exactly as before (no lithophane, no caller)', async () => {
    const res = await priceCartDetailed([{ productId: 'p1', quantity: 3 }], db([ordinary]));
    expect(res.issues).toEqual([]);
    expect(res.lines[0].unitPrice).toBe(799);
    expect(res.lines[0].lineTotal).toBe(2397);
    expect(res.lines[0].lithophane).toBeUndefined();
    expect(res.lines[0].prepaidOnly).toBe(false);
  });

  it('COD is still allowed for an ordinary product', async () => {
    const res = await priceCartDetailed([{ productId: 'p1', quantity: 1 }], db([ordinary]));
    const cod = codEligibility(
      res.lines.map((x) => ({ productName: x.productName, prepaidOnly: x.prepaidOnly, codEnabled: x.codEnabled, customizable: x.customizable, hasCustomizations: false })),
      { ...DEFAULT_COD_SETTINGS, globalCodEnabled: true },
    );
    expect(cod.eligible).toBe(true);
  });

  it('out-of-stock reporting for ordinary products is unchanged', async () => {
    const res = await priceCartDetailed([{ productId: 'p1', quantity: 11 }], db([ordinary]));
    expect(res.issues.some((i) => /stock/i.test(i.message))).toBe(true);
  });

  it('the price-0 carrier product cannot be bought without a verified lithophane configuration', async () => {
    const res = await priceCartDetailed([{ productId: 'prod-litho', quantity: 1 }], db([carrier]));
    expect(res.lines).toHaveLength(0);
    expect(res.issues[0].message).toMatch(/Lithophane Builder/);
  });
});

describe('release safety: cart localStorage migration', () => {
  const legacy = {
    id: 'cart-1', productId: 'p1', productName: 'Desk Lamp', quantity: 2, unitPrice: 799, variantSelections: [],
    customizations: {}, prepaidOnly: false, codEnabled: true, customizable: false,
  };
  it('loads an old saved cart that has no lithophane field', () => {
    const out = sanitizeCart([legacy]);
    expect(out).toHaveLength(1);
    expect(out[0].lithophane).toBeUndefined();
  });
  it('drops garbage but keeps valid lines, and tolerates non-arrays', () => {
    expect(sanitizeCart([legacy, null, 5, { id: 1 }])).toHaveLength(1);
    expect(sanitizeCart('nope')).toEqual([]);
    expect(sanitizeCart(null)).toEqual([]);
  });
});
