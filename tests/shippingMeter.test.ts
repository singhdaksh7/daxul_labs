import { describe, it, expect } from "vitest";

function evaluateShippingMeter(
  subtotal: number,
  threshold: number,
  isExpressEligible = false
) {
  if (threshold <= 0) return { enabled: false, isUnlocked: false, remaining: 0, percentage: 0, message: "" };

  const isUnlocked = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const percentage = Math.min(100, Math.max(0, Math.round((subtotal / threshold) * 100)));

  const message = isUnlocked
    ? isExpressEligible
      ? "Free Express shipping unlocked"
      : "Free shipping unlocked"
    : `Add ₹${remaining} for free shipping`;

  return {
    enabled: true,
    isUnlocked,
    remaining,
    percentage,
    message,
  };
}

describe("Free Shipping Progress Meter Logic", () => {
  it("disables meter when store threshold is 0 or negative", () => {
    const res = evaluateShippingMeter(1500, 0);
    expect(res.enabled).toBe(false);
  });

  it("calculates remaining amount and percentage accurately below threshold", () => {
    const res = evaluateShippingMeter(1200, 2000);
    expect(res.enabled).toBe(true);
    expect(res.isUnlocked).toBe(false);
    expect(res.remaining).toBe(800);
    expect(res.percentage).toBe(60);
    expect(res.message).toBe("Add ₹800 for free shipping");
  });

  it("unlocks with neutral message by default when threshold reached", () => {
    const res = evaluateShippingMeter(2500, 1999, false);
    expect(res.isUnlocked).toBe(true);
    expect(res.remaining).toBe(0);
    expect(res.percentage).toBe(100);
    expect(res.message).toBe("Free shipping unlocked");
  });

  it("only says Express if isExpressEligible is explicitly true", () => {
    const res = evaluateShippingMeter(2500, 1999, true);
    expect(res.isUnlocked).toBe(true);
    expect(res.message).toBe("Free Express shipping unlocked");
  });
});
