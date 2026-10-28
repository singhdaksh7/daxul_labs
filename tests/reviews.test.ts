import { describe, it, expect } from "vitest";

interface OrderMock {
  id: string;
  customerEmail: string;
  userId?: string | null;
  paymentStatus: "paid" | "pending" | "failed";
  status: "new" | "printing" | "qc" | "packed" | "shipped" | "delivered" | "cancelled";
  items: { productId: string }[];
}

function verifyPurchaseLogic(
  productId: string,
  customerEmail: string,
  orders: OrderMock[],
  userId?: string | null
): { isVerified: boolean; orderId?: string } {
  const cleanEmail = customerEmail.trim().toLowerCase();

  const match = orders.find((o) => {
    const emailMatches = o.customerEmail.toLowerCase() === cleanEmail;
    const userMatches = userId && o.userId === userId;
    const isOwner = emailMatches || userMatches;

    const isPaid = o.paymentStatus === "paid";
    const isFulfilled = ["delivered", "shipped", "packed"].includes(o.status);
    const hasProduct = o.items.some((i) => i.productId === productId);

    return isOwner && isPaid && isFulfilled && hasProduct;
  });

  if (match) {
    return { isVerified: true, orderId: match.id };
  }
  return { isVerified: false };
}

describe("Reviews & Verified Purchase Verification", () => {
  const mockOrders: OrderMock[] = [
    {
      id: "ord-1",
      customerEmail: "buyer@example.com",
      userId: "usr-1",
      paymentStatus: "paid",
      status: "delivered",
      items: [{ productId: "lamp-001" }],
    },
    {
      id: "ord-2",
      customerEmail: "buyer@example.com",
      paymentStatus: "pending", // Unpaid
      status: "new",
      items: [{ productId: "lamp-002" }],
    },
    {
      id: "ord-3",
      customerEmail: "buyer@example.com",
      paymentStatus: "paid",
      status: "cancelled", // Cancelled
      items: [{ productId: "lamp-003" }],
    },
  ];

  it("marks as verified purchase when customer bought the exact product in a paid, fulfilled order", () => {
    const res = verifyPurchaseLogic("lamp-001", "buyer@example.com", mockOrders);
    expect(res.isVerified).toBe(true);
    expect(res.orderId).toBe("ord-1");
  });

  it("denies verified purchase if the order was not paid", () => {
    const res = verifyPurchaseLogic("lamp-002", "buyer@example.com", mockOrders);
    expect(res.isVerified).toBe(false);
  });

  it("denies verified purchase if the order was cancelled", () => {
    const res = verifyPurchaseLogic("lamp-003", "buyer@example.com", mockOrders);
    expect(res.isVerified).toBe(false);
  });

  it("denies verified purchase if customer never purchased the product", () => {
    const res = verifyPurchaseLogic("lamp-999", "buyer@example.com", mockOrders);
    expect(res.isVerified).toBe(false);
  });

  it("denies verified purchase if email does not match", () => {
    const res = verifyPurchaseLogic("lamp-001", "stranger@example.com", mockOrders);
    expect(res.isVerified).toBe(false);
  });

  it("calculates rating distribution and average rating correctly", () => {
    const reviews = [
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 4 },
      { rating: 5 },
    ];

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of reviews) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
      sum += r.rating;
    }

    const avg = Math.round((sum / reviews.length) * 10) / 10;
    expect(avg).toBe(4.6);
    expect(distribution[5]).toBe(3);
    expect(distribution[4]).toBe(2);
  });
});
