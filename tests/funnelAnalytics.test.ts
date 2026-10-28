import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Database Storage
interface MockFunnelEvent {
  id: string;
  step: string;
  sessionId: string;
  userId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

interface MockProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
}

interface MockOrderItem {
  productId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderId: string;
  order: {
    status: string;
    paymentStatus: string;
  };
}

const mockEvents: MockFunnelEvent[] = [];
const mockProducts: MockProduct[] = [];
const mockOrderItems: MockOrderItem[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    funnelEvent: {
      create: vi.fn(async ({ data }) => {
        const item: MockFunnelEvent = {
          id: `fe-${Date.now()}-${Math.random()}`,
          step: data.step,
          sessionId: data.sessionId,
          userId: data.userId || null,
          productId: data.productId || null,
          orderId: data.orderId || null,
          metadata: data.metadata || null,
          createdAt: new Date(),
        };
        mockEvents.push(item);
        return item;
      }),
      findFirst: vi.fn(async ({ where }) => {
        return mockEvents.find((e) => {
          if (where.step && e.step !== where.step) return false;
          if (where.sessionId && e.sessionId !== where.sessionId) return false;
          if (where.productId && e.productId !== where.productId) return false;
          if (where.orderId && e.orderId !== where.orderId) return false;
          if (where.createdAt?.gte && e.createdAt < where.createdAt.gte) return false;
          return true;
        }) || null;
      }),
      count: vi.fn(async ({ where }) => {
        return mockEvents.filter((e) => {
          if (where?.step && e.step !== where.step) return false;
          if (where?.productId && e.productId !== where.productId) return false;
          return true;
        }).length;
      }),
    },
    product: {
      findMany: vi.fn(async () => mockProducts),
    },
    orderItem: {
      findMany: vi.fn(async ({ where }) => {
        return mockOrderItems.filter((i) => {
          if (where?.order?.paymentStatus) {
            const matches = typeof where.order.paymentStatus === "string"
              ? where.order.paymentStatus === i.order.paymentStatus
              : where.order.paymentStatus.in?.includes(i.order.paymentStatus);
            if (!matches) return false;
          }
          if (where?.order?.status?.notIn && where.order.status.notIn.includes(i.order.status)) {
            return false;
          }
          return true;
        });
      }),
    },
  },
}));

import {
  recordFunnelEvent,
  sanitizeMetadata,
  getFunnelMetrics,
  getProductConversionMetrics,
} from "@/lib/funnelAnalytics";

