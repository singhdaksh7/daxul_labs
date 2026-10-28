import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const FUNNEL_STEPS = [
  "VIEW_PRODUCT",
  "ADD_TO_CART",
  "VIEW_CART",
  "BEGIN_CHECKOUT",
  "ADD_SHIPPING",
  "CHOOSE_PAYMENT",
  "ORDER_COMPLETED",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const funnelEventInputSchema = z.object({
  step: z.enum(FUNNEL_STEPS),
  sessionId: z.string().min(1).max(100),
  productId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type FunnelEventInput = z.infer<typeof funnelEventInputSchema>;

/**
 * Sanitizes and size-limits metadata to a max of 2048 bytes.
 */
export function sanitizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  try {
    const serialized = JSON.stringify(metadata);
    if (serialized.length <= 2048) {
      return JSON.parse(serialized);
    }

    // Exceeds limit: iteratively pick shallow primitives until 2048-byte limit
    const capped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metadata as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        capped[k] = v;
        if (JSON.stringify(capped).length > 2000) {
          delete capped[k];
          break;
        }
      }
    }
    return capped;
  } catch {
    return null;
  }
}

/**
 * Ingests a funnel event with strict deduplication, idempotency, and server validation.
 */
export async function recordFunnelEvent(
  input: FunnelEventInput,
  serverUserId?: string | null
): Promise<{ recorded: boolean; reason?: string; id?: string }> {
  const { step, sessionId, productId, orderId, metadata } = input;
  const sanitizedMeta = sanitizeMetadata(metadata);
  const now = new Date();

  // 1. ORDER_COMPLETED must be strictly idempotent by orderId
  if (step === "ORDER_COMPLETED") {
    if (!orderId) {
      return { recorded: false, reason: "orderId required for ORDER_COMPLETED" };
    }

    const existingOrderCompleted = await prisma.funnelEvent.findFirst({
      where: {
        step: "ORDER_COMPLETED",
        orderId,
      },
      select: { id: true },
    });

    if (existingOrderCompleted) {
      return { recorded: false, reason: "Duplicate ORDER_COMPLETED event ignored" };
    }
  }

  // 2. VIEW_PRODUCT deduped within 1 hour per session + product
  if (step === "VIEW_PRODUCT") {
    if (!productId) {
      return { recorded: false, reason: "productId required for VIEW_PRODUCT" };
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentView = await prisma.funnelEvent.findFirst({
      where: {
        step: "VIEW_PRODUCT",
        sessionId,
        productId,
        createdAt: { gte: oneHourAgo },
      },
      select: { id: true },
    });

    if (recentView) {
      return { recorded: false, reason: "Duplicate VIEW_PRODUCT within 1 hour ignored" };
    }
  }

  // 3. BEGIN_CHECKOUT deduped within 30 minutes per session to prevent refresh spam
  if (step === "BEGIN_CHECKOUT") {
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const recentCheckout = await prisma.funnelEvent.findFirst({
      where: {
        step: "BEGIN_CHECKOUT",
        sessionId,
        createdAt: { gte: thirtyMinsAgo },
      },
      select: { id: true },
    });

    if (recentCheckout) {
      return { recorded: false, reason: "Duplicate BEGIN_CHECKOUT within 30 mins ignored" };
    }
  }

  // 4. VIEW_CART deduped within 15 minutes per session
  if (step === "VIEW_CART") {
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const recentCartView = await prisma.funnelEvent.findFirst({
      where: {
        step: "VIEW_CART",
        sessionId,
        createdAt: { gte: fifteenMinsAgo },
      },
      select: { id: true },
    });

    if (recentCartView) {
      return { recorded: false, reason: "Duplicate VIEW_CART within 15 mins ignored" };
    }
  }

  const created = await prisma.funnelEvent.create({
    data: {
      step,
      sessionId,
      userId: serverUserId || null,
      productId: productId || null,
      orderId: orderId || null,
      metadata: (sanitizedMeta as Prisma.InputJsonValue) ?? undefined,
    },
  });

  return { recorded: true, id: created.id };
}

export interface FunnelStepSummary {
  step: FunnelStep;
  label: string;
  count: number;
  dropoffRate: number; // Percentage lost compared to previous step
}

export interface FunnelReport {
  steps: FunnelStepSummary[];
  overallConversionRate: number; // (ORDER_COMPLETED / VIEW_PRODUCT) * 100
  totalProductViews: number;
  totalOrdersCompleted: number;
}

/**
 * Calculates live conversion funnel analytics.
 */
export async function getFunnelMetrics(): Promise<FunnelReport> {
  const countsByStep: Record<string, number> = {};

  for (const step of FUNNEL_STEPS) {
    const count = await prisma.funnelEvent.count({
      where: { step },
    });
    countsByStep[step] = count;
  }

  const stepLabels: Record<FunnelStep, string> = {
    VIEW_PRODUCT: "Product Views",
    ADD_TO_CART: "Add to Cart",
    VIEW_CART: "View Cart",
    BEGIN_CHECKOUT: "Initiate Checkout",
    ADD_SHIPPING: "Shipping Info",
    CHOOSE_PAYMENT: "Payment Selection",
    ORDER_COMPLETED: "Purchased",
  };

  const steps: FunnelStepSummary[] = [];
  let prevCount = 0;

  for (let i = 0; i < FUNNEL_STEPS.length; i++) {
    const step = FUNNEL_STEPS[i];
    const count = countsByStep[step] || 0;
    let dropoffRate = 0;

    if (i > 0 && prevCount > 0) {
      const lost = Math.max(0, prevCount - count);
      dropoffRate = Math.round((lost / prevCount) * 1000) / 10;
    }

    steps.push({
      step,
      label: stepLabels[step],
      count,
      dropoffRate,
    });

    prevCount = count;
  }

  const views = countsByStep.VIEW_PRODUCT || 0;
  const purchases = countsByStep.ORDER_COMPLETED || 0;
  const overallConversionRate = views > 0 ? Math.round((purchases / views) * 1000) / 10 : 0;

  return {
    steps,
    overallConversionRate,
    totalProductViews: views,
    totalOrdersCompleted: purchases,
  };
}

export interface ProductConversionSummary {
  productId: string;
  productName: string;
  sku?: string | null;
  views: number;
  addToCart: number;
  checkoutStarts: number;
  unitsSold: number;
  orders: number;
  revenue: number;
  conversionRate: number; // (orders / views) * 100, 0 if views === 0
}

/**
 * Calculates per-product conversion performance using real Order / OrderItem data and live Funnel events.
 */
export async function getProductConversionMetrics(): Promise<ProductConversionSummary[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch real paid order items
  const paidOrderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        paymentStatus: "paid",
        status: { notIn: ["cancelled"] },
      },
    },
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      orderId: true,
    },
  });

  // Aggregate by product
  const productSalesMap = new Map<
    string,
    { unitsSold: number; ordersSet: Set<string>; revenue: number }
  >();

  for (const item of paidOrderItems) {
    if (!item.productId) continue;
    let entry = productSalesMap.get(item.productId);
    if (!entry) {
      entry = { unitsSold: 0, ordersSet: new Set<string>(), revenue: 0 };
      productSalesMap.set(item.productId, entry);
    }
    const itemTotal = item.unitPrice * item.quantity;
    entry.unitsSold += item.quantity;
    entry.ordersSet.add(item.orderId);
    entry.revenue += itemTotal;
  }

  // Aggregate funnel events per product
  const results: ProductConversionSummary[] = [];

  for (const prod of products) {
    const views = await prisma.funnelEvent.count({
      where: { productId: prod.id, step: "VIEW_PRODUCT" },
    });

    const atc = await prisma.funnelEvent.count({
      where: { productId: prod.id, step: "ADD_TO_CART" },
    });

    const checkouts = await prisma.funnelEvent.count({
      where: { productId: prod.id, step: "BEGIN_CHECKOUT" },
    });

    const sales = productSalesMap.get(prod.id) || {
      unitsSold: 0,
      ordersSet: new Set<string>(),
      revenue: 0,
    };

    const orderCount = sales.ordersSet.size;
    const conversionRate = views > 0 ? Math.round((orderCount / views) * 1000) / 10 : 0;

    results.push({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      views,
      addToCart: atc,
      checkoutStarts: checkouts,
      unitsSold: sales.unitsSold,
      orders: orderCount,
      revenue: sales.revenue,
      conversionRate,
    });
  }

  return results;
}
