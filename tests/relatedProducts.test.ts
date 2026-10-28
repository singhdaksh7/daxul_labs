import { describe, it, expect } from "vitest";

interface ProductMock {
  id: string;
  name: string;
  collectionId?: string | null;
  category: string;
  isFeatured: boolean;
  isArchived: boolean;
  isActive: boolean;
}

function resolveRelatedProducts(
  currentProduct: { id: string; collectionId?: string | null; category: string; relatedProductIds?: string[] },
  allProducts: ProductMock[],
  limit = 4
): ProductMock[] {
  const collected: ProductMock[] = [];
  const seenIds = new Set<string>([currentProduct.id]);
  const live = allProducts.filter((p) => !p.isArchived && p.isActive);

  // 1. Manually configured related IDs
  if (currentProduct.relatedProductIds && currentProduct.relatedProductIds.length > 0) {
    for (const id of currentProduct.relatedProductIds) {
      if (!seenIds.has(id)) {
        const found = live.find((p) => p.id === id);
        if (found) {
          seenIds.add(found.id);
          collected.push(found);
          if (collected.length >= limit) return collected;
        }
      }
    }
  }

  // 2. Collection match
  if (collected.length < limit && currentProduct.collectionId) {
    const colMatches = live
      .filter((p) => !seenIds.has(p.id) && p.collectionId === currentProduct.collectionId)
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    for (const p of colMatches) {
      seenIds.add(p.id);
      collected.push(p);
      if (collected.length >= limit) return collected;
    }
  }

  // 3. Category match
  if (collected.length < limit && currentProduct.category) {
    const catMatches = live
      .filter((p) => !seenIds.has(p.id) && p.category === currentProduct.category)
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    for (const p of catMatches) {
      seenIds.add(p.id);
      collected.push(p);
      if (collected.length >= limit) return collected;
    }
  }

  // 4. Featured fallback
  if (collected.length < limit) {
    const fallback = live
      .filter((p) => !seenIds.has(p.id))
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    for (const p of fallback) {
      seenIds.add(p.id);
      collected.push(p);
      if (collected.length >= limit) return collected;
    }
  }

  return collected;
}

const mockCatalog: ProductMock[] = [
  { id: "p1", name: "Flagship Lithophane", collectionId: "col-lamps", category: "Lamps", isFeatured: true, isArchived: false, isActive: true },
  { id: "p2", name: "Desk Lithophane Cube", collectionId: "col-lamps", category: "Lamps", isFeatured: false, isArchived: false, isActive: true },
  { id: "p3", name: "Wall Projection Frame", collectionId: "col-lamps", category: "Wall Decor", isFeatured: false, isArchived: false, isActive: true },
  { id: "p4", name: "Curated Desk Stand", collectionId: "col-desk", category: "Desk", isFeatured: true, isArchived: false, isActive: true },
  { id: "p5", name: "Mini Planter", collectionId: "col-desk", category: "Desk", isFeatured: false, isArchived: false, isActive: true },
  { id: "p6", name: "Archived Product", collectionId: "col-lamps", category: "Lamps", isFeatured: true, isArchived: true, isActive: false },
];

describe("Related Products Algorithm", () => {
  it("prioritizes manually configured related IDs", () => {
    const target = {
      id: "p1",
      collectionId: "col-lamps",
      category: "Lamps",
      relatedProductIds: ["p4"], // p4 is from col-desk, but manually related
    };

    const res = resolveRelatedProducts(target, mockCatalog, 3);
    expect(res[0].id).toBe("p4");
  });

  it("falls back to collection matches after manual IDs", () => {
    const target = {
      id: "p1",
      collectionId: "col-lamps",
      category: "Lamps",
      relatedProductIds: ["p4"],
    };

    const res = resolveRelatedProducts(target, mockCatalog, 3);
    expect(res[0].id).toBe("p4");
    expect(res[1].collectionId).toBe("col-lamps");
    expect(res[1].id).toBe("p2");
  });

  it("excludes current product and archived products", () => {
    const target = {
      id: "p1",
      collectionId: "col-lamps",
      category: "Lamps",
      relatedProductIds: ["p1", "p6"], // p1 is self, p6 is archived
    };

    const res = resolveRelatedProducts(target, mockCatalog, 4);
    expect(res.some((p) => p.id === "p1")).toBe(false);
    expect(res.some((p) => p.id === "p6")).toBe(false);
  });

  it("never duplicates items across multiple priority buckets", () => {
    const target = {
      id: "p1",
      collectionId: "col-lamps",
      category: "Lamps",
      relatedProductIds: ["p2"],
    };

    const res = resolveRelatedProducts(target, mockCatalog, 4);
    const ids = res.map((p) => p.id);
    const uniqueIds = Array.from(new Set(ids));
    expect(ids.length).toBe(uniqueIds.length);
  });
});
