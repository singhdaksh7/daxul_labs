/**
 * Client-safe price helpers used for DISPLAY ONLY. The server (create-order)
 * recomputes every price from the database and is the source of truth.
 */
import type { CustomFieldConfig, StoreProduct } from './types';

export function isUploadField(type: string): boolean {
  return type === 'photo' || type === 'image' || type === 'file';
}

export function isChoiceField(type: string): boolean {
  return type === 'select' || type === 'radio' || type === 'color';
}

export interface CustomizationQuote {
  /** Sum of custom-field fees plus select/radio choice adjustments. */
  fee: number;
  /** Human readable label/value pairs for cart display. */
  details: { fieldId: string; label: string; display: string }[];
}

export function quoteCustomizations(
  fields: CustomFieldConfig[],
  values: Record<string, string>,
): CustomizationQuote {
  let fee = 0;
  const details: CustomizationQuote['details'] = [];
  for (const f of fields) {
    const raw = (values[f.id] ?? '').trim();
    if (!raw) continue;
    fee += f.fee || 0;
    let display = raw;
    if (isChoiceField(f.type) && f.choices) {
      const choice = f.choices.find((c) => c.value === raw);
      if (choice) {
        fee += choice.priceAdjustment || 0;
        display = choice.label;
      }
    } else if (isUploadField(f.type)) {
      display = 'Uploaded file';
    }
    details.push({ fieldId: f.id, label: f.label, display });
  }
  return { fee, details };
}

export function variantAdjustment(
  product: Pick<StoreProduct, 'variantGroups'>,
  selected: Record<string, string>, // groupId -> variantId
): number {
  let total = 0;
  for (const g of product.variantGroups) {
    const v = g.variants.find((x) => x.id === selected[g.id]);
    if (v) total += v.priceAdjustment || 0;
  }
  return total;
}

export function formatMoney(symbol: string, amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${symbol}${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
}
