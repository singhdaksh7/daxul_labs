import { z } from 'zod';

const choice = z.object({
  value: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(80),
  priceAdjustment: z.number().min(-100000).max(100000).default(0),
});
export const optionGroupSchema = z
  .object({
    key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,40}$/, 'Use lowercase letters, digits and underscores'),
    label: z.string().trim().min(1).max(80),
    type: z.enum(['select', 'toggle']).default('select'),
    geometry: z.boolean().default(false),
    choices: z.array(choice).min(1).max(20),
    default: z.string().trim().min(1).max(60),
  })
  .refine((g) => g.choices.some((c) => c.value === g.default), { message: 'Default must be one of the choices', path: ['default'] });

export const optionGroupsSchema = z
  .array(optionGroupSchema)
  .max(12)
  .refine((gs) => new Set(gs.map((g) => g.key)).size === gs.length, { message: 'Option keys must be unique' });

export const varietyFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional(),
  thumbnailUrl: z.string().trim().max(500).nullable().optional(),
  baseModel: z.string().trim().max(60).optional(),
  basePrice: z.number().min(0).max(1_000_000),
  supportsLight: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  productionDays: z.number().int().min(1).max(90).optional(),
  optionGroups: optionGroupsSchema.optional(),
};

export const varietyCreateSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{1,40}$/, 'Use lowercase letters, digits and underscores'),
  ...varietyFields,
});
export const varietyUpdateSchema = z.object(varietyFields).partial().extend({ defaultSizeId: z.string().max(64).nullable().optional() });

export const sizeFields = {
  name: z.string().trim().min(1).max(80),
  widthMm: z.number().min(20).max(1500),
  heightMm: z.number().min(20).max(1500),
  depthMm: z.number().min(0).max(1500).nullable().optional(),
  thicknessMm: z.number().min(0.5).max(20),
  priceAdjustment: z.number().min(-1_000_000).max(1_000_000).optional(),
  productionNotes: z.string().trim().max(1000).nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
};
export const sizeCreateSchema = z.object({ varietyId: z.string().min(1).max(64), ...sizeFields });
export const sizeUpdateSchema = z.object(sizeFields).partial();
