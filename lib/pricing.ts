/**
 * Authoritative SERVER-SIDE pricing. Import only from route handlers / server code
 * (it pulls in Prisma). Client-supplied prices are never trusted: callers send only
 * { productId, quantity, variantSelections, customizations } and receive computed lines.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  DEFAULT_COD_SETTINGS,
  DEFAULT_SHIPPING_SETTINGS,
  codEligibility,
  computeTotal,
  enabledMethods,
  evaluateCoupon,
  resolveShippingMethod,
  round2 as roundMoney,
  shippingCharge,
  type CodSettings,
  type CouponEvaluation,
  type CouponLike,
  type ShippingMethod,
  type ShippingSettings,
} from '@/lib/shipping';

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

export interface LineStock {
  ok: boolean;
  /** units still available for this line's selection (null = untracked / unlimited) */
  remaining: number | null;
  message: string | null;
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
  stock: LineStock;
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

  // ---- Stock: variant stock where set, otherwise product stock when tracked.
  // Never throws here: availability is reported on the line so quote and order share one code path.
  const trackedVariants = selectedVariants.filter((v) => v.stock !== null);
  const useProductStock = product.trackInventory && trackedVariants.length === 0;
  let stock: LineStock = { ok: true, remaining: null, message: null };
  const short = trackedVariants.find((v) => (v.stock as number) < quantity);
  if (short) {
    const left = Math.max(0, short.stock as number);
    stock = { ok: false, remaining: left, message: `Insufficient stock for "${name}". Only ${left} left for the selected option.` };
  } else if (useProductStock) {
    const left = Math.max(0, product.stock);
    stock = product.stock < quantity
      ? { ok: false, remaining: left, message: `Insufficient stock for "${name}". Only ${left} left in stock.` }
      : { ok: true, remaining: left, message: null };
  } else if (trackedVariants.length) {
    stock = { ok: true, remaining: Math.max(0, Math.min(...trackedVariants.map((v) => v.stock as number))), message: null };
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
    stock,
  };
}

export interface LineIssue {
  index: number;
  message: string;
}

export interface PricedCartDetailed {
  /** successfully priced lines, each tagged with its index in the request */
  lines: Array<PricedLine & { index: number }>;
  issues: LineIssue[];
  subtotal: number;
}

/**
 * Price a cart without throwing per-line problems: invalid lines are reported in `issues`
 * (and omitted from `lines`); stock shortfalls (incl. combined quantities across lines of the
 * same product/variant) are reported on `line.stock` and also appended to `issues`.
 */
export async function priceCartDetailed(
  inputs: PricingInput[],
  client: Pick<typeof prisma, 'product'> = prisma,
): Promise<PricedCartDetailed> {
  if (!inputs.length) throw new PricingError('Order must contain at least one item.');
  const ids = Array.from(new Set(inputs.map((i) => i.productId)));
  const products = await client.product.findMany({ where: { id: { in: ids } }, include: productInclude });
  const map = new Map(products.map((p) => [p.id, p]));

  const lines: Array<PricedLine & { index: number }> = [];
  const issues: LineIssue[] = [];
  inputs.forEach((input, index) => {
    const product = map.get(input.productId);
    if (!product) {
      issues.push({ index, message: `Product not found or no longer available: ${input.productId}` });
      return;
    }
    try {
      const line = priceOne(product, input);
      lines.push({ ...line, index });
      if (!line.stock.ok && line.stock.message) issues.push({ index, message: line.stock.message });
    } catch (e) {
      if (e instanceof PricingError) issues.push({ index, message: e.message });
      else throw e;
    }
  });

  // Combined-quantity stock check when the same product/variant appears on several lines
  const demandProduct = new Map<string, number>();
  const demandVariant = new Map<string, number>();
  for (const l of lines) {
    if (l.stockPlan.productId) demandProduct.set(l.productId, (demandProduct.get(l.productId) ?? 0) + l.quantity);
    for (const vid of l.stockPlan.variantIds) demandVariant.set(vid, (demandVariant.get(vid) ?? 0) + l.quantity);
  }
  const flag = (l: PricedLine & { index: number }, remaining: number, message: string) => {
    if (l.stock.ok) {
      l.stock = { ok: false, remaining, message };
      issues.push({ index: l.index, message });
    }
  };
  for (const [pid, qty] of demandProduct) {
    const p = map.get(pid)!;
    if (p.stock < qty) {
      const left = Math.max(0, p.stock);
      for (const l of lines) {
        if (l.stockPlan.productId === pid) flag(l, left, `Insufficient stock for "${p.name}". Only ${left} left in stock.`);
      }
    }
  }
  for (const [vid, qty] of demandVariant) {
    for (const p of products) {
      for (const g of p.variantGroups) {
        const v = g.variants.find((x) => x.id === vid);
        if (v && v.stock !== null && v.stock < qty) {
          const left = Math.max(0, v.stock);
          for (const l of lines) {
            if (l.stockPlan.variantIds.includes(vid)) flag(l, left, `Insufficient stock for "${p.name}" (${v.name}). Only ${left} left.`);
          }
        }
      }
    }
  }

  return { lines, issues, subtotal: round2(lines.reduce((s, l) => s + l.lineTotal, 0)) };
}

