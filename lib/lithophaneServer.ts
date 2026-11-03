/**
 * Server-side Custom Lithophane logic: idempotent seeding, config, resolution/validation, hashing,
 * pricing and the frozen order snapshot. Import only from route handlers / server code.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  LITHOPHANE_PRODUCT_SLUG,
  buildGeometryHashInput,
  calcLithophanePrice,
  clampCrop,
  customDimensionPrice,
  orientedDims,
  parseOptionGroups,
  resolveOptions,
  round2,
  type Crop,
  type LithophaneInput,
  type LithophaneSnapshot,
  type Orientation,
  type OptionGroup,
  type PriceBreakdown,
  type ResolvedOptions,
} from '@/lib/lithophane';
import { ownerCanRead, sha256, type Caller } from '@/lib/lithophaneAccess';

export class LithophaneError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'LithophaneError';
    this.status = status;
  }
}

// ------------------------------------------------------------------ seeding

const geoSelect = (key: string, label: string, choices: Array<[string, string, number]>, geometry: boolean) => ({
  key,
  label,
  type: 'select',
  geometry,
  choices: choices.map(([value, l, priceAdjustment]) => ({ value, label: l, priceAdjustment })),
  default: choices[0][0],
});
const yesNo = (key: string, label: string, yesPrice: number, defaultYes = false) => ({
  key,
  label,
  type: 'toggle',
  geometry: false,
  choices: defaultYes
    ? [
        { value: 'yes', label: 'Yes', priceAdjustment: yesPrice },
        { value: 'no', label: 'No', priceAdjustment: 0 },
      ]
    : [
        { value: 'no', label: 'No', priceAdjustment: 0 },
        { value: 'yes', label: 'Yes', priceAdjustment: yesPrice },
      ],
  default: defaultYes ? 'yes' : 'no',
});
const COLOURS: Array<[string, string, number]> = [
  ['black', 'Carbon Black', 0],
  ['white', 'Bone White', 0],
  ['walnut', 'Walnut Brown', 0],
];

const PLACEHOLDER_NOTE = 'PLACEHOLDER seed value: the owner must set the real dimensions and price in /admin/lithophane.';

interface SeedVariety {
  key: string;
  name: string;
  description: string;
  baseModel: string;
  basePrice: number;
  supportsLight: boolean;
  sortOrder: number;
  productionDays: number;
  optionGroups: unknown[];
  sizes: Array<{ name: string; widthMm: number; heightMm: number; depthMm: number; thicknessMm: number; priceAdjustment: number; isDefault: boolean }>;
}

export const SEED_VARIETIES: SeedVariety[] = [
  {
    key: 'photo_frame',
    name: 'Lithophane Photo Frame',
    description: 'A slim frame that holds your lithophane panel. Hang it or stand it near a window.',
    baseModel: 'photo_frame',
    basePrice: 999,
    supportsLight: true,
    sortOrder: 1,
    productionDays: 7,
    optionGroups: [
      geoSelect('frame_style', 'Frame style', [['slim', 'Slim', 0], ['classic', 'Classic', 100], ['wide', 'Wide', 150]], true),
      geoSelect('frame_colour', 'Frame colour', COLOURS, false),
      yesNo('gift_packaging', 'Gift packaging', 149),
    ],
    sizes: [
      { name: 'Small', widthMm: 100, heightMm: 150, depthMm: 18, thicknessMm: 3, priceAdjustment: 0, isDefault: false },
      { name: 'Medium', widthMm: 150, heightMm: 200, depthMm: 18, thicknessMm: 3, priceAdjustment: 300, isDefault: true },
      { name: 'Large', widthMm: 200, heightMm: 300, depthMm: 18, thicknessMm: 3, priceAdjustment: 700, isDefault: false },
    ],
  },
  {
    key: 'table_stand',
    name: 'Lithophane Table Stand',
    description: 'A desk-ready stand that holds your lithophane upright. Pair it with a lamp or window light.',
    baseModel: 'table_stand',
    basePrice: 1199,
    supportsLight: true,
    sortOrder: 2,
    productionDays: 7,
    optionGroups: [
      geoSelect('stand_type', 'Stand type', [['angled', 'Angled base', 0], ['flat', 'Flat base', 0], ['wide', 'Wide base', 100]], true),
      geoSelect('base_colour', 'Base colour', COLOURS, false),
      yesNo('gift_packaging', 'Gift packaging', 149),
    ],
    sizes: [
      { name: 'Small', widthMm: 100, heightMm: 150, depthMm: 60, thicknessMm: 3, priceAdjustment: 0, isDefault: false },
      { name: 'Medium', widthMm: 150, heightMm: 200, depthMm: 70, thicknessMm: 3, priceAdjustment: 300, isDefault: true },
      { name: 'Large', widthMm: 200, heightMm: 300, depthMm: 80, thicknessMm: 3, priceAdjustment: 700, isDefault: false },
    ],
  },
  {
    key: 'light_box',
    name: 'Lithophane Light Box',
    description: 'An enclosure with a built-in light that glows through your lithophane. Best in a dim room.',
    baseModel: 'light_box',
    basePrice: 1799,
    supportsLight: true,
    sortOrder: 3,
    productionDays: 9,
    optionGroups: [
      yesNo('light_included', 'LED light included', 299, true),
      geoSelect('light_temperature', 'Light temperature', [['warm', 'Warm white', 0], ['cool', 'Cool white', 0]], false),
      geoSelect('box_colour', 'Box colour', COLOURS, false),
      yesNo('gift_packaging', 'Gift packaging', 149),
    ],
    sizes: [
      { name: 'Small', widthMm: 100, heightMm: 150, depthMm: 70, thicknessMm: 3, priceAdjustment: 0, isDefault: false },
      { name: 'Medium', widthMm: 150, heightMm: 200, depthMm: 80, thicknessMm: 3, priceAdjustment: 400, isDefault: true },
      { name: 'Large', widthMm: 200, heightMm: 300, depthMm: 90, thicknessMm: 3, priceAdjustment: 900, isDefault: false },
    ],
  },
];

let ensuring: Promise<void> | null = null;

/** Idempotent lazy seed: line Product, settings singleton, 3 varieties x 3 sizes. Safe to call on every request. */
export function ensureLithophaneSetup(): Promise<void> {
  if (!ensuring) {
    ensuring = doEnsure().catch((e) => {
      ensuring = null;
      throw e;
    });
  }
  return ensuring;
}

