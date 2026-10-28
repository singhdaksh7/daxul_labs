"use client";

import React, { useState } from "react";
import { SlidersHorizontal, X, RotateCcw, Check, ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/cartPricing";

export interface FilterFacets {
  collections: { id: string; name: string; slug: string; count: number }[];
  categories: { name: string; count: number }[];
  materials: string[];
  priceRange: { min: number; max: number };
  inStockCount: number;
  customizableCount: number;
  total: number;
}

export interface ActiveFilters {
  collection: string; // "all" or slug
  category: string; // "all" or category name
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  customizableOnly: boolean;
  material: string; // "all" or material name
  sort: "featured" | "price-asc" | "price-desc" | "newest";
  q: string;
}

interface ShopFiltersProps {
  facets: FilterFacets;
  filters: ActiveFilters;
  currencySymbol?: string;
  totalFilteredCount: number;
  onFilterChange: (next: Partial<ActiveFilters>) => void;
  onReset: () => void;
}

export default function ShopFilters({
  facets,
  filters,
  currencySymbol = "₹",
  totalFilteredCount,
  onFilterChange,
  onReset,
}: ShopFiltersProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const money = (n: number) => formatMoney(currencySymbol, n);

  // Count active non-default filters
  const activeCount = [
    filters.collection !== "all",
    filters.category !== "all",
    filters.minPrice !== undefined && filters.minPrice > facets.priceRange.min,
    filters.maxPrice !== undefined && filters.maxPrice < facets.priceRange.max,
    filters.inStockOnly,
    filters.customizableOnly,
    filters.material !== "all",
    Boolean(filters.q),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Desktop & Mobile Main Filter / Sort Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-y border-daxul-black/10 py-3.5">
        
        {/* Left: Desktop Quick Collections Pills & Mobile Filter Button */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden flex items-center gap-2 px-3.5 py-2 rounded-lg border border-daxul-black/20 bg-white text-xs font-bold uppercase tracking-wider text-daxul-black shrink-0"
            aria-label="Open filter sheet"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="bg-daxul-lime text-daxul-black font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>

          {/* Desktop Collections Tabs */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => onFilterChange({ collection: "all" })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
                filters.collection === "all"
                  ? "bg-daxul-black text-daxul-bone border-daxul-black"
                  : "bg-transparent text-daxul-black/70 border-daxul-black/15 hover:border-daxul-black"
              }`}
            >
              All ({facets.total})
            </button>
            {facets.collections.map((col) => (
              <button
                key={col.id}
                onClick={() => onFilterChange({ collection: col.slug })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
                  filters.collection === col.slug
                    ? "bg-daxul-black text-daxul-bone border-daxul-black"
                    : "bg-transparent text-daxul-black/70 border-daxul-black/15 hover:border-daxul-black"
                }`}
              >
                {col.name} ({col.count})
              </button>
            ))}
          </div>
        </div>

        {/* Right: Desktop Secondary Filters & Sort Dropdown */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0">
          {/* Desktop In-Stock Toggle */}
          <button
            onClick={() => onFilterChange({ inStockOnly: !filters.inStockOnly })}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
              filters.inStockOnly
                ? "bg-daxul-black text-daxul-bone border-daxul-black"
                : "bg-white text-daxul-black/75 border-daxul-black/15 hover:border-daxul-black"
            }`}
          >
            {filters.inStockOnly && <Check className="w-3 h-3 text-daxul-lime" />}
            <span>In Stock Only</span>
          </button>

          {/* Desktop Customizable Toggle */}
          {facets.customizableCount > 0 && (
            <button
              onClick={() => onFilterChange({ customizableOnly: !filters.customizableOnly })}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
                filters.customizableOnly
                  ? "bg-daxul-black text-daxul-bone border-daxul-black"
                  : "bg-white text-daxul-black/75 border-daxul-black/15 hover:border-daxul-black"
              }`}
            >
              {filters.customizableOnly && <Check className="w-3 h-3 text-daxul-lime" />}
              <span>Customizable</span>
            </button>
          )}

          {/* Desktop Materials Filter (only if real materials exist) */}
          {facets.materials.length > 0 && (
            <div className="hidden xl:block">
              <select
                value={filters.material}
                onChange={(e) => onFilterChange({ material: e.target.value })}
                className="bg-white border border-daxul-black/15 hover:border-daxul-black text-daxul-black text-xs font-semibold uppercase px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                aria-label="Filter by Material"
              >
                <option value="all">Material: All</option>
                {facets.materials.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Dropdown (Desktop & Mobile) */}
          <div className="relative flex-1 md:flex-initial">
            <select
              value={filters.sort}
              onChange={(e) => onFilterChange({ sort: e.target.value as ActiveFilters["sort"] })}
              className="w-full md:w-auto bg-white border border-daxul-black/15 hover:border-daxul-black text-daxul-black text-xs font-semibold uppercase px-3 py-2 md:py-1.5 rounded-lg focus:outline-none cursor-pointer"
              aria-label="Sort objects"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Additions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips / Reset Bar */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-mono text-[11px] text-[#71717A] uppercase tracking-wider">Active:</span>

          {filters.q && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-daxul-black/15 text-daxul-black font-medium">
              <span>&ldquo;{filters.q}&rdquo;</span>
              <button onClick={() => onFilterChange({ q: "" })} aria-label="Remove search filter">
                <X className="w-3 h-3 text-[#71717A] hover:text-daxul-black" />
              </button>
            </span>
          )}

          {filters.collection !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-daxul-black/15 text-daxul-black font-medium">
              <span>Collection: {facets.collections.find((c) => c.slug === filters.collection)?.name || filters.collection}</span>
              <button onClick={() => onFilterChange({ collection: "all" })} aria-label="Remove collection filter">
                <X className="w-3 h-3 text-[#71717A] hover:text-daxul-black" />
              </button>
            </span>
          )}

          {filters.inStockOnly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-daxul-black/15 text-daxul-black font-medium">
              <span>In Stock Only</span>
              <button onClick={() => onFilterChange({ inStockOnly: false })} aria-label="Remove in stock filter">
                <X className="w-3 h-3 text-[#71717A] hover:text-daxul-black" />
              </button>
            </span>
          )}

          {filters.customizableOnly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-daxul-black/15 text-daxul-black font-medium">
              <span>Customizable</span>
              <button onClick={() => onFilterChange({ customizableOnly: false })} aria-label="Remove customizable filter">
                <X className="w-3 h-3 text-[#71717A] hover:text-daxul-black" />
              </button>
            </span>
          )}

          {filters.material !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-daxul-black/15 text-daxul-black font-medium">
              <span>Material: {filters.material}</span>
              <button onClick={() => onFilterChange({ material: "all" })} aria-label="Remove material filter">
                <X className="w-3 h-3 text-[#71717A] hover:text-daxul-black" />
              </button>
            </span>
          )}

          {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-daxul-black/15 text-daxul-black font-medium">
              <span>
                Price: {money(filters.minPrice ?? facets.priceRange.min)} - {money(filters.maxPrice ?? facets.priceRange.max)}
              </span>
              <button
                onClick={() => onFilterChange({ minPrice: undefined, maxPrice: undefined })}
                aria-label="Remove price filter"
              >
                <X className="w-3 h-3 text-[#71717A] hover:text-daxul-black" />
              </button>
            </span>
          )}

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#71717A] hover:text-daxul-black underline ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Mobile Slide-Up Bottom Sheet Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-daxul-black/50 backdrop-blur-sm flex justify-end flex-col animate-in fade-in duration-200">
          <div className="flex-1 cursor-pointer" onClick={() => setMobileDrawerOpen(false)} />
          <div className="bg-daxul-bone border-t border-daxul-black/20 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-daxul-black/10 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-daxul-black" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">
                  Filters ({activeCount})
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <button
                    onClick={onReset}
                    className="text-[11px] font-semibold uppercase text-[#71717A] hover:text-daxul-black underline"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 text-daxul-black/60 hover:text-daxul-black"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Facets */}
            <div className="overflow-y-auto p-5 space-y-6 flex-1 text-xs">
              {/* Collection */}
              <div className="space-y-2.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[#71717A] font-bold block">
                  Collection
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onFilterChange({ collection: "all" })}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${
                      filters.collection === "all"
                        ? "bg-daxul-black text-daxul-bone border-daxul-black"
                        : "bg-white text-daxul-black border-daxul-black/15"
                    }`}
                  >
                    All ({facets.total})
                  </button>
                  {facets.collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => onFilterChange({ collection: col.slug })}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${
                        filters.collection === col.slug
                          ? "bg-daxul-black text-daxul-bone border-daxul-black"
                          : "bg-white text-daxul-black border-daxul-black/15"
                      }`}
                    >
                      {col.name} ({col.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-2.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[#71717A] font-bold block">
                  Availability
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.inStockOnly}
                      onChange={(e) => onFilterChange({ inStockOnly: e.target.checked })}
                      className="accent-daxul-black w-4 h-4 rounded"
                    />
                    <span className="font-semibold text-daxul-black">
                      In Stock Only ({facets.inStockCount})
                    </span>
                  </label>
                  {facets.customizableCount > 0 && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.customizableOnly}
                        onChange={(e) => onFilterChange({ customizableOnly: e.target.checked })}
                        className="accent-daxul-black w-4 h-4 rounded"
                      />
                      <span className="font-semibold text-daxul-black">
                        Customizable Objects ({facets.customizableCount})
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Material (if present) */}
              {facets.materials.length > 0 && (
                <div className="space-y-2.5">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-[#71717A] font-bold block">
                    Material
                  </label>
                  <select
                    value={filters.material}
                    onChange={(e) => onFilterChange({ material: e.target.value })}
                    className="w-full bg-white border border-daxul-black/15 p-2.5 rounded-lg text-xs font-semibold uppercase focus:outline-none"
                  >
                    <option value="all">All Materials</option>
                    {facets.materials.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Range Slider / Inputs */}
              {facets.priceRange.max > facets.priceRange.min && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center font-mono text-[11px] uppercase tracking-wider text-[#71717A] font-bold">
                    <span>Price Range</span>
                    <span className="text-daxul-black">
                      {money(filters.minPrice ?? facets.priceRange.min)} - {money(filters.maxPrice ?? facets.priceRange.max)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={facets.priceRange.min}
                      max={facets.priceRange.max}
                      step={50}
                      value={filters.maxPrice ?? facets.priceRange.max}
                      onChange={(e) => onFilterChange({ maxPrice: Number(e.target.value) })}
                      className="w-full accent-daxul-black"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Apply CTA */}
            <div className="p-4 border-t border-daxul-black/10 bg-white">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-3 bg-daxul-black text-daxul-bone font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-daxul-black/85 transition-colors"
              >
                View {totalFilteredCount} {totalFilteredCount === 1 ? "Object" : "Objects"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