describe("Funnel Analytics Engine", () => {
  beforeEach(() => {
    mockEvents.length = 0;
    mockProducts.length = 0;
    mockOrderItems.length = 0;

    mockProducts.push({
      id: "p1",
      name: "Flux Lithophane Lamp",
      sku: "DXL-LMP-01",
      price: 2499,
    });
    mockProducts.push({
      id: "p2",
      name: "Prism Planter",
      sku: "DXL-PLT-02",
      price: 999,
    });
  });

  it("sanitizes and caps oversized metadata", () => {
    const hugeData: Record<string, string> = {};
    for (let i = 0; i < 200; i++) {
      hugeData[`key_${i}`] = "x".repeat(30);
    }
    const sanitized = sanitizeMetadata(hugeData);
    expect(sanitized).not.toBeNull();
    const str = JSON.stringify(sanitized);
    expect(str.length).toBeLessThanOrEqual(2048);
  });

  it("records VIEW_PRODUCT and deduplicates within 1 hour window", async () => {
    const r1 = await recordFunnelEvent({
      step: "VIEW_PRODUCT",
      sessionId: "session-abc",
      productId: "p1",
    });
    expect(r1.recorded).toBe(true);

    // Duplicate in same hour
    const r2 = await recordFunnelEvent({
      step: "VIEW_PRODUCT",
      sessionId: "session-abc",
      productId: "p1",
    });
    expect(r2.recorded).toBe(false);
    expect(r2.reason).toContain("ignored");

    // Different product in same session
    const r3 = await recordFunnelEvent({
      step: "VIEW_PRODUCT",
      sessionId: "session-abc",
      productId: "p2",
    });
    expect(r3.recorded).toBe(true);
  });

  it("deduplicates BEGIN_CHECKOUT against refresh spam within 30 minutes", async () => {
    const first = await recordFunnelEvent({
      step: "BEGIN_CHECKOUT",
      sessionId: "session-checkout-1",
    });
    expect(first.recorded).toBe(true);

    const refresh = await recordFunnelEvent({
      step: "BEGIN_CHECKOUT",
      sessionId: "session-checkout-1",
    });
    expect(refresh.recorded).toBe(false);
    expect(refresh.reason).toContain("BEGIN_CHECKOUT");
  });

  it("enforces strict idempotency on ORDER_COMPLETED by orderId", async () => {
    const o1 = await recordFunnelEvent({
      step: "ORDER_COMPLETED",
      sessionId: "session-order",
      orderId: "DXL-ORD-9001",
    });
    expect(o1.recorded).toBe(true);

    // Duplicate submission / webhook
    const o2 = await recordFunnelEvent({
      step: "ORDER_COMPLETED",
      sessionId: "session-order",
      orderId: "DXL-ORD-9001",
    });
    expect(o2.recorded).toBe(false);
    expect(o2.reason).toContain("Duplicate ORDER_COMPLETED");
  });

  it("calculates funnel metrics and drop-off percentages without division errors", async () => {
    // Empty state
    const emptyReport = await getFunnelMetrics();
    expect(emptyReport.overallConversionRate).toBe(0);
    expect(emptyReport.totalProductViews).toBe(0);

    // Seed events
    mockEvents.push({
      id: "e1",
      step: "VIEW_PRODUCT",
      sessionId: "s1",
      productId: "p1",
      createdAt: new Date(),
    });
    mockEvents.push({
      id: "e2",
      step: "VIEW_PRODUCT",
      sessionId: "s2",
      productId: "p1",
      createdAt: new Date(),
    });
    mockEvents.push({
      id: "e3",
      step: "ADD_TO_CART",
      sessionId: "s1",
      productId: "p1",
      createdAt: new Date(),
    });
    mockEvents.push({
      id: "e4",
      step: "ORDER_COMPLETED",
      sessionId: "s1",
      orderId: "DXL-ORD-1",
      createdAt: new Date(),
    });

    const report = await getFunnelMetrics();
    expect(report.totalProductViews).toBe(2);
    expect(report.totalOrdersCompleted).toBe(1);
    expect(report.overallConversionRate).toBe(50); // 1 order / 2 views * 100 = 50%
  });

  it("calculates product conversion metrics with real paid orders", async () => {
    // 4 views for p1
    for (let i = 0; i < 4; i++) {
      mockEvents.push({
        id: `v-${i}`,
        step: "VIEW_PRODUCT",
        sessionId: `sess-${i}`,
        productId: "p1",
        createdAt: new Date(),
      });
    }

    // 1 real paid order item for p1
    mockOrderItems.push({
      productId: "p1",
      quantity: 2,
      unitPrice: 2499,
      totalPrice: 4998,
      orderId: "ORD-REAL-1",
      order: { status: "PROCESSING", paymentStatus: "paid" },
    });

    // 1 cancelled order for p1 (must be excluded)
    mockOrderItems.push({
      productId: "p1",
      quantity: 1,
      unitPrice: 2499,
      totalPrice: 2499,
      orderId: "ORD-CANCELLED",
      order: { status: "cancelled", paymentStatus: "paid" },
    });

    const metrics = await getProductConversionMetrics();
    const p1Metrics = metrics.find((m) => m.productId === "p1");
    expect(p1Metrics).toBeDefined();
    expect(p1Metrics?.views).toBe(4);
    expect(p1Metrics?.unitsSold).toBe(2);
    expect(p1Metrics?.orders).toBe(1);
    expect(p1Metrics?.revenue).toBe(4998);
    // 1 order / 4 views * 100 = 25%
    expect(p1Metrics?.conversionRate).toBe(25);

    // p2 has 0 views and 0 orders
    const p2Metrics = metrics.find((m) => m.productId === "p2");
    expect(p2Metrics?.conversionRate).toBe(0);
  });
});