async function doEnsure() {
  const product = await prisma.product.upsert({
    where: { slug: LITHOPHANE_PRODUCT_SLUG },
    update: {},
    create: {
      name: 'Custom Lithophane',
      slug: LITHOPHANE_PRODUCT_SLUG,
      category: 'Custom',
      price: 0,
      description: 'Your photo turned into a custom 3D-printed lithophane. Configured in the Lithophane Builder.',
      images: [],
      stock: 0,
      trackInventory: false,
      customizable: true,
      prepaidOnly: true,
      codEnabled: false,
      isActive: true,
      isArchived: false,
      productionTimeDays: 7,
      estimatedDispatchDays: 3,
    },
  });
  // Repair drift on the carrier product (these flags are load-bearing for COD rejection and stock).
  await prisma.product.update({
    where: { id: product.id },
    data: { prepaidOnly: true, codEnabled: false, trackInventory: false, customizable: true, isActive: true, isArchived: false },
  });

  let settings = await prisma.lithophaneSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.lithophaneSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default', productId: product.id } });
  } else if (settings.productId !== product.id) {
    settings = await prisma.lithophaneSettings.update({ where: { id: 'default' }, data: { productId: product.id } });
  }

  const count = await prisma.lithophaneVariety.count();
  if (count === 0) {
    for (const sv of SEED_VARIETIES) {
      const created = await prisma.lithophaneVariety.upsert({
        where: { key: sv.key },
        update: {},
        create: {
          key: sv.key,
          name: sv.name,
          description: sv.description,
          baseModel: sv.baseModel,
          basePrice: sv.basePrice,
          supportsLight: sv.supportsLight,
          sortOrder: sv.sortOrder,
          productionDays: sv.productionDays,
          optionGroups: sv.optionGroups as Prisma.InputJsonValue,
        },
      });
      const existing = await prisma.lithophaneSize.count({ where: { varietyId: created.id } });
      if (existing === 0) {
        let defaultSizeId: string | null = null;
        let order = 0;
        for (const s of sv.sizes) {
          const row = await prisma.lithophaneSize.create({
            data: { ...s, varietyId: created.id, sortOrder: order++, productionNotes: PLACEHOLDER_NOTE },
          });
          if (s.isDefault) defaultSizeId = row.id;
        }
        await prisma.lithophaneVariety.update({ where: { id: created.id }, data: { defaultSizeId } });
      }
    }
  }
  const fresh = await prisma.lithophaneSettings.findUnique({ where: { id: 'default' } });
  if (fresh && !fresh.defaultVarietyId) {
    const first = await prisma.lithophaneVariety.findFirst({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    if (first) await prisma.lithophaneSettings.update({ where: { id: 'default' }, data: { defaultVarietyId: first.id } });
  }
}

// ------------------------------------------------------------------ public config

export async function getSettings() {
  await ensureLithophaneSetup();
  const s = await prisma.lithophaneSettings.findUnique({ where: { id: 'default' } });
  if (!s) throw new LithophaneError('Lithophane builder is not configured.', 503);
  return s;
}

export async function getPublicConfig() {
  const settings = await getSettings();
  const varieties = await prisma.lithophaneVariety.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { sizes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
  });
  const out = varieties
    .filter((v) => v.sizes.length > 0)
    .map((v) => {
      const groups = parseOptionGroups(v.optionGroups);
      const defSize = v.sizes.find((s) => s.id === v.defaultSizeId) ?? v.sizes.find((s) => s.isDefault) ?? v.sizes[0];
      const minAdj = Math.min(...v.sizes.map((s) => s.priceAdjustment));
      return {
        id: v.id,
        key: v.key,
        name: v.name,
        description: v.description,
        thumbnailUrl: v.thumbnailUrl,
        baseModel: v.baseModel || v.key,
        basePrice: v.basePrice,
        startingPrice: round2(v.basePrice + minAdj),
        supportsLight: v.supportsLight,
        productionDays: v.productionDays,
        arEnabled: (v as any).arEnabled ?? true,
        arPlacementType: (v as any).arPlacementType ?? 'floor',
        arModelSource: (v as any).arModelSource ?? 'auto',
        arScaleMode: (v as any).arScaleMode ?? 'fixed',
        arBaseOffset: (v as any).arBaseOffset ?? 0,
        supportsArLighting: (v as any).supportsArLighting ?? true,
        optionGroups: groups,
        defaultSizeId: defSize.id,
        sizes: v.sizes.map((s) => ({
          id: s.id,
          name: s.name,
          widthMm: s.widthMm,
          heightMm: s.heightMm,
          depthMm: s.depthMm,
          thicknessMm: s.thicknessMm,
          priceAdjustment: s.priceAdjustment,
          isDefault: s.id === defSize.id,
        })),
      };
    });
  const defaultVariety = out.find((v) => v.id === settings.defaultVarietyId) ?? out[0] ?? null;
  return {
    settings: {
      productId: settings.productId,
      defaultVarietyKey: defaultVariety?.key ?? null,
      defaultOrientation: settings.defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
      defaultCropStrategy: settings.defaultCropStrategy,
      defaultThicknessMm: settings.defaultThicknessMm,
      minThicknessMm: settings.minThicknessMm,
      previewResolution: settings.previewResolution,
      allowCustomDimensions: settings.allowCustomDimensions,
      customMinMm: settings.customMinMm,
      customMaxMm: settings.customMaxMm,
      headline: settings.headline,
      subheadline: settings.subheadline,
      uploadGuidance: settings.uploadGuidance,
      previewDisclaimer: settings.previewDisclaimer,
      leadTimeText: settings.leadTimeText,
    },
    varieties: out,
  };
}

