"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ShopFilters, { type ActiveFilters, type FilterFacets } from "@/components/ShopFilters";
import type { StoreProduct } from "@/lib/types";
import { useSiteSettings } from "@/lib/siteContext";

interface Props {
  products: StoreProduct[];
  collections: { id: string; name: string; slug: string }[];
}

export default function ShopClient({ products, collections }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settings = useSiteSettings();

  // Parse active filters from URL query parameters (preserves browser history)
  const filters: ActiveFilters = useMemo(() => {
    const col = searchParams.get("collection") || "all";
    const cat = searchParams.get("category") || "all";
    const minP = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxP = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const inStock = searchParams.get("inStock") === "true";
    const custom = searchParams.get("customizable") === "true";
    const mat = searchParams.get("material") || "all";
    const sortVal = (searchParams.get("sort") as ActiveFilters["sort"]) || "featured";
    const q = searchParams.get("q") || "";

    return {
      collection: col,
      category: cat,
      minPrice: Number.isFinite(minP) ? minP : undefined,
      maxPrice: Number.isFinite(maxP) ? maxP : undefined,
      inStockOnly: inStock,
      customizableOnly: custom,
      material: mat,
      sort: sortVal,
      q,
    };
  }, [searchParams]);

  // Derive real facets from available products
  const facets: FilterFacets = useMemo(() => {
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let inStockCount = 0;
    let customizableCount = 0;
    const materialSet = new Set<string>();
    const categoryCountMap = new Map<string, number>();

    const collectionCountMap = new Map<string, number>();
    for (const c of collections) {
      collectionCountMap.set(c.slug, 0);
    }

    for (const p of products) {
      if (p.price < minPrice) minPrice = p.price;
      if (p.price > maxPrice) maxPrice = p.price;
      if (p.inStock) inStockCount++;
      if (p.customizable) customizableCount++;

      if (p.category) {
        categoryCountMap.set(p.category, (categoryCountMap.get(p.category) || 0) + 1);
      }

      if (p.collectionSlug && collectionCountMap.has(p.collectionSlug)) {
        collectionCountMap.set(p.collectionSlug, (collectionCountMap.get(p.collectionSlug) || 0) + 1);
      }

      if (p.materials) {
        p.materials
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((m) => materialSet.add(m));
      }
    }

    const colFacets = collections.map((c) => ({
      ...c,
      count: collectionCountMap.get(c.slug) || 0,
    }));

    return {
      collections: colFacets,
      categories: Array.from(categoryCountMap.entries()).map(([name, count]) => ({ name, count })),
      materials: Array.from(materialSet),
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === -Infinity ? 5000 : Math.ceil(maxPrice),
      },
      inStockCount,
      customizableCount,
      total: products.length,
    };
  }, [products, collections]);

  // Synchronize state changes to URL query
  const updateFilters = useCallback(
    (next: Partial<ActiveFilters>) => {
      const sp = new URLSearchParams(searchParams.toString());

      if (next.collection !== undefined) {
        if (next.collection === "all") sp.delete("collection");
        else sp.set("collection", next.collection);
      }
      if (next.category !== undefined) {
        if (next.category === "all") sp.delete("category");
        else sp.set("category", next.category);
      }
      if (next.minPrice !== undefined) {
        sp.set("minPrice", String(next.minPrice));
      } else if ("minPrice" in next) {
        sp.delete("minPrice");
      }
      if (next.maxPrice !== undefined) {
        sp.set("maxPrice", String(next.maxPrice));
      } else if ("maxPrice" in next) {
        sp.delete("maxPrice");
      }
      if (next.inStockOnly !== undefined) {
        if (next.inStockOnly) sp.set("inStock", "true");
        else sp.delete("inStock");
      }
      if (next.customizableOnly !== undefined) {
        if (next.customizableOnly) sp.set("customizable", "true");
        else sp.delete("customizable");
      }
      if (next.material !== undefined) {
        if (next.material === "all") sp.delete("material");
        else sp.set("material", next.material);
      }
      if (next.sort !== undefined) {
        if (next.sort === "featured") sp.delete("sort");
        else sp.set("sort", next.sort);
      }
      if (next.q !== undefined) {
        if (!next.q) sp.delete("q");
        else sp.set("q", next.q);
      }

      const queryString = sp.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Collection filter
    if (filters.collection !== "all") {
      list = list.filter((p) => p.collectionSlug === filters.collection);
    }

    // Category filter
    if (filters.category !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === filters.category.toLowerCase());
    }

    // Keyword filter
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

    // In-stock filter
    if (filters.inStockOnly) {
      list = list.filter((p) => p.inStock);
    }

    // Customizable filter
    if (filters.customizableOnly) {
      list = list.filter((p) => p.customizable);
    }

    // Material filter
    if (filters.material !== "all") {
      list = list.filter(
        (p) => p.materials && p.materials.toLowerCase().includes(filters.material.toLowerCase())
      );
    }

    // Price range
    if (filters.minPrice !== undefined) {
      list = list.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      list = list.filter((p) => p.price <= filters.maxPrice!);
    }

    // Sort
    if (filters.sort === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (filters.sort === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (filters.sort === "newest") {
      list.sort((a, b) => {
        const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return db - da;
      });
    }

    return list;
  }, [products, filters]);

  return (
    <div className="flex-1 py-8 sm:py-14 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full space-y-6">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-daxul-black uppercase">
            Shop Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] font-mono uppercase tracking-wider mt-1">
            Precision 3D Printed Objects & Lithophanes • Crafted on-demand
          </p>
        </div>
        <div className="font-mono text-xs text-[#71717A] uppercase tracking-wider">
          {filteredProducts.length} {filteredProducts.length === 1 ? "Object" : "Objects"}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center space-y-3 text-[#71717A]">
          <p className="text-base font-semibold uppercase text-daxul-black">New objects are being prepared.</p>
          <p className="text-sm">Please check back soon.</p>
          <Link href="/" className="text-daxul-black underline text-xs font-semibold uppercase inline-block pt-2">
            Back to Home
          </Link>
        </div>
      ) : (
        <>
          {/* Dynamic Facet Filters & Sort */}
          <ShopFilters
            facets={facets}
            filters={filters}
            currencySymbol={settings.currencySymbol}
            totalFilteredCount={filteredProducts.length}
            onFilterChange={updateFilters}
            onReset={resetFilters}
          />

          {/* Product Grid */}
          <div className="py-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-[#71717A] space-y-3 bg-white border border-daxul-black/10 rounded-2xl p-8">
                <p className="text-sm font-semibold uppercase text-daxul-black">
                  No objects found matching your filter criteria.
                </p>
                <p className="text-xs text-[#71717A]">
                  Try expanding your price range or clearing selected tags.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-daxul-black text-daxul-bone text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-daxul-black/85 transition-colors inline-block mt-2"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
