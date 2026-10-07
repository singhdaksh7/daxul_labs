/**
 * Authoritative SERVER-SIDE pricing. Import only from route handlers / server code
 * (it pulls in Prisma). Client-supplied prices are never trusted: callers send only
 * { productId, quantity, variantSelections, customizations } and receive computed lines.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PricingError';
    this.status = status;
  }
}

export interface PricingInput {
  productId: string;
  quantity: number;
  variantSelections?: Array<{ groupId: string; variantId: string }>;
  customizations?: Record<string, unknown>;
}

export interface VariantSnapshot {
  groupId: string;
  group: string;
  variantId: string;
  variant: string;
  sku: string | null;
  priceAdjustment: number;
}

export interface StockPlan {
  /** Product-level stock to decrement (only when trackInventory and no selected variant has its own stock). */
  productId: string | null;
  /** Variant ids whose own stock is tracked and must be decremented. */
  variantIds: string[];
}

export interface PricedLine {
  productId: string;
  productName: string;
  productImage: string;
  productSku: string | null;
  quantity: number;
  basePrice: number;
  variantAdjustment: number;
  /** per-unit customization fee (field fees + choice adjustments) */
  customizationFee: number;
  /** authoritative per-unit price = base + variant adjustments + customizationFee */
  unitPrice: number;
  lineTotal: number;
  variantSelections: VariantSnapshot[];
  /** { [field label]: value } snapshot for OrderItem.customizations (null when nothing filled) */
  customizations: Record<string, string> | null;
  selectedFinish: string | null;
  selectedColor: string | null;
  selectedSize: string | null;
  customizable: boolean;
  prepaidOnly: boolean;
  codEnabled: boolean;
  stockPlan: StockPlan;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
}

const MAX_QTY = 100;
const MAX_TEXT = 2000;

const round2 = (n: number) => Math.round(n * 100) / 100;

type ChoiceDef = { label: string; value: string; priceAdjustment: number };

function readChoices(raw: unknown): ChoiceDef[] {
  if (!Array.isArray(raw)) return [];
  const out: ChoiceDef[] = [];
  for (const c of raw) {
    if (c && typeof c === 'object') {
      const o = c as Record<string, unknown>;
      const label = typeof o.label === 'string' ? o.label : String(o.value ?? '');
      const value = typeof o.value === 'string' ? o.value : label;
      const adj = Number(o.priceAdjustment ?? 0);
      if (label || value) out.push({ label, value, priceAdjustment: Number.isFinite(adj) ? adj : 0 });
    }
  }
  return out;
}

const productInclude = {
  variantGroups: { include: { variants: true }, orderBy: { sortOrder: 'asc' } },
  customFields: { orderBy: { order: 'asc' } },
} satisfies Prisma.ProductInclude;

type DbProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function priceOne(product: DbProduct, input: PricingInput): PricedLine {
  const name = product.name;
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
    throw new PricingError(`Invalid quantity for "${name}". Must be a whole number between 1 and ${MAX_QTY}.`);
  }
  if (!product.isActive || product.isArchived) {
    throw new PricingError(`"${name}" is no longer available.`);
  }

  // ---- Variants: exactly one active selection per group, ids must belong to this product
  const activeGroups = product.variantGroups.filter((g) => g.variants.some((v) => v.isActive));
  const selections = Array.isArray(input.variantSelections) ? input.variantSelections : [];
  const byGroup = new Map<string, string>();
  for (const s of selections) {
    if (!s || typeof s.groupId !== 'string' || typeof s.variantId !== 'string') {
      throw new PricingError(`Malformed variant selection for "${name}".`);
    }
    if (byGroup.has(s.groupId)) {
      throw new PricingError(`Multiple options chosen for the same option group on "${name}".`);
    }
    byGroup.set(s.groupId, s.variantId);
  }
  for (const gid of byGroup.keys()) {
    if (!product.variantGroups.some((g) => g.id === gid)) {
      throw new PricingError(`Invalid option group for "${name}".`);
    }
  }

  const snapshots: VariantSnapshot[] = [];
  const selectedVariants: Array<{ id: string; stock: number | null }> = [];
  let variantAdjustment = 0;
  for (const group of activeGroups) {
    const variantId = byGroup.get(group.id);
    if (!variantId) throw new PricingError(`Please select a ${group.name} for "${name}".`);
    const variant = group.variants.find((v) => v.id === variantId);
    if (!variant) throw new PricingError(`Invalid ${group.name} option for "${name}".`);
    if (!variant.isActive) throw new PricingError(`The selected ${group.name} "${variant.name}" is no longer available.`);
    variantAdjustment += variant.priceAdjustment;
    selectedVariants.push({ id: variant.id, stock: variant.stock });
    snapshots.push({
      groupId: group.id,
      group: group.name,
      variantId: variant.id,
      variant: variant.name,
      sku: variant.sku,
      priceAdjustment: variant.priceAdjustment,
    });
  }

  // ---- Customization fields
  const raw = input.customizations && typeof input.customizations === 'object' ? input.customizations : {};
  const activeFields = product.customFields.filter((f) => f.isActive);
  for (const key of Object.keys(raw)) {
    if (!product.customFields.some((f) => f.id === key)) {
      throw new PricingError(`Unknown customization field for "${name}".`);
    }
  }

  let customizationFee = 0;
  const snapshotCustom: Record<string, string> = {};
  for (const field of activeFields) {
    const v = (raw as Record<string, unknown>)[field.id];
    const str = v === undefined || v === null ? '' : typeof v === 'string' ? v.trim() : String(v).trim();
    if (!str) {
      if (field.required) throw new PricingError(`"${field.label}" is required for "${name}".`);
      continue;
    }
    if (str.length > MAX_TEXT) throw new PricingError(`"${field.label}" is too long.`);

    let adj = 0;
    if (field.type === 'select' || field.type === 'radio') {
      const choices = readChoices(field.choices);
      const legacy = choices.length === 0 ? field.options.map((o) => ({ label: o, value: o, priceAdjustment: 0 })) : choices;
      const choice = legacy.find((c) => c.value === str);
      if (!choice) throw new PricingError(`"${str}" is not a valid choice for "${field.label}".`);
      adj = choice.priceAdjustment;
      snapshotCustom[field.label] = choice.label || choice.value;
    } else if (field.type === 'photo' || field.type === 'file') {
      if (!/^(https?:\/\/|\/)/i.test(str)) throw new PricingError(`"${field.label}" must be an uploaded file.`);
      snapshotCustom[field.label] = str;
    } else if (field.type === 'date') {
      if (Number.isNaN(Date.parse(str))) throw new PricingError(`"${field.label}" must be a valid date.`);
      snapshotCustom[field.label] = str;
    } else {
      snapshotCustom[field.label] = str;
    }
    customizationFee += (field.fee || 0) + adj;
  }

  // ---- Stock: variant stock where set, otherwise product stock when tracked
  const trackedVariants = selectedVariants.filter((v) => v.stock !== null);
  for (const v of trackedVariants) {
    if ((v.stock as number) < quantity) {
      throw new PricingError(`Insufficient stock for "${name}". Only ${Math.max(0, v.stock as number)} left for the selected option.`);
    }
  }
  const useProductStock = product.trackInventory && trackedVariants.length === 0;
  if (useProductStock && product.stock < quantity) {
    throw new PricingError(`Insufficient stock for "${name}". Only ${Math.max(0, product.stock)} left in stock.`);
  }

  const unitPrice = round2(product.price + variantAdjustment + customizationFee);
  if (unitPrice < 0) throw new PricingError(`Invalid price configuration for "${name}".`, 500);

  const pick = (re: RegExp) => snapshots.find((s) => re.test(s.group))?.variant ?? null;

  return {
    productId: product.id,
    productName: product.name,
    productImage: product.images[0] || '',
    productSku: product.sku,
    quantity,
    basePrice: product.price,
    variantAdjustment: round2(variantAdjustment),
    customizationFee: round2(customizationFee),
    unitPrice,
    lineTotal: round2(unitPrice * quantity),
    variantSelections: snapshots,
    customizations: Object.keys(snapshotCustom).length ? snapshotCustom : null,
    selectedFinish: pick(/finish|material/i),
    selectedColor: pick(/colou?r/i),
    selectedSize: pick(/size/i),
    customizable: product.customizable,
    prepaidOnly: product.prepaidOnly,
    codEnabled: product.codEnabled,
    stockPlan: {
      productId: useProductStock ? product.id : null,
      variantIds: trackedVariants.map((v) => v.id),
    },
  };
}

/** Price a whole cart from DB state. Throws PricingError (status 400) on any invalid line. */
export async function priceCart(
  inputs: PricingInput[],
  client: Pick<typeof prisma, 'product'> = prisma,
): Promise<PricedCart> {
  if (!inputs.length) throw new PricingError('Order must contain at least one item.');
  const ids = Array.from(new Set(inputs.map((i) => i.productId)));
  const products = await client.product.findMany({ where: { id: { in: ids } }, include: productInclude });
  const map = new Map(products.map((p) => [p.id, p]));

  const lines: PricedLine[] = [];
  for (const input of inputs) {
    const product = map.get(input.productId);
    if (!product) throw new PricingError(`Product not found or no longer available: ${input.productId}`);
    lines.push(priceOne(product, input));
  }

  // Combined-quantity stock check when the same product/variant appears on several lines
  const demandProduct = new Map<string, number>();
  const demandVariant = new Map<string, number>();
  for (const l of lines) {
    if (l.stockPlan.productId) demandProduct.set(l.productId, (demandProduct.get(l.productId) ?? 0) + l.quantity);
    for (const vid of l.stockPlan.variantIds) demandVariant.set(vid, (demandVariant.get(vid) ?? 0) + l.quantity);
  }
  for (const [pid, qty] of demandProduct) {
    const p = map.get(pid)!;
    if (p.stock < qty) throw new PricingError(`Insufficient stock for "${p.name}". Only ${Math.max(0, p.stock)} left in stock.`);
  }
  for (const [vid, qty] of demandVariant) {
    for (const p of products) {
      for (const g of p.variantGroups) {
        const v = g.variants.find((x) => x.id === vid);
        if (v && v.stock !== null && v.stock < qty) {
          throw new PricingError(`Insufficient stock for "${p.name}" (${v.name}). Only ${Math.max(0, v.stock)} left.`);
        }
      }
    }
  }

  return { lines, subtotal: round2(lines.reduce((s, l) => s + l.lineTotal, 0)) };
}
