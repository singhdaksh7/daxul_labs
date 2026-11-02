import { describe, expect, it } from 'vitest';
import {
  buildGeometryHashInput,
  calcLithophanePrice,
  clampCrop,
  customDimensionPrice,
  orientedDims,
  parseOptionGroups,
  resolveOptions,
  LITHOPHANE_STAGES,
  type GeometryHashInput,
} from '@/lib/lithophane';
import { computeCropRect, generateHeightMap, gridSize, thicknessFromLightness } from '@/lib/lithophaneRelief';
import { sha256 } from '@/lib/lithophaneAccess';

const groups = parseOptionGroups([
  { key: 'frame_style', label: 'Frame style', type: 'select', geometry: true, default: 'slim', choices: [{ value: 'slim', label: 'Slim', priceAdjustment: 0 }, { value: 'wide', label: 'Wide', priceAdjustment: 150 }] },
  { key: 'gift_packaging', label: 'Gift packaging', type: 'toggle', geometry: false, default: 'no', choices: [{ value: 'no', label: 'No', priceAdjustment: 0 }, { value: 'yes', label: 'Yes', priceAdjustment: 149 }] },
]);

const base: GeometryHashInput = {
  filename: 'abc.png',
  crop: { cx: 0.5, cy: 0.5, zoom: 1 },
  widthMm: 150,
  heightMm: 200,
  thicknessMm: 3,
  orientation: 'portrait',
  varietyKey: 'photo_frame',
  geometryOptions: { frame_style: 'slim' },
};
const h = (over: Partial<GeometryHashInput> = {}) => sha256(buildGeometryHashInput({ ...base, ...over }));

describe('geometry hash', () => {
  it('is stable for identical input and key order', () => {
    expect(h()).toBe(h());
    expect(h({ geometryOptions: { b: '1', a: '2' } })).toBe(h({ geometryOptions: { a: '2', b: '1' } }));
  });
  it('ignores quantity and non-geometry options (they are not inputs)', () => {
    const a = resolveOptions(groups, { gift_packaging: 'no' });
    const b = resolveOptions(groups, { gift_packaging: 'yes' });
    expect(h({ geometryOptions: a.geometry })).toBe(h({ geometryOptions: b.geometry }));
    expect(Object.keys(a.geometry)).toEqual(['frame_style']);
  });
  it('changes with size, orientation, crop, thickness, variety, geometry option and photo', () => {
    const ref = h();
    expect(h({ widthMm: 200, heightMm: 300 })).not.toBe(ref);
    expect(h({ orientation: 'landscape' })).not.toBe(ref);
    expect(h({ crop: { cx: 0.4, cy: 0.5, zoom: 1 } })).not.toBe(ref);
    expect(h({ crop: { cx: 0.5, cy: 0.5, zoom: 1.5 } })).not.toBe(ref);
    expect(h({ thicknessMm: 4 })).not.toBe(ref);
    expect(h({ varietyKey: 'table_stand' })).not.toBe(ref);
    expect(h({ geometryOptions: { frame_style: 'wide' } })).not.toBe(ref);
    expect(h({ filename: 'other.png' })).not.toBe(ref);
  });
  it('treats sub-precision crop noise as the same crop', () => {
    expect(h({ crop: { cx: 0.50001, cy: 0.5, zoom: 1 } })).toBe(h());
  });
});

describe('price calculation', () => {
  it('unit = base + size + options + custom dimension price', () => {
    const p = calcLithophanePrice({ basePrice: 999, sizeAdjustment: 300, optionsTotal: 149, customDimensionPrice: 50, quantity: 3 });
    expect(p.unitPrice).toBe(1498);
    expect(p.lineTotal).toBe(4494);
  });
  it('options come from the chosen values only and reject invalid choices', () => {
    expect(resolveOptions(groups, { frame_style: 'wide', gift_packaging: 'yes' }).total).toBe(299);
    expect(resolveOptions(groups, {}).total).toBe(0);
    expect(resolveOptions(groups, { frame_style: 'neon' }).errors.length).toBe(1);
    expect(resolveOptions(groups, { nope: 'x' }).errors.length).toBe(1);
  });
  it('custom dimension price scales with area', () => {
    expect(customDimensionPrice(100, 100, 0)).toBe(0);
    expect(customDimensionPrice(100, 100, 50)).toBe(50); // 100 cm2 -> 1 x 50
    expect(customDimensionPrice(200, 100, 50)).toBe(100);
  });
  it('clamps quantity to at least 1', () => {
    expect(calcLithophanePrice({ basePrice: 10, sizeAdjustment: 0, optionsTotal: 0, quantity: 0 }).quantity).toBe(1);
  });
});