/** Strict variant: throws PricingError(400) on the first problem. */
export async function priceCart(
  inputs: PricingInput[],
  client: Pick<typeof prisma, 'product'> = prisma,
): Promise<PricedCart> {
  const detailed = await priceCartDetailed(inputs, client);
  if (detailed.issues.length) throw new PricingError(detailed.issues[0].message);
  return { lines: detailed.lines, subtotal: detailed.subtotal };
}

// ---------------------------------------------------------------------------
// Shared checkout computation: the ONE function behind /api/quote and create-order.
// ---------------------------------------------------------------------------

export interface CheckoutRequest {
  items: PricingInput[];
  couponCode?: string | null;
  paymentMethod?: 'prepaid' | 'cod';
  shippingMethod?: ShippingMethod | null;
}

export interface CheckoutIssue {
  code: 'line' | 'stock' | 'coupon' | 'shipping' | 'cod';
  message: string;
  index?: number;
}

export interface CheckoutComputation {
  paymentMethod: 'prepaid' | 'cod';
  lines: Array<PricedLine & { index: number }>;
  subtotal: number;
  couponCode: string | null;
  couponEvaluation: CouponEvaluation | null;
  discountAmount: number;
  appliedCoupon: CouponLike | null;
  shipping: {
    method: ShippingMethod | null;
    fee: number;
    freeApplied: boolean;
    amountToFree: number;
    options: Array<{ method: ShippingMethod; enabled: boolean; baseFee: number; fee: number }>;
  };
  cod: { eligible: boolean; reason: string | null; fee: number };
  codFee: number;
  total: number;
  settings: {
    shipping: ShippingSettings;
    cod: CodSettings;
    orderPrefix: string;
    reservationMinutes: number;
    currencySymbol: string;
    currencyCode: string;
  };
  issues: CheckoutIssue[];
}

type SettingsRow = {
  standardShippingEnabled: boolean;
  expressShippingEnabled: boolean;
  standardShippingFee: number;
  expressShippingFee: number;
  freeShippingThreshold: number;
  globalCodEnabled: boolean;
  customProductsPrepaidOnly: boolean;
  codFeeEnabled: boolean;
  codFee: number;
  orderPrefix: string;
  reservationMinutes: number;
  currencySymbol: string;
  currencyCode: string;
} | null;

export function settingsFromRow(row: SettingsRow) {
  const shipping: ShippingSettings = row
    ? {
        standardEnabled: row.standardShippingEnabled,
        expressEnabled: row.expressShippingEnabled,
        standardFee: row.standardShippingFee,
        expressFee: row.expressShippingFee,
        freeThreshold: row.freeShippingThreshold,
      }
    : DEFAULT_SHIPPING_SETTINGS;
  const cod: CodSettings = row
    ? {
        globalCodEnabled: row.globalCodEnabled,
        customProductsPrepaidOnly: row.customProductsPrepaidOnly,
        codFeeEnabled: row.codFeeEnabled,
        codFee: row.codFee,
      }
    : DEFAULT_COD_SETTINGS;
  return {
    shipping,
    cod,
    orderPrefix: row?.orderPrefix || 'DX',
    reservationMinutes: row?.reservationMinutes ?? 60,
    currencySymbol: row?.currencySymbol ?? '₹',
    currencyCode: row?.currencyCode ?? 'INR',
  };
}

