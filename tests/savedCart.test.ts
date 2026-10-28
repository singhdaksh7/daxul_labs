import { describe, it, expect } from "vitest";
import { mergeCartConfigs, generateLineKey, type StoredCartLineConfig } from "@/lib/savedCart";

describe("Saved Cart & Line Identity Logic", () => {
  it("generates deterministic line keys based on product, variant, and customizations", () => {
    const lineA: StoredCartLineConfig = {
      productId: "prod-1",
      quantity: 1,
      variantSelections: [{ groupId: "g1", variantId: "v1" }],
      customizations: { name: "Aadya", date: "2026-10-28" },
    };

    const lineB: StoredCartLineConfig = {
      productId: "prod-1",
      quantity: 2,
      variantSelections: [{ groupId: "g1", variantId: "v1" }],
      customizations: { date: "2026-10-28", name: "Aadya" }, // different order of keys
    };

    expect(generateLineKey(lineA)).toBe(generateLineKey(lineB));
  });

  it("merges guest cart and db cart summing quantities for identical items", () => {
    const dbCart: StoredCartLineConfig[] = [
      {
        productId: "p1",
        quantity: 2,
        variantSelections: [{ groupId: "size", variantId: "medium" }],
      },
    ];

    const guestCart: StoredCartLineConfig[] = [
      {
        productId: "p1",
        quantity: 3,
        variantSelections: [{ groupId: "size", variantId: "medium" }],
      },
      {
        productId: "p2",
        quantity: 1,
      },
    ];

    const merged = mergeCartConfigs(dbCart, guestCart);
    expect(merged.length).toBe(2);

    const p1 = merged.find((m) => m.productId === "p1");
    expect(p1?.quantity).toBe(5); // 2 + 3

    const p2 = merged.find((m) => m.productId === "p2");
    expect(p2?.quantity).toBe(1);
  });

  it("treats items with different customizations as separate lines without collisions", () => {
    const dbCart: StoredCartLineConfig[] = [
      { productId: "p1", quantity: 1, customizations: { text: "Gift A" } },
    ];
    const guestCart: StoredCartLineConfig[] = [
      { productId: "p1", quantity: 1, customizations: { text: "Gift B" } },
    ];

    const merged = mergeCartConfigs(dbCart, guestCart);
    expect(merged.length).toBe(2);
  });
});
