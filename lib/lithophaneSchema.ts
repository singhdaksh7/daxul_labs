import { z } from 'zod';

/** Shared zod schema for a lithophane line sent by the cart/checkout (no prices: the server prices it). */
export const lithophaneInputSchema = z.object({
  filename: z.string().min(1).max(200),
  generationId: z.string().min(1).max(64),
  hash: z.string().min(16).max(128),
  varietyKey: z.string().min(1).max(64),
  sizeId: z.string().max(64).optional().nullable(),
  customWidthMm: z.number().finite().optional().nullable(),
  customHeightMm: z.number().finite().optional().nullable(),
  orientation: z.enum(['portrait', 'landscape']),
  crop: z.object({ cx: z.number().finite(), cy: z.number().finite(), zoom: z.number().finite() }),
  options: z.record(z.string(), z.string().max(80)),
  lighting: z.enum(['off', 'on']).optional(),
  notes: z.string().max(1000).optional(),
});