describe('dimensions and crop', () => {
  it('orientation swaps the long side', () => {
    expect(orientedDims(150, 200, 'portrait')).toEqual({ widthMm: 150, heightMm: 200 });
    expect(orientedDims(150, 200, 'landscape')).toEqual({ widthMm: 200, heightMm: 150 });
    expect(orientedDims(200, 150, 'portrait')).toEqual({ widthMm: 150, heightMm: 200 });
  });
  it('clampCrop bounds values', () => {
    expect(clampCrop({ cx: 9, cy: -1, zoom: 99 })).toEqual({ cx: 1, cy: 0, zoom: 4 });
    expect(clampCrop(undefined)).toEqual({ cx: 0.5, cy: 0.5, zoom: 1 });
  });
  it('crop window always has exactly the target aspect ratio (never stretched) and stays inside the image', () => {
    const imgs: Array<[number, number]> = [[4000, 3000], [3000, 4000], [1000, 1000], [800, 2400], [2400, 800]];
    const aspects = [0.75, 1, 4 / 3, 0.5, 2];
    const crops = [{ cx: 0.5, cy: 0.5, zoom: 1 }, { cx: 0, cy: 0, zoom: 2 }, { cx: 1, cy: 1, zoom: 3.3 }, { cx: 0.2, cy: 0.9, zoom: 1.4 }];
    for (const [w, hh] of imgs) {
      for (const a of aspects) {
        for (const c of crops) {
          const r = computeCropRect(w, hh, a, c);
          expect(r.sw / r.sh).toBeCloseTo(a, 9);
          expect(r.sx).toBeGreaterThanOrEqual(-1e-9);
          expect(r.sy).toBeGreaterThanOrEqual(-1e-9);
          expect(r.sx + r.sw).toBeLessThanOrEqual(w + 1e-6);
          expect(r.sy + r.sh).toBeLessThanOrEqual(hh + 1e-6);
        }
      }
    }
  });
  it('default centre crop is centred', () => {
    const r = computeCropRect(4000, 3000, 0.75, { cx: 0.5, cy: 0.5, zoom: 1 });
    expect(r.sx + r.sw / 2).toBeCloseTo(2000, 6);
    expect(r.sy + r.sh / 2).toBeCloseTo(1500, 6);
  });
  it('grid keeps the target aspect', () => {
    const g = gridSize(0.75, 160);
    expect(g.rows).toBe(160);
    expect(g.cols).toBe(120);
  });
});

describe('height map', () => {
  const W = 8;
  const H = 8;
  // left-to-right black->white gradient
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = Math.round((x / (W - 1)) * 255);
      const o = (y * W + x) * 4;
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  }
  const map = generateHeightMap(rgba, W, H, { sx: 0, sy: 0, sw: W, sh: H }, 8, 8, 0.6, 3);
  it('darker means thicker, monotonic along the gradient', () => {
    for (let i = 1; i < 8; i++) expect(map.data[i]).toBeLessThanOrEqual(map.data[i - 1]);
    expect(map.data[0]).toBeCloseTo(3, 5);
    expect(map.data[7]).toBeCloseTo(0.6, 5);
  });
  it('stays within [min, max]', () => {
    for (const v of map.data) {
      expect(v).toBeGreaterThanOrEqual(0.6 - 1e-6);
      expect(v).toBeLessThanOrEqual(3 + 1e-6);
    }
  });
  it('thicknessFromLightness is monotonic decreasing', () => {
    expect(thicknessFromLightness(0, 0.6, 3)).toBe(3);
    expect(thicknessFromLightness(1, 0.6, 3)).toBe(0.6);
    expect(thicknessFromLightness(0.3, 0.6, 3)).toBeGreaterThan(thicknessFromLightness(0.7, 0.6, 3));
  });
  it('transparent pixels read as white (thin)', () => {
    const t = new Uint8ClampedArray([0, 0, 0, 0]);
    const m = generateHeightMap(t, 1, 1, { sx: 0, sy: 0, sw: 1, sh: 1 }, 2, 2, 0.6, 3);
    expect(m.data[0]).toBeCloseTo(0.6, 5);
  });
});

describe('workflow stages', () => {
  it('has the ten required stages in order', () => {
    expect(LITHOPHANE_STAGES.map((s) => s.label)).toEqual([
      'New Order', 'Upload Reviewed', 'Design Prep', 'Proof Ready', 'Customer Approval', 'Printing', 'Finishing', 'Packed', 'Shipped', 'Delivered',
    ]);
  });
});
