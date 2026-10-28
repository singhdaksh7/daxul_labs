import { describe, it, expect } from "vitest";
import type { StoreProduct } from "@/lib/types";

function applyFilters(
  products: StoreProduct[],
  filters: {
    collection?: string;
    category?: string;
    q?: string;
    inStockOnly?: boolean;
    customizableOnly?: boolean;
    material?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "featured" | "price-asc" | "price-desc";
  }
): StoreProduct[] {
  let list = [...products];

  if (filters.collection && filters.collection !== "all") {
    list = list.filter((p) => p.collectionSlug === filters.collection);
  }
  if (filters.category && filters.category !== "all") {
    list = list.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
  }
  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }
  if (filters.inStockOnly) {
    list = list.filter((p) => p.inStock);
  }
  if (filters.customizableOnly) {
    list = list.filter((p) => p.customizable);
  }
  if (filters.material && filters.material !== "all") {
    list = list.filter(
      (p) => p.materials && p.materials.toLowerCase().includes(filters.material!.toLowerCase())
    );
  }
  if (filters.minPrice !== undefined) {
    list = list.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    list = list.filter((p) => p.price <= filters.maxPrice!);
  }

  if (filters.sort === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (filters.sort === "price-desc") {
    list.sort((a, b) => b.price - a.price);
  }

  return list;
}

const mockProducts: StoreProduct[] = [
  {
    id: "p1",
    name: "Lithophane Box Lamp",
    slug: "lithophane-box-lamp",
    category: "Shadow Objects",
    price: 1999,
    description: "Custom lithophane projection cube",
    story: "Studio crafted",
    specs: [],
    careInstructions: [],
    faq: [],
    images: ["/img1.jpg"],
    stock: 12,
    inStock: true,
    productionTimeDays: 2,
    estimatedDispatchDays: 3,
    prepaidOnly: false,
    codEnabled: true,
    finishes: ["Matte"],
    colors: ["Bone"],
    sizes: ["Standard"],
    customFields: [],
    customizable: true,
    trackInventory: true,
    collectionSlug: "flagship-lamps",
    materials: "PLA+, Acrylic",
    variantGroups: [],
  },
  {
    id: "p2",
    name: "Desk Planter Vessel",
    slug: "desk-planter-vessel",
    category: "Desk Objects",
    price: 899,
    description: "Architectural planter",
    story: "Minimalist geometry",
    specs: [],
    careInstructions: [],
    faq: [],
    images: ["/img2.jpg"],
    stock: 0,
    inStock: false,
    productionTimeDays: 1,
    estimatedDispatchDays: 2,
    prepaidOnly: false,
    codEnabled: true,
    finishes: ["Satin"],
    colors: ["Graphite"],
    sizes: ["Small"],
    customFields: [],
    customizable: false,
    trackInventory: true,
    collectionSlug: "desk-editions",
    materials: "PETG Biopolymer",
    variantGroups: [],
  },
  {
    id: "p3",
    name: "Custom Portrait Lithophane",
    slug: "custom-portrait-lithophane",
    category: "Personalized",
    price: 2499,
    description: "Personalized wedding & couple memory",
    story: "Bespoke gift",
    specs: [],
    careInstructions: [],
    faq: [],
    images: ["/img3.jpg"],
    stock: 5,
    inStock: true,
    productionTimeDays: 3,
    estimatedDispatchDays: 4,
    prepaidOnly: true,
    codEnabled: false,
    finishes: ["Warm Glow"],
    colors: ["Warm White"],
    sizes: ["Medium"],
    customFields: [],
    customizable: true,
    trackInventory: true,
    collectionSlug: "flagship-lamps",
    materials: "PLA+ Biopolymer",
    variantGroups: [],
  },
];

describe("Dynamic Catalog Filters", () => {
  it("filters by collection correctly", () => {
    const res = applyFilters(mockProducts, { collection: "flagship-lamps" });
    expect(res.length).toBe(2);
    expect(res.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("filters by in-stock availability", () => {
    const res = applyFilters(mockProducts, { inStockOnly: true });
    expect(res.length).toBe(2);
    expect(res.some((p) => p.id === "p2")).toBe(false);
  });

  it("filters by customizable status", () => {
    const res = applyFilters(mockProducts, { customizableOnly: true });
    expect(res.length).toBe(2);
    expect(res.every((p) => p.customizable)).toBe(true);
  });

  it("filters by price range", () => {
    const res = applyFilters(mockProducts, { minPrice: 1000, maxPrice: 2000 });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("p1");
  });

  it("sorts by price asc and desc", () => {
    const asc = applyFilters(mockProducts, { sort: "price-asc" });
    expect(asc[0].price).toBe(899);
    expect(asc[2].price).toBe(2499);

    const desc = applyFilters(mockProducts, { sort: "price-desc" });
    expect(desc[0].price).toBe(2499);
    expect(desc[2].price).toBe(899);
  });

  it("combines multiple filters safely without mutating source", () => {
    const res = applyFilters(mockProducts, {
      collection: "flagship-lamps",
      inStockOnly: true,
      minPrice: 2000,
    });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("p3");
    expect(mockProducts.length).toBe(3);
  });
});
