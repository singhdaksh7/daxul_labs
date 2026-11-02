/**
 * Custom Lithophane Builder: PURE, client-safe logic (no Prisma, no Node APIs).
 *
 * Three separate concepts live in this feature:
 *   1. CUSTOMER PHOTO        the uploaded source asset (private file).
 *   2. GENERATED RELIEF      a height map derived from the photo + crop + target size (lib/lithophaneRelief.ts).
 *   3. PRODUCT VARIETY GEOMETRY  the shell around the panel (frame / table stand / light box).
 * PREVIEW_MODEL is a fast low-resolution relief for the browser. PRODUCTION_MODEL is a queued
 * higher-resolution generation produced later. A preview mesh is NEVER printed.
 */

export type Orientation = 'portrait' | 'landscape';
export type CropStrategy = 'center' | 'smart';
export type GenerationKind = 'PREVIEW' | 'PRODUCTION';

/** Crop window: centre in normalised image coordinates (0..1) and zoom >= 1 (1 = largest window). */
export interface Crop {
  cx: number;
  cy: number;
  zoom: number;
}

export const DEFAULT_CROP: Crop = { cx: 0.5, cy: 0.5, zoom: 1 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export const LITHOPHANE_PRODUCT_SLUG = 'custom-lithophane';

/** Order workflow stages for custom lithophanes (OrderItem.lithophaneStage). */
export const LITHOPHANE_STAGES = [
  { key: 'new_order', label: 'New Order' },
  { key: 'upload_reviewed', label: 'Upload Reviewed' },
  { key: 'design_prep', label: 'Design Prep' },
  { key: 'proof_ready', label: 'Proof Ready' },
  { key: 'customer_approval', label: 'Customer Approval' },
  { key: 'printing', label: 'Printing' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
] as const;
export type LithophaneStageKey = (typeof LITHOPHANE_STAGES)[number]['key'];
export const LITHOPHANE_STAGE_KEYS = LITHOPHANE_STAGES.map((s) => s.key) as LithophaneStageKey[];
export const stageLabel = (key: string | null | undefined) =>
  LITHOPHANE_STAGES.find((s) => s.key === key)?.label ?? 'New Order';

// ------------------------------------------------------------------ option groups

export interface OptionChoice {
  value: string;
  label: string;
  priceAdjustment: number;
}
export interface OptionGroup {
  key: string;
  label: string;
  type: 'select' | 'toggle';
  /** true: changes the generated geometry (hash input, triggers regeneration). false: price/packaging only. */
  geometry: boolean;
  choices: OptionChoice[];
  default: string;
}

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Defensive parser for the Json column (admin-editable). */
export function parseOptionGroups(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const out: OptionGroup[] = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const o = g as Record<string, unknown>;
    const key = typeof o.key === 'string' ? o.key.trim() : '';
    if (!key) continue;
    const choices: OptionChoice[] = [];
    if (Array.isArray(o.choices)) {
      for (const c of o.choices) {
        if (!c || typeof c !== 'object') continue;
        const co = c as Record<string, unknown>;
        const value = typeof co.value === 'string' ? co.value : '';
        if (!value) continue;
        choices.push({ value, label: typeof co.label === 'string' && co.label ? co.label : value, priceAdjustment: num(co.priceAdjustment) });
      }
    }
    if (!choices.length) continue;
    const def = typeof o.default === 'string' && choices.some((c) => c.value === o.default) ? (o.default as string) : choices[0].value;
    out.push({
      key,
      label: typeof o.label === 'string' && o.label ? o.label : key,
      type: o.type === 'toggle' ? 'toggle' : 'select',
      geometry: o.geometry === true,
      choices,
      default: def,
    });
  }
  return out;
}

export function defaultOptions(groups: OptionGroup[]): Record<string, string> {
  return Object.fromEntries(groups.map((g) => [g.key, g.default]));
}

export interface ResolvedOptions {
  /** every group resolved to a valid value */
  values: Record<string, string>;
  /** only geometry groups */
  geometry: Record<string, string>;
  lines: Array<{ key: string; label: string; value: string; valueLabel: string; priceAdjustment: number; geometry: boolean }>;
  total: number;
  errors: string[];
}

/** Validate chosen options against the groups. Missing groups use the default; unknown keys/values are errors. */
export function resolveOptions(groups: OptionGroup[], selected: Record<string, unknown> | undefined | null): ResolvedOptions {
  const sel = selected && typeof selected === 'object' ? selected : {};
  const errors: string[] = [];
  for (const k of Object.keys(sel)) {
    if (!groups.some((g) => g.key === k)) errors.push(`Unknown option "${k}".`);
  }
  const values: Record<string, string> = {};
  const geometry: Record<string, string> = {};
  const lines: ResolvedOptions['lines'] = [];
  let total = 0;
  for (const g of groups) {
    const raw = sel[g.key];
    const v = raw === undefined || raw === null || raw === '' ? g.default : String(raw);
    const choice = g.choices.find((c) => c.value === v);
    if (!choice) {
      errors.push(`"${v}" is not a valid choice for ${g.label}.`);
      continue;
    }
    values[g.key] = v;
    if (g.geometry) geometry[g.key] = v;
    total += choice.priceAdjustment;
    lines.push({ key: g.key, label: g.label, value: v, valueLabel: choice.label, priceAdjustment: choice.priceAdjustment, geometry: g.geometry });
  }
  return { values, geometry, lines, total: round2(total), errors };
}

// ------------------------------------------------------------------ dimensions / aspect

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Apply orientation to a base size: portrait = shorter side horizontal. */
export function orientedDims(widthMm: number, heightMm: number, orientation: Orientation): { widthMm: number; heightMm: number } {
  const lo = Math.min(widthMm, heightMm);
  const hi = Math.max(widthMm, heightMm);
  return orientation === 'landscape' ? { widthMm: hi, heightMm: lo } : { widthMm: lo, heightMm: hi };
}

export const aspectOf = (widthMm: number, heightMm: number) => widthMm / heightMm;

export function clampCrop(c: Partial<Crop> | null | undefined): Crop {
  const cx = Math.min(1, Math.max(0, num(c?.cx, 0.5)));
  const cy = Math.min(1, Math.max(0, num(c?.cy, 0.5)));
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, num(c?.zoom, 1)));
  return { cx: Math.round(cx * 1e4) / 1e4, cy: Math.round(cy * 1e4) / 1e4, zoom: Math.round(zoom * 1e3) / 1e3 };
}

