/**
 * Server-side storefront data layer. Reads PostgreSQL via Prisma and maps rows
 * to customer-safe shapes from lib/types.ts.
 *
 * Rules:
 *  - Server only. Never import this from a "use client" file.
 *  - NEVER select Product.businessCosts (internal cost data).
 *  - Every read degrades to an empty/default result if the database is
 *    unreachable (e.g. during `next build` without a DB), so pages render
 *    empty states instead of crashing.
 *  - Reads are memoised per request with React.cache().
 */
import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type {
  CustomFieldConfig,
  CustomFieldType,
  FieldChoice,
  PublicSiteSettings,
  RadiusPreset,
  StoreCollection,
  StorePolicyDoc,
  StoreProduct,
  StoreVariantGroup,
  StorefrontTheme,
} from '@/lib/types';
import { DEFAULT_PUBLIC_SETTINGS, DEFAULT_TEXT, DEFAULT_THEME } from '@/lib/siteDefaults';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export { DEFAULT_THEME, DEFAULT_PUBLIC_SETTINGS };

export const POLICY_SLUGS = ['shipping', 'returns', 'cancellation', 'privacy', 'terms'] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

const POLICY_TITLES: Record<PolicySlug, string> = {
  shipping: 'Shipping & Delivery Policy',
  returns: 'Return & Replacement Policy',
  cancellation: 'Cancellation Policy',
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
};

const LEGACY_POLICY_FIELD = {
  shipping: 'shippingPolicyText',
  returns: 'returnPolicyText',
  cancellation: 'cancellationPolicyText',
  privacy: 'privacyPolicyText',
  terms: 'termsConditionsText',
} as const;