// ------------------------------------------------------------------ resolution

export interface ResolveInput {
  varietyKey: string;
  sizeId?: string | null;
  customWidthMm?: number | null;
  customHeightMm?: number | null;
  orientation?: Orientation | string | null;
  crop?: Partial<Crop> | null;
  options?: Record<string, unknown> | null;
  quantity?: number;
  filename?: string;
}

export interface ResolvedLithophane {
  productId: string | null;
  varietyId: string;
  varietyKey: string;
  varietyName: string;
  baseModel: string;
  groups: OptionGroup[];
  sizeId: string | null;
  sizeName: string;
  custom: boolean;
  widthMm: number;
  heightMm: number;
  depthMm: number | null;
  thicknessMm: number;
  minThicknessMm: number;
  orientation: Orientation;
  crop: Crop;
  options: ResolvedOptions;
  price: PriceBreakdown;
  productionNotes: string | null;
  previewResolution: number;
  productionResolution: number;
  hashInput: string | null;
  hash: string | null;
}

export function hashOf(hashInput: string) {
  return sha256(hashInput);
}

export async function resolveLithophane(input: ResolveInput): Promise<ResolvedLithophane> {
  const settings = await getSettings();
  const variety = await prisma.lithophaneVariety.findUnique({
    where: { key: String(input.varietyKey || '') },
    include: { sizes: true },
  });
  if (!variety || !variety.isActive) throw new LithophaneError('That product type is not available.');
  const groups = parseOptionGroups(variety.optionGroups);

  const orientation: Orientation =
    input.orientation === 'landscape' || input.orientation === 'portrait'
      ? input.orientation
      : settings.defaultOrientation === 'landscape'
        ? 'landscape'
        : 'portrait';

  let sizeId: string | null = null;
  let sizeName = 'Custom';
  let custom = false;
  let baseW: number;
  let baseH: number;
  let depthMm: number | null = null;
  let thicknessMm: number;
  let sizeAdj = 0;
  let cdPrice = 0;
  let productionNotes: string | null = null;

  if (input.sizeId) {
    const size = variety.sizes.find((s) => s.id === input.sizeId);
    if (!size || !size.isActive) throw new LithophaneError('That size is not available for this product type.');
    sizeId = size.id;
    sizeName = size.name;
    baseW = size.widthMm;
    baseH = size.heightMm;
    depthMm = size.depthMm;
    thicknessMm = size.thicknessMm;
    sizeAdj = size.priceAdjustment;
    productionNotes = size.productionNotes;
  } else {
    if (!settings.allowCustomDimensions) throw new LithophaneError('Custom dimensions are not enabled.');
    const w = Number(input.customWidthMm);
    const h = Number(input.customHeightMm);
    if (!Number.isFinite(w) || !Number.isFinite(h)) throw new LithophaneError('Enter a custom width and height.');
    if (w < settings.customMinMm || w > settings.customMaxMm || h < settings.customMinMm || h > settings.customMaxMm) {
      throw new LithophaneError(`Custom dimensions must be between ${settings.customMinMm} and ${settings.customMaxMm} mm.`);
    }
    custom = true;
    baseW = w;
    baseH = h;
    thicknessMm = settings.defaultThicknessMm;
    cdPrice = customDimensionPrice(w, h, settings.customPricePer100Cm2);
  }

  const dims = orientedDims(baseW, baseH, orientation);
  const crop = clampCrop(input.crop);
  const opts = resolveOptions(groups, input.options as Record<string, unknown> | undefined);
  if (opts.errors.length) throw new LithophaneError(opts.errors[0]);

  const price = calcLithophanePrice({
    basePrice: variety.basePrice,
    sizeAdjustment: sizeAdj,
    optionsTotal: opts.total,
    customDimensionPrice: cdPrice,
    quantity: input.quantity ?? 1,
  });

  let hashInput: string | null = null;
  let hash: string | null = null;
  if (input.filename) {
    hashInput = buildGeometryHashInput({
      filename: input.filename,
      crop,
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
      thicknessMm,
      orientation,
      varietyKey: variety.key,
      geometryOptions: opts.geometry,
    });
    hash = hashOf(hashInput);
  }

  return {
    productId: settings.productId,
    varietyId: variety.id,
    varietyKey: variety.key,
    varietyName: variety.name,
    baseModel: variety.baseModel || variety.key,
    groups,
    sizeId,
    sizeName,
    custom,
    widthMm: dims.widthMm,
    heightMm: dims.heightMm,
    depthMm,
    thicknessMm,
    minThicknessMm: Math.min(settings.minThicknessMm, thicknessMm),
    orientation,
    crop,
    options: opts,
    price,
    productionNotes,
    previewResolution: settings.previewResolution,
    productionResolution: settings.productionResolution,
    hashInput,
    hash,
  };
}