export function customDimensionPrice(widthMm: number, heightMm: number, pricePer100Cm2: number): number {
  if (!(pricePer100Cm2 > 0)) return 0;
  const areaCm2 = (widthMm * heightMm) / 100;
  return round2((areaCm2 / 100) * pricePer100Cm2);
}

export interface PriceBreakdown {
  base: number;
  size: number;
  options: number;
  customDimensions: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** unit = variety.basePrice + size.priceAdjustment + options + custom-dimension price */
export function calcLithophanePrice(p: {
  basePrice: number;
  sizeAdjustment: number;
  optionsTotal: number;
  customDimensionPrice?: number;
  quantity?: number;
}): PriceBreakdown {
  const quantity = Math.max(1, Math.floor(p.quantity ?? 1));
  const cd = p.customDimensionPrice ?? 0;
  const unitPrice = round2(p.basePrice + p.sizeAdjustment + p.optionsTotal + cd);
  return {
    base: round2(p.basePrice),
    size: round2(p.sizeAdjustment),
    options: round2(p.optionsTotal),
    customDimensions: round2(cd),
    unitPrice,
    quantity,
    lineTotal: round2(unitPrice * quantity),
  };
}

// ------------------------------------------------------------------ geometry hash input

export interface GeometryHashInput {
  filename: string;
  crop: Crop;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  orientation: Orientation;
  varietyKey: string;
  /** geometry-group option values only */
  geometryOptions: Record<string, string>;
}

/**
 * Canonical JSON for hashing. Quantity, gift packaging, lighting and every non-geometry option are
 * deliberately NOT part of it. The server computes sha256 over this string.
 */
export function buildGeometryHashInput(i: GeometryHashInput): string {
  const crop = clampCrop(i.crop);
  const geo = Object.keys(i.geometryOptions)
    .sort()
    .map((k) => [k, i.geometryOptions[k]]);
  return JSON.stringify({
    f: i.filename,
    c: [crop.cx, crop.cy, crop.zoom],
    w: round2(i.widthMm),
    h: round2(i.heightMm),
    t: round2(i.thicknessMm),
    o: i.orientation,
    v: i.varietyKey,
    g: geo,
  });
}

// ------------------------------------------------------------------ cart / order payloads

/** What the client sends to the server for a lithophane line (no prices). */
export interface LithophaneInput {
  filename: string;
  generationId: string;
  hash: string;
  varietyKey: string;
  sizeId?: string | null;
  customWidthMm?: number | null;
  customHeightMm?: number | null;
  orientation: Orientation;
  crop: Crop;
  options: Record<string, string>;
  lighting?: 'off' | 'on';
  notes?: string;
}

/** Display snapshot stored on the client cart line (prices are display-only). */
export interface CartLithophane extends LithophaneInput {
  varietyName: string;
  sizeName: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  optionSummary: Array<{ label: string; valueLabel: string }>;
  thumbnail?: string;
  unitPrice: number;
}

export function lithophanePayload(l: CartLithophane): LithophaneInput {
  return {
    filename: l.filename,
    generationId: l.generationId,
    hash: l.hash,
    varietyKey: l.varietyKey,
    sizeId: l.sizeId ?? null,
    customWidthMm: l.customWidthMm ?? null,
    customHeightMm: l.customHeightMm ?? null,
    orientation: l.orientation,
    crop: l.crop,
    options: l.options,
    lighting: l.lighting ?? 'off',
    notes: l.notes ?? '',
  };
}

/** Frozen server-side snapshot stored on OrderItem.lithophaneSnapshot. */
export interface LithophaneSnapshot {
  version: 1;
  filename: string;
  generationId: string;
  productionGenerationId?: string;
  hash: string;
  varietyKey: string;
  varietyName: string;
  sizeId: string | null;
  sizeName: string;
  custom: boolean;
  widthMm: number;
  heightMm: number;
  depthMm: number | null;
  thicknessMm: number;
  orientation: Orientation;
  crop: Crop;
  lighting: 'off' | 'on';
  notes: string;
  options: Array<{ key: string; label: string; value: string; valueLabel: string; priceAdjustment: number }>;
  productionNotes: string | null;
  price: PriceBreakdown;
  previewResolution: number;
  productionResolution: number;
  frozenAt: string;
}

export const LITHOPHANE_LIMITATIONS =
  'Preview is a visual simulation computed in your browser. Final printed result may vary slightly depending on image quality and selected size. A production-grade file is generated separately after you order.';