/** Accepts legacy aliases (e.g. /policies/return). Returns null for unknown slugs. */
export function normalizePolicySlug(raw: string): PolicySlug | null {
  const s = raw.toLowerCase();
  if (s === 'return' || s === 'refund' || s === 'refunds') return 'returns';
  if (s === 'cancel' || s === 'cancellations') return 'cancellation';
  return (POLICY_SLUGS as readonly string[]).includes(s) ? (s as PolicySlug) : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[catalog] ${label} failed (using fallback):`, (err as Error)?.message ?? err);
    return fallback;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function parseSpecs(v: unknown): { label: string; value: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isRecord)
    .map((x) => ({ label: String(x.label ?? ''), value: String(x.value ?? '') }))
    .filter((x) => x.label || x.value);
}

function parseFaq(v: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isRecord)
    .map((x) => ({ question: String(x.question ?? ''), answer: String(x.answer ?? '') }))
    .filter((x) => x.question || x.answer);
}

function parseChoices(v: unknown, options: string[]): FieldChoice[] | undefined {
  if (Array.isArray(v)) {
    const out = v
      .filter(isRecord)
      .map((c) => ({
        label: String(c.label ?? c.value ?? ''),
        value: String(c.value ?? c.label ?? ''),
        priceAdjustment: Number(c.priceAdjustment) || 0,
      }))
      .filter((c) => c.value);
    if (out.length) return out;
  }
  if (options.length) return options.map((o) => ({ label: o, value: o, priceAdjustment: 0 }));
  return undefined;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/** Explicit select: businessCosts is deliberately absent. */
const productSelect = {
  id: true,
  name: true,
  slug: true,
  category: true,
  price: true,
  compareAtPrice: true,
  description: true,
  story: true,
  specs: true,
  careInstructions: true,
  faq: true,
  images: true,
  videoUrl: true,
  badge: true,
  stock: true,
  productionTimeDays: true,
  estimatedDispatchDays: true,
  prepaidOnly: true,
  codEnabled: true,
  finishes: true,
  colors: true,
  sizes: true,
  isArchived: true,
  isFeatured: true,
  subtitle: true,
  sku: true,
  isActive: true,
  customizable: true,
  trackInventory: true,
  seoTitle: true,
  seoDescription: true,
  ogImage: true,
  materials: true,
  dimensions: true,
  leadTimeText: true,
  collectionId: true,
  updatedAt: true,
  collection: { select: { id: true, name: true, slug: true } },
  customFields: {
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      label: true,
      type: true,
      required: true,
      options: true,
      fee: true,
      placeholder: true,
      helpText: true,
      choices: true,
    },
  },
  variantGroups: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, sku: true, priceAdjustment: true, stock: true },
      },
    },
  },
} satisfies Prisma.ProductSelect;

const liveProductWhere = { isArchived: false, isActive: true } as const;

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  description: string;
  story: string | null;
  specs: unknown;
  careInstructions: string[];
  faq: unknown;
  images: string[];
  videoUrl: string | null;
  badge: string | null;
  stock: number;
  productionTimeDays: number;
  estimatedDispatchDays: number;
  prepaidOnly: boolean;
  codEnabled: boolean;
  finishes: string[];
  colors: string[];
  sizes: string[];
  isArchived: boolean;
  isFeatured: boolean;
  subtitle: string | null;
  sku: string | null;
  customizable: boolean;
  trackInventory: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  materials: string | null;
  dimensions: string | null;
  leadTimeText: string | null;
  collectionId: string | null;
  updatedAt: Date;
  collection: { id: string; name: string; slug: string } | null;
  customFields: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    options: string[];
    fee: number;
    placeholder: string | null;
    helpText: string | null;
    choices: unknown;
  }[];
  variantGroups: {
    id: string;
    name: string;
    variants: { id: string; name: string; sku: string | null; priceAdjustment: number; stock: number | null }[];
  }[];
};

function mapProduct(p: ProductRow): StoreProduct {
  const customFields: CustomFieldConfig[] = p.customFields.map((f) => ({
    id: f.id,
    label: f.label,
    type: (f.type || 'text') as CustomFieldType,
    required: f.required,
    options: f.options,
    fee: f.fee,
    placeholder: f.placeholder ?? undefined,
    helpText: f.helpText ?? undefined,
    choices: parseChoices(f.choices, f.options),
  }));

  const variantGroups: StoreVariantGroup[] = p.variantGroups
    .map((g) => ({
      id: g.id,
      name: g.name,
      variants: g.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku ?? undefined,
        priceAdjustment: v.priceAdjustment,
        inStock: v.stock === null || v.stock > 0,
      })),
    }))
    .filter((g) => g.variants.length > 0);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? undefined,
    description: p.description,
    story: p.story ?? '',
    specs: parseSpecs(p.specs),
    careInstructions: p.careInstructions,
    faq: parseFaq(p.faq),
    images: p.images,
    videoUrl: p.videoUrl ?? undefined,
    badge: p.badge ?? undefined,
    stock: p.stock,
    productionTimeDays: p.productionTimeDays,
    estimatedDispatchDays: p.estimatedDispatchDays,
    prepaidOnly: p.prepaidOnly,
    codEnabled: p.codEnabled,
    finishes: p.finishes,
    colors: p.colors,
    sizes: p.sizes,
    customFields,
    isArchived: p.isArchived,
    isFeatured: p.isFeatured,
    subtitle: p.subtitle ?? undefined,
    sku: p.sku ?? undefined,
    customizable: p.customizable || customFields.length > 0,
    trackInventory: p.trackInventory,
    inStock: !p.trackInventory || p.stock > 0,
    materials: p.materials ?? undefined,
    dimensions: p.dimensions ?? undefined,
    leadTimeText: p.leadTimeText ?? undefined,
    seoTitle: p.seoTitle ?? undefined,
    seoDescription: p.seoDescription ?? undefined,
    ogImage: p.ogImage ?? undefined,
    collectionId: p.collectionId ?? undefined,
    collectionSlug: p.collection?.slug,
    collectionName: p.collection?.name,
    variantGroups,
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Active, non-archived products (featured first, then newest). */
export const getProducts = cache(async (): Promise<StoreProduct[]> =>
  safe('getProducts', [] as StoreProduct[], async () => {
    const rows = await prisma.product.findMany({
      where: liveProductWhere,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: productSelect,
    });
    return (rows as unknown as ProductRow[]).map(mapProduct);
  }),
);

/** Looks up by slug or id. Returns null when missing/archived/inactive. */
export const getProductByIdOrSlug = cache(async (idOrSlug: string): Promise<StoreProduct | null> =>
  safe('getProductByIdOrSlug', null as StoreProduct | null, async () => {
    const row = await prisma.product.findFirst({
      where: { ...liveProductWhere, OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
      select: productSelect,
    });
    return row ? mapProduct(row as unknown as ProductRow) : null;
  }),
);

export const getRelatedProducts = cache(async (productId: string, category: string, limit = 4): Promise<StoreProduct[]> =>
  safe('getRelatedProducts', [] as StoreProduct[], async () => {
    const rows = await prisma.product.findMany({
      where: { ...liveProductWhere, id: { not: productId }, category },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: productSelect,
    });
    return (rows as unknown as ProductRow[]).map(mapProduct);
  }),
);

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  badge: string | null;
  featured: boolean;
  heroMedia: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  _count: { products: number };
};

function mapCollection(c: CollectionRow): StoreCollection {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    badge: c.badge ?? undefined,
    featured: c.featured,
    heroMedia: c.heroMedia ?? undefined,
    seoTitle: c.seoTitle ?? undefined,
    seoDescription: c.seoDescription ?? undefined,
    ogImage: c.ogImage ?? undefined,
    productCount: c._count.products,
  };
}

const collectionSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
  badge: true,
  featured: true,
  heroMedia: true,
  seoTitle: true,
  seoDescription: true,
  ogImage: true,
  _count: { select: { products: { where: liveProductWhere } } },
} satisfies Prisma.CollectionSelect;

export const getCollections = cache(async (): Promise<StoreCollection[]> =>
  safe('getCollections', [] as StoreCollection[], async () => {
    const rows = await prisma.collection.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: collectionSelect,
    });
    return (rows as unknown as CollectionRow[]).map(mapCollection);
  }),
);

export const getCollectionWithProducts = cache(
  async (slug: string): Promise<{ collection: StoreCollection; products: StoreProduct[] } | null> =>
    safe('getCollectionWithProducts', null as { collection: StoreCollection; products: StoreProduct[] } | null, async () => {
      const row = await prisma.collection.findFirst({
        where: { isActive: true, OR: [{ slug }, { id: slug }] },
        select: collectionSelect,
      });
      if (!row) return null;
      const products = await prisma.product.findMany({
        where: { ...liveProductWhere, collectionId: row.id },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        select: productSelect,
      });
      return {
        collection: mapCollection(row as unknown as CollectionRow),
        products: (products as unknown as ProductRow[]).map(mapProduct),
      };
    }),
);

// ---------------------------------------------------------------------------
// Settings & theme
// ---------------------------------------------------------------------------

export const getSiteSettings = cache(async (): Promise<PublicSiteSettings> =>
  safe('getSiteSettings', DEFAULT_PUBLIC_SETTINGS, async () => {
    const row = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', ...DEFAULT_TEXT },
    });
    return {
      announcementBarText: row.announcementBarText,
      announcementBarEnabled: row.announcementBarEnabled,
      brandName: row.brandName,
      brandTagline: row.brandTagline,
      brandDescription: row.brandDescription,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      whatsAppNumber: row.whatsAppNumber,
      instagramUrl: row.instagramUrl,
      whatsAppUrl: row.whatsAppUrl,
      youtubeUrl: row.youtubeUrl,
      facebookUrl: row.facebookUrl,
      footerText: row.footerText,
      standardShippingFee: row.standardShippingFee,
      expressShippingFee: row.expressShippingFee,
      standardShippingEnabled: row.standardShippingEnabled,
      expressShippingEnabled: row.expressShippingEnabled,
      freeShippingThreshold: row.freeShippingThreshold,
      codFee: row.codFee,
      codFeeEnabled: row.codFeeEnabled,
      globalCodEnabled: row.globalCodEnabled,
      customProductsPrepaidOnly: row.customProductsPrepaidOnly,
      currencySymbol: row.currencySymbol,
      currencyCode: row.currencyCode,
      supportHours: row.supportHours,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      defaultOgImage: row.defaultOgImage,
      searchIndexingEnabled: row.searchIndexingEnabled,
      customizationStep1Title: row.customizationStep1Title,
      customizationStep1Desc: row.customizationStep1Desc,
      customizationStep2Title: row.customizationStep2Title,
      customizationStep2Desc: row.customizationStep2Desc,
      customizationStep3Title: row.customizationStep3Title,
      customizationStep3Desc: row.customizationStep3Desc,
      customizationStep4Title: row.customizationStep4Title,
      customizationStep4Desc: row.customizationStep4Desc,
    } satisfies PublicSiteSettings;
  }),
);

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RADII: RadiusPreset[] = ['none', 'sm', 'md', 'lg', 'full'];

function color(v: string | null | undefined, fallback: string): string {
  return v && HEX.test(v.trim()) ? v.trim() : fallback;
}
function radius(v: string | null | undefined, fallback: RadiusPreset): RadiusPreset {
  return v && (RADII as string[]).includes(v) ? (v as RadiusPreset) : fallback;
}

export const getTheme = cache(async (): Promise<StorefrontTheme> =>
  safe('getTheme', DEFAULT_THEME, async () => {
    const row = await prisma.themeSettings.findUnique({ where: { id: 'default' } });
    if (!row) return DEFAULT_THEME;
    return {
      carbonColor: color(row.carbonColor, DEFAULT_THEME.carbonColor),
      boneColor: color(row.boneColor, DEFAULT_THEME.boneColor),
      graphiteColor: color(row.graphiteColor, DEFAULT_THEME.graphiteColor),
      accentColor: color(row.accentColor, DEFAULT_THEME.accentColor),
      buttonRadius: radius(row.buttonRadius, DEFAULT_THEME.buttonRadius),
      borderRadius: radius(row.borderRadius, DEFAULT_THEME.borderRadius),
    };
  }),
);

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

/**
 * StorePolicy row by slug; falls back to the legacy SiteSettings *PolicyText
 * column (then to built-in default copy) when no row exists.
 * Returns null only for unknown slugs.
 */
export const getPolicy = cache(async (rawSlug: string): Promise<StorePolicyDoc | null> => {
  const slug = normalizePolicySlug(rawSlug);
  if (!slug) return null;
  const fallbackDoc: StorePolicyDoc = {
    slug,
    title: POLICY_TITLES[slug],
    content: DEFAULT_TEXT[LEGACY_POLICY_FIELD[slug]],
  };
  return safe('getPolicy', fallbackDoc, async () => {
    const row = await prisma.storePolicy.findUnique({ where: { slug } });
    if (row && row.content.trim()) {
      return {
        slug,
        title: row.title || POLICY_TITLES[slug],
        content: row.content,
        updatedAt: row.updatedAt.toISOString(),
      };
    }
    const field = LEGACY_POLICY_FIELD[slug];
    const s = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const content = s?.[field]?.trim() || DEFAULT_TEXT[field];
    return { slug, title: POLICY_TITLES[slug], content };
  });
});

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

export const getSitemapEntries = cache(async () =>
  safe(
    'getSitemapEntries',
    {
      products: [] as { slug: string; updatedAt: Date }[],
      collections: [] as { slug: string; updatedAt: Date }[],
      policies: [] as { slug: string; updatedAt: Date }[],
    },
    async () => {
      const [products, collections, policies] = await Promise.all([
        prisma.product.findMany({ where: liveProductWhere, select: { slug: true, updatedAt: true } }),
        prisma.collection.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
        prisma.storePolicy.findMany({ select: { slug: true, updatedAt: true } }),
      ]);
      return { products, collections, policies };
    },
  ),
);