/** Client-safe subset of a resolution (never includes admin-only production notes). */
export function publicResolved(r: ResolvedLithophane) {
  return {
    varietyKey: r.varietyKey,
    varietyName: r.varietyName,
    baseModel: r.baseModel,
    sizeId: r.sizeId,
    sizeName: r.sizeName,
    custom: r.custom,
    widthMm: r.widthMm,
    heightMm: r.heightMm,
    depthMm: r.depthMm,
    thicknessMm: r.thicknessMm,
    minThicknessMm: r.minThicknessMm,
    orientation: r.orientation,
    crop: r.crop,
    options: r.options.values,
    optionLines: r.options.lines,
    previewResolution: r.previewResolution,
  };
}

// ------------------------------------------------------------------ uploads + generations

export async function requireOwnedUpload(filename: string, caller: Caller) {
  if (!/^[A-Za-z0-9._-]{1,200}$/.test(filename)) throw new LithophaneError('Invalid photo reference.');
  const file = await prisma.uploadedFile.findUnique({ where: { filename } });
  // Unknown file and someone else's file are indistinguishable.
  if (!file || !ownerCanRead(file, caller)) throw new LithophaneError('Photo not found. Please upload it again.', 404);
  return file;
}

export async function upsertPreviewGeneration(r: ResolvedLithophane, filename: string, caller: Caller) {
  if (!r.hash) throw new LithophaneError('Missing photo.');
  const existing = await prisma.lithophaneGeneration.findUnique({ where: { hash_kind: { hash: r.hash, kind: 'PREVIEW' } } });
  if (existing) return { generation: existing, cached: true };
  const config = { ...publicResolved(r), filename, hashInput: r.hashInput } as unknown as Prisma.InputJsonValue;
  const generation = await prisma.lithophaneGeneration.upsert({
    where: { hash_kind: { hash: r.hash, kind: 'PREVIEW' } },
    update: {},
    create: {
      hash: r.hash,
      kind: 'PREVIEW',
      status: 'READY',
      uploadFilename: filename,
      config,
      resolution: r.previewResolution,
      userId: caller.userId ?? null,
    },
  });
  return { generation, cached: false };
}

