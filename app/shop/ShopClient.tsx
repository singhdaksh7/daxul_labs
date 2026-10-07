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
    <>
      {/* Hero Header */}
      <section className="bg-daxul-dark border-b border-daxul-graphite py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-daxul-lime">
            CATALOG DISPATCH — ON-DEMAND PRODUCTION
          </span>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">ALL OBJECTS & DROPS</h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Every object is crafted on-demand using multi-axis FDM and resin SLA additive manufacturing. Select an
            object to customize or order directly.
          </p>
        </div>
      </section>

      {products.length === 0 ? (
        <section className="flex-1 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center space-y-3 text-gray-400">
            <p className="text-lg font-bold uppercase text-gray-200">New objects are being prepared.</p>
            <p className="text-sm">The catalog is being updated. Please check back soon.</p>
            <Link href="/" className="text-daxul-lime underline text-xs font-bold uppercase inline-block pt-2">
              Back to Home
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <section className="py-8 bg-daxul-black border-b border-daxul-graphite sticky top-20 z-30 backdrop-blur-md bg-daxul-black/90">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Collection Pills */}
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto pb-2 md:pb-0">
                  <button
                    onClick={() => setSelectedCollection("all")}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      selectedCollection === "all"
                        ? "bg-daxul-lime text-daxul-black"
                        : "bg-daxul-dark text-gray-400 border border-daxul-graphite hover:text-white"
                    }`}
                  >
                    All ({products.length})
                  </button>
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setSelectedCollection(col.slug)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                        selectedCollection === col.slug
                          ? "bg-daxul-lime text-daxul-black"
                          : "bg-daxul-dark text-gray-400 border border-daxul-graphite hover:text-white"
                      }`}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>

                {/* Search & Sort */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                    <input
                      type="text"
                      placeholder="SEARCH CATALOG..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-daxul-dark border border-daxul-graphite focus:border-daxul-lime rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none"
                    />
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-daxul-dark border border-daxul-graphite focus:border-daxul-lime text-white text-xs font-semibold uppercase px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Product Grid */}
          <section className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400 space-y-3">
                <p className="text-lg font-bold uppercase">No objects found matching your filter.</p>
                <button
                  onClick={() => {
                    setSelectedCollection("all");
                    setSearchQuery("");
                  }}
                  className="text-daxul-lime underline text-xs font-bold uppercase"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
