import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGeometryHashInput } from '@/lib/lithophane';
import { hashOwnerToken, sha256 } from '@/lib/lithophaneAccess';

const state = vi.hoisted(() => ({
  prisma: {} as any,
}));

vi.mock('@/lib/db', () => ({ prisma: state.prisma, default: state.prisma }));

import { priceCartDetailed } from '@/lib/pricing';
import { codEligibility, DEFAULT_COD_SETTINGS } from '@/lib/shipping';

const TOKEN = 'a'.repeat(48);
const optionGroups = [
  { key: 'frame_style', label: 'Frame style', type: 'select', geometry: true, default: 'slim', choices: [{ value: 'slim', label: 'Slim', priceAdjustment: 0 }, { value: 'wide', label: 'Wide', priceAdjustment: 150 }] },
  { key: 'gift_packaging', label: 'Gift packaging', type: 'toggle', geometry: false, default: 'no', choices: [{ value: 'no', label: 'No', priceAdjustment: 0 }, { value: 'yes', label: 'Yes', priceAdjustment: 149 }] },
];
const size = { id: 'sz1', varietyId: 'v1', name: 'Medium', widthMm: 150, heightMm: 200, depthMm: 18, thicknessMm: 3, priceAdjustment: 300, productionNotes: 'x', isDefault: true, isActive: true, sortOrder: 0 };
const variety = { id: 'v1', key: 'photo_frame', name: 'Lithophane Photo Frame', basePrice: 999, isActive: true, baseModel: 'photo_frame', optionGroups, sizes: [size] };
const settings = { id: 'default', productId: 'prod-litho', defaultOrientation: 'portrait', allowCustomDimensions: false, customMinMm: 60, customMaxMm: 300, customPricePer100Cm2: 0, defaultThicknessMm: 3, minThicknessMm: 0.6, previewResolution: 160, productionResolution: 640 };

const lithoProduct = {
  id: 'prod-litho', name: 'Custom Lithophane', slug: 'custom-lithophane', price: 0, images: [], sku: null, isActive: true, isArchived: false,
  prepaidOnly: true, codEnabled: false, customizable: true, trackInventory: false, stock: 0, variantGroups: [], customFields: [],
};

function input(over: Record<string, unknown> = {}) {
  const hash = sha256(
    buildGeometryHashInput({ filename: 'photo.png', crop: { cx: 0.5, cy: 0.5, zoom: 1 }, widthMm: 150, heightMm: 200, thicknessMm: 3, orientation: 'portrait', varietyKey: 'photo_frame', geometryOptions: { frame_style: 'slim' } }),
  );
  return {
    productId: 'prod-litho',
    quantity: 2,
    lithophane: {
      filename: 'photo.png', generationId: 'gen1', hash, varietyKey: 'photo_frame', sizeId: 'sz1', orientation: 'portrait',
      crop: { cx: 0.5, cy: 0.5, zoom: 1 }, options: { frame_style: 'slim', gift_packaging: 'yes' }, lighting: 'off', notes: 'hi', ...over,
    },
  } as any;
}

beforeEach(() => {
  state.prisma.product = { upsert: vi.fn().mockResolvedValue(lithoProduct), update: vi.fn().mockResolvedValue(lithoProduct), findMany: vi.fn().mockResolvedValue([lithoProduct]) };
  state.prisma.lithophaneSettings = { findUnique: vi.fn().mockResolvedValue(settings), upsert: vi.fn().mockResolvedValue(settings), update: vi.fn().mockResolvedValue(settings) };
  state.prisma.lithophaneVariety = { count: vi.fn().mockResolvedValue(3), findUnique: vi.fn().mockResolvedValue(variety), findFirst: vi.fn().mockResolvedValue(variety) };
  state.prisma.uploadedFile = { findUnique: vi.fn().mockResolvedValue({ filename: 'photo.png', userId: null, ownerToken: hashOwnerToken(TOKEN) }) };
  state.prisma.lithophaneGeneration = { findUnique: vi.fn().mockImplementation(async ({ where }: any) => ({ id: where.id, hash: input().lithophane.hash, kind: 'PREVIEW', uploadFilename: 'photo.png' })) };
});

const owner = { ownerCookie: TOKEN };

describe('lithophane server pricing', () => {
  it('prices from database rules and ignores any client price', async () => {
    const res = await priceCartDetailed([{ ...input(), unitPrice: 1 } as any], state.prisma, { lithophaneCaller: owner });
    expect(res.issues).toEqual([]);
    expect(res.lines).toHaveLength(1);
    const l = res.lines[0];
    expect(l.unitPrice).toBe(999 + 300 + 149);
    expect(l.lineTotal).toBe((999 + 300 + 149) * 2);
    expect(l.lithophane?.sizeName).toBe('Medium');
    expect(l.lithophane?.options.find((o) => o.key === 'gift_packaging')?.priceAdjustment).toBe(149);
  });

  it('lithophane lines are prepaid-only and COD is rejected', async () => {
    const res = await priceCartDetailed([input()], state.prisma, { lithophaneCaller: owner });
    const l = res.lines[0];
    expect(l.prepaidOnly).toBe(true);
    expect(l.codEnabled).toBe(false);
    const cod = codEligibility(
      res.lines.map((x) => ({ productName: x.productName, prepaidOnly: x.prepaidOnly, codEnabled: x.codEnabled, customizable: x.customizable, hasCustomizations: !!x.customizations })),
      { ...DEFAULT_COD_SETTINGS, globalCodEnabled: true },
    );
    expect(cod.eligible).toBe(false);
    expect(cod.reason).toMatch(/prepaid/i);
  });

  it('rejects someone else\'s photo', async () => {
    const res = await priceCartDetailed([input()], state.prisma, { lithophaneCaller: { ownerCookie: 'b'.repeat(48) } });
    expect(res.lines).toHaveLength(0);
    expect(res.issues[0].message).toMatch(/photo/i);
  });

  it('rejects a hash that does not match the recomputed configuration', async () => {
    const res = await priceCartDetailed([input({ hash: 'f'.repeat(64) })], state.prisma, { lithophaneCaller: owner });
    expect(res.lines).toHaveLength(0);
    expect(res.issues[0].message).toMatch(/changed/i);
  });

  it('rejects an inactive size and an invalid option value', async () => {
    state.prisma.lithophaneVariety.findUnique = vi.fn().mockResolvedValue({ ...variety, sizes: [{ ...size, isActive: false }] });
    const a = await priceCartDetailed([input()], state.prisma, { lithophaneCaller: owner });
    expect(a.lines).toHaveLength(0);
    state.prisma.lithophaneVariety.findUnique = vi.fn().mockResolvedValue(variety);
    const b = await priceCartDetailed([input({ options: { frame_style: 'gold' } })], state.prisma, { lithophaneCaller: owner });
    expect(b.lines).toHaveLength(0);
  });

  it('later admin price changes do not alter an already frozen snapshot', async () => {
    const res = await priceCartDetailed([input()], state.prisma, { lithophaneCaller: owner });
    const frozen = JSON.parse(JSON.stringify(res.lines[0].lithophane));
    state.prisma.lithophaneVariety.findUnique = vi.fn().mockResolvedValue({ ...variety, basePrice: 5000, sizes: [{ ...size, priceAdjustment: 9999 }] });
    const later = await priceCartDetailed([input()], state.prisma, { lithophaneCaller: owner });
    expect(later.lines[0].unitPrice).not.toBe(res.lines[0].unitPrice); // new carts see new prices
    expect(frozen.price.unitPrice).toBe(1448); // the stored snapshot is a plain value copy
  });
});
