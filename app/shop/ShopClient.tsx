"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { StoreProduct } from "@/lib/types";

interface Props {
  products: StoreProduct[];
  collections: { id: string; name: string; slug: string }[];
}

export default function ShopClient({ products, collections }: Props) {
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");

  const filtered = useMemo(() => {
    let list = [...products];
    if (selectedCollection !== "all") {
      const col = collections.find((c) => c.slug === selectedCollection);
      list = list.filter(
        (p) =>
          p.collectionSlug === selectedCollection ||
          (col && p.category.toLowerCase() === col.name.toLowerCase())
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, collections, selectedCollection, searchQuery, sortBy]);

  return (
    <div className="flex-1 py-10 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full">
      {/* Simple Header */}
      <div className="pb-8 border-b border-daxul-black/10">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-daxul-black uppercase">
          Shop
        </h1>
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
          {/* Filters, Search & Sort Bar */}
          <div className="py-6 border-b border-daxul-black/10 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Category / Collection Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedCollection("all")}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
                  selectedCollection === "all"
                    ? "bg-daxul-black text-daxul-bone border-daxul-black"
                    : "bg-transparent text-daxul-black/70 border-daxul-black/15 hover:border-daxul-black"
                }`}
              >
                All ({products.length})
              </button>
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollection(col.slug)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
                    selectedCollection === col.slug
                      ? "bg-daxul-black text-daxul-bone border-daxul-black"
                      : "bg-transparent text-daxul-black/70 border-daxul-black/15 hover:border-daxul-black"
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>

            {/* Search Input & Sort Dropdown */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#71717A]" />
                <input
                  type="text"
                  placeholder="SEARCH CATALOG..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-daxul-black/15 focus:border-daxul-black rounded-lg pl-9 pr-3 py-2 text-xs text-daxul-black uppercase placeholder:text-[#71717A]/60 focus:outline-none"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-white border border-daxul-black/15 focus:border-daxul-black text-daxul-black text-xs font-semibold uppercase px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Product Grid (4 columns desktop, 2 columns mobile) */}
          <div className="py-10">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-[#71717A] space-y-3">
                <p className="text-sm font-semibold uppercase text-daxul-black">No objects found matching your filter.</p>
                <button
                  onClick={() => {
                    setSelectedCollection("all");
                    setSearchQuery("");
                  }}
                  className="text-daxul-black underline text-xs font-semibold uppercase"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                {filtered.map((product) => (
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