// ------------------------------------------------------------------ order/cart line validation

export interface ResolvedLine {
  productId: string;
  resolved: ResolvedLithophane;
  snapshot: LithophaneSnapshot;
}

/**
 * Validates a lithophane cart line against the database and returns the authoritative resolution.
 * Throws LithophaneError for any mismatch (foreign upload, unknown generation, hash drift, inactive size...).
 */
export async function resolveLithophaneLine(
  input: LithophaneInput,
  quantity: number,
  caller: Caller | null,
): Promise<ResolvedLine> {
  const settings = await getSettings();
  if (!settings.productId) throw new LithophaneError('Lithophane builder is not configured.', 503);
  const file = await prisma.uploadedFile.findUnique({ where: { filename: input.filename } });
  if (!file || !caller || !ownerCanRead(file, caller)) {
    throw new LithophaneError('Your lithophane photo could not be verified. Please re-open the builder and upload it again.');
  }
  const resolved = await resolveLithophane({ ...input, quantity });
  if (!resolved.hash || resolved.hash !== input.hash) {
    throw new LithophaneError('Your lithophane configuration changed. Please re-open the builder and add it to the cart again.');
  }
  const gen = await prisma.lithophaneGeneration.findUnique({ where: { id: input.generationId } });
  if (!gen || gen.hash !== resolved.hash || gen.kind !== 'PREVIEW' || gen.uploadFilename !== input.filename) {
    throw new LithophaneError('Your lithophane preview could not be verified. Please regenerate it in the builder.');
  }
  const snapshot: LithophaneSnapshot = {
    version: 1,
    filename: input.filename,
    generationId: gen.id,
    hash: resolved.hash,
    varietyKey: resolved.varietyKey,
    varietyName: resolved.varietyName,
    sizeId: resolved.sizeId,
    sizeName: resolved.sizeName,
    custom: resolved.custom,
    widthMm: resolved.widthMm,
    heightMm: resolved.heightMm,
    depthMm: resolved.depthMm,
    thicknessMm: resolved.thicknessMm,
    orientation: resolved.orientation,
    crop: resolved.crop,
    lighting: input.lighting === 'on' ? 'on' : 'off',
    notes: (input.notes ?? '').toString().slice(0, 1000),
    options: resolved.options.lines.map((l) => ({ key: l.key, label: l.label, value: l.value, valueLabel: l.valueLabel, priceAdjustment: l.priceAdjustment })),
    productionNotes: resolved.productionNotes,
    price: resolved.price,
    previewResolution: resolved.previewResolution,
    productionResolution: resolved.productionResolution,
    frozenAt: new Date().toISOString(),
  };
  return { productId: settings.productId, resolved, snapshot };
}

/** Called inside the order transaction: queue the PRODUCTION generation (real export is out of scope). */
export async function queueProductionGeneration(
  tx: Prisma.TransactionClient,
  snapshot: LithophaneSnapshot,
  resolved: ResolvedLithophane,
  userId: string | null,
) {
  const prodHash = sha256(`PRODUCTION:${snapshot.hash}`);
  const row = await tx.lithophaneGeneration.upsert({
    where: { hash_kind: { hash: prodHash, kind: 'PRODUCTION' } },
    update: {},
    create: {
      hash: prodHash,
      kind: 'PRODUCTION',
      status: 'PENDING',
      uploadFilename: snapshot.filename,
      config: { ...publicResolved(resolved), filename: snapshot.filename, previewHash: snapshot.hash } as unknown as Prisma.InputJsonValue,
      resolution: snapshot.productionResolution,
      userId,
    },
  });
  return row.id;
}
