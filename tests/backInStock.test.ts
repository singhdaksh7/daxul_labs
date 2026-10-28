import { describe, it, expect } from "vitest";

interface SubscriptionMock {
  id: string;
  productId: string;
  variantId?: string | null;
  email: string;
  status: "PENDING" | "NOTIFIED";
}

function subscribeToRestock(
  existingSubs: SubscriptionMock[],
  product: { id: string; stock: number; trackInventory: boolean },
  email: string,
  variantId?: string | null
): { ok: boolean; error?: string; subscription?: SubscriptionMock } {
  const cleanEmail = email.trim().toLowerCase();

  // Guard: Only allow subscription when product is actually unavailable
  if (product.trackInventory && product.stock > 0) {
    return { ok: false, error: "This object is currently available and ready to order." };
  }

  // Deduplicate by productId + variantId + email
  const existing = existingSubs.find(
    (s) => s.productId === product.id && (s.variantId || null) === (variantId || null) && s.email === cleanEmail
  );

  if (existing) {
    return { ok: true, subscription: { ...existing, status: "PENDING" } };
  }

  const newSub: SubscriptionMock = {
    id: `sub-${Date.now()}`,
    productId: product.id,
    variantId: variantId || null,
    email: cleanEmail,
    status: "PENDING",
  };

  return { ok: true, subscription: newSub };
}

function dispatchRestockNotifications(
  subscriptions: SubscriptionMock[],
  product: { id: string; stock: number }
): { notifiedCount: number; updatedSubs: SubscriptionMock[] } {
  // Guard: Cannot notify if stock is still 0
  if (product.stock <= 0) {
    return { notifiedCount: 0, updatedSubs: subscriptions };
  }

  let count = 0;
  const updatedSubs = subscriptions.map((s) => {
    if (s.productId === product.id && s.status === "PENDING") {
      count++;
      return { ...s, status: "NOTIFIED" as const };
    }
    return s;
  });

  return { notifiedCount: count, updatedSubs };
}

describe("Back-in-Stock Subscription & Notification Logic", () => {
  it("rejects subscription when product is in stock", () => {
    const inStockProduct = { id: "p1", stock: 5, trackInventory: true };
    const res = subscribeToRestock([], inStockProduct, "buyer@example.com");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("currently available");
  });

  it("accepts subscription when product is sold out", () => {
    const soldOutProduct = { id: "p1", stock: 0, trackInventory: true };
    const res = subscribeToRestock([], soldOutProduct, "buyer@example.com");
    expect(res.ok).toBe(true);
    expect(res.subscription?.email).toBe("buyer@example.com");
    expect(res.subscription?.status).toBe("PENDING");
  });

  it("deduplicates multiple subscriptions for same product and email", () => {
    const soldOutProduct = { id: "p1", stock: 0, trackInventory: true };
    const subs: SubscriptionMock[] = [
      { id: "sub-1", productId: "p1", email: "buyer@example.com", status: "PENDING" },
    ];

    const res = subscribeToRestock(subs, soldOutProduct, "buyer@example.com");
    expect(res.ok).toBe(true);
    expect(res.subscription?.id).toBe("sub-1");
  });

  it("blocks dispatching notifications if product has not been restocked", () => {
    const soldOut = { id: "p1", stock: 0 };
    const subs: SubscriptionMock[] = [
      { id: "s1", productId: "p1", email: "a@x.com", status: "PENDING" },
    ];
    const res = dispatchRestockNotifications(subs, soldOut);
    expect(res.notifiedCount).toBe(0);
    expect(res.updatedSubs[0].status).toBe("PENDING");
  });

  it("dispatches notifications and marks subscriptions as NOTIFIED when restocked", () => {
    const restocked = { id: "p1", stock: 10 };
    const subs: SubscriptionMock[] = [
      { id: "s1", productId: "p1", email: "a@x.com", status: "PENDING" },
      { id: "s2", productId: "p1", email: "b@x.com", status: "PENDING" },
      { id: "s3", productId: "p2", email: "c@x.com", status: "PENDING" },
    ];
    const res = dispatchRestockNotifications(subs, restocked);
    expect(res.notifiedCount).toBe(2);
    expect(res.updatedSubs.find((s) => s.id === "s1")?.status).toBe("NOTIFIED");
    expect(res.updatedSubs.find((s) => s.id === "s3")?.status).toBe("PENDING");
  });
});
