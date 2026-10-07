import { z } from 'zod';

export const CUSTOM_FIELD_TYPES = ['text', 'textarea', 'photo', 'file', 'date', 'select', 'radio'] as const;

const optStr = (max = 5000) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));

const money = z.coerce.number().finite().min(0).max(10_000_000);
const adj = z.coerce.number().finite().min(-10_000_000).max(10_000_000);
const optInt = z.coerce.number().int().min(0).max(1_000_000);

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  sku: optStr(80),
  priceAdjustment: adj.default(0),
  stock: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().int().min(0).max(1_000_000).nullable()),
  isActive: z.boolean().default(true),
});

export const variantGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  variants: z.array(variantSchema).max(100),
});

export const choiceSchema = z.object({
  label: z.string().trim().min(1).max(200),
  value: z.string().trim().max(200).optional(),
  priceAdjustment: adj.default(0),
});

export const customFieldSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(CUSTOM_FIELD_TYPES),
    label: z.string().trim().min(1).max(200),
    placeholder: optStr(300),
    helpText: optStr(1000),
    required: z.boolean().default(false),
    fee: money.default(0),
    isActive: z.boolean().default(true),
    choices: z.array(choiceSchema).max(100).default([]),
  })
  .refine((f) => !(f.type === 'select' || f.type === 'radio') || f.choices.length > 0, {
    message: 'select/radio fields need at least one choice',
    path: ['choices'],
  });

export const businessCostsSchema = z
  .object({
    filamentGrams: z.coerce.number().min(0).default(0),
    filamentCostPerGram: z.coerce.number().min(0).default(0),
    printHours: z.coerce.number().min(0).default(0),
    electricityPerHour: z.coerce.number().min(0).default(0),
    hardwareCost: z.coerce.number().min(0).default(0),
    ledElectronicsCost: z.coerce.number().min(0).default(0),
    packagingCost: z.coerce.number().min(0).default(0),
    otherMaterialCost: z.coerce.number().min(0).default(0),
  })
  .nullish();

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional().default(''),
  subtitle: optStr(300),
  description: z.string().max(20000).default(''),
  story: optStr(20000),
  collectionId: z.string().nullish().transform((v) => v || null),
  price: money,
  compareAtPrice: z.preprocess((v) => (v === '' || v === undefined ? null : v), money.nullable()),
  sku: optStr(80),
  customizable: z.boolean().default(false),
  prepaidOnly: z.boolean().default(false),
  codEnabled: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  trackInventory: z.boolean().default(true),
  stock: optInt.default(0),
  lowStockThreshold: optInt.default(3),
  badge: optStr(60),
  seoTitle: optStr(200),
  seoDescription: optStr(1000),
  ogImage: optStr(2000),
  images: z.array(z.string().trim().min(1).max(2000)).max(30).default([]),
  videoUrl: optStr(2000),
  materials: optStr(5000),
  dimensions: optStr(500),
  careInstructions: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
  leadTimeText: optStr(300),
  productionTimeDays: optInt.default(2),
  estimatedDispatchDays: optInt.default(3),
  specs: z.array(z.object({ label: z.string().trim().min(1).max(200), value: z.string().trim().max(1000) })).max(60).default([]),
  faq: z.array(z.object({ question: z.string().trim().min(1).max(500), answer: z.string().trim().max(5000) })).max(60).default([]),
  businessCosts: businessCostsSchema,
  variantGroups: z.array(variantGroupSchema).max(12).default([]),
  customFields: z.array(customFieldSchema).max(30).default([]),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productInputSchema.extend({ id: z.string().min(1) });

export const productActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['duplicate', 'archive', 'unarchive', 'feature', 'unfeature']),
});

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'product'
  );
}