/**
 * Computes prices, coupon, shipping, COD and total from database state. Never throws for
 * business problems (they are listed in `issues`); callers decide: create-order rejects on any
 * issue, /api/quote reports them. `now` is injectable for tests.
 */
export async function computeCheckout(
  req: CheckoutRequest,
  now: Date = new Date(),
  client: Pick<typeof prisma, 'product' | 'siteSettings' | 'coupon'> = prisma,
): Promise<CheckoutComputation> {
  const paymentMethod = req.paymentMethod ?? 'prepaid';
  const priced = await priceCartDetailed(req.items, client);
  const issues: CheckoutIssue[] = priced.issues.map((i) => ({
    code: /stock/i.test(i.message) ? 'stock' : 'line',
    message: i.message,
    index: i.index,
  }));

  const row = await client.siteSettings.findUnique({ where: { id: 'default' } });
  const settings = settingsFromRow(row as SettingsRow);
  const subtotal = priced.subtotal;

  // Coupon (server-side). A supplied-but-unusable code is an issue so the customer is never
  // silently charged a different total than the one they saw.
  let couponEvaluation: CouponEvaluation | null = null;
  let couponCode: string | null = null;
  let discountAmount = 0;
  let appliedCoupon: CouponLike | null = null;
  const typed = req.couponCode?.trim();
  if (typed) {
    couponCode = typed.toUpperCase();
    const coupon = await client.coupon.findUnique({ where: { code: couponCode } });
    couponEvaluation = evaluateCoupon(coupon as CouponLike | null, subtotal, now);
    if (couponEvaluation.valid) {
      discountAmount = couponEvaluation.discountAmount;
      appliedCoupon = couponEvaluation.coupon;
      couponCode = couponEvaluation.coupon.code;
    } else {
      issues.push({ code: 'coupon', message: couponEvaluation.message });
    }
  }

  // Shipping (threshold applies to subtotal AFTER discount; waives STANDARD only)
  const afterDiscount = roundMoney(Math.max(0, subtotal - discountAmount));
  const resolved = resolveShippingMethod(req.shippingMethod, settings.shipping);
  let method: ShippingMethod | null = null;
  let shippingFee = 0;
  let freeApplied = false;
  if (resolved.ok) {
    method = resolved.method;
    const c = shippingCharge(method, afterDiscount, settings.shipping);
    shippingFee = c.fee;
    freeApplied = c.freeApplied;
  } else {
    issues.push({ code: 'shipping', message: resolved.message });
  }
  const options = enabledMethods(settings.shipping).map((m) => {
    const c = shippingCharge(m, afterDiscount, settings.shipping);
    return { method: m, enabled: true, baseFee: c.baseFee, fee: c.fee };
  });
  const amountToFree =
    method === 'STANDARD' && !freeApplied ? roundMoney(Math.max(0, settings.shipping.freeThreshold - afterDiscount)) : 0;

  // COD
  const cod = codEligibility(
    priced.lines.map((l) => ({
      productName: l.productName,
      prepaidOnly: l.prepaidOnly,
      codEnabled: l.codEnabled,
      customizable: l.customizable,
      hasCustomizations: !!l.customizations,
    })),
    settings.cod,
  );
  const codFee = paymentMethod === 'cod' ? cod.fee : 0;
  if (paymentMethod === 'cod' && !cod.eligible) {
    issues.push({ code: 'cod', message: cod.reason ?? 'Cash on delivery is not available for this order.' });
  }

  const total = computeTotal({ subtotal, discountAmount, shippingFee, codFee });

  return {
    paymentMethod,
    lines: priced.lines,
    subtotal,
    couponCode,
    couponEvaluation,
    discountAmount,
    appliedCoupon,
    shipping: { method, fee: shippingFee, freeApplied, amountToFree, options },
    cod,
    codFee,
    total,
    settings,
    issues,
  };
}
