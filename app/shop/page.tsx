"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { Search, SlidersHorizontal, ShoppingBag, Sparkles, Sliders } from "lucide-react";

export default function ShopPage() {
  const { products, collections, addToCart, siteSettings } = useStore();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "newest">("featured");

  let filtered = products.filter((p) => !p.isArchived);

  if (selectedCategory !== "all") {
    filtered = filtered.filter(
      (p) => p.category.toLowerCase() === selectedCategory.toLowerCase() || p.slug === selectedCategory
    );
  }

  if (searchQuery.trim()) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (sortBy === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#151515] border-b border-[#242426] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35]">
            CATALOG DISPATCH — ON-DEMAND PRODUCTION
          </span>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">
            ALL OBJECTS & DROPS
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Every object is crafted on-demand using multi-axis FDM and resin SLA additive manufacturing. Select an object to customize or order directly.
          </p>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="py-8 bg-[#0B0B0C] border-b border-[#242426] sticky top-20 z-30 backdrop-blur-md bg-[#0B0B0C]/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto pb-2 md:pb-0">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedCategory === "all"
                    ? "bg-[#C8FF35] text-[#0B0B0C]"
                    : "bg-[#151515] text-gray-400 border border-[#242426] hover:text-white"
                }`}
              >
                All ({products.length})
              </button>
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCategory(col.name)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    selectedCategory.toLowerCase() === col.name.toLowerCase()
                      ? "bg-[#C8FF35] text-[#0B0B0C]"
                      : "bg-[#151515] text-gray-400 border border-[#242426] hover:text-white"
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
                  className="w-full bg-[#151515] border border-[#242426] focus:border-[#C8FF35] rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-[#151515] border border-[#242426] focus:border-[#C8FF35] text-white text-xs font-semibold uppercase px-3 py-2 rounded-xl focus:outline-none"
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
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="text-[#C8FF35] underline text-xs font-bold uppercase"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg"
              >
                {/* Image */}
                <div className="relative aspect-square bg-[#0B0B0C] overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {product.badge && (
                    <span className="absolute top-3 left-3 bg-[#0B0B0C]/80 backdrop-blur text-[#C8FF35] text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-[#242426]">
                      {product.badge}
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 bg-[#0B0B0C]/90 text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-[#242426]">
                    {product.productionTimeDays}d Print Time
                  </span>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#B9B9B4] block mb-1">
                      {product.category}
                    </span>
                    <Link
                      href={`/shop/${product.slug}`}
                      className="text-base font-bold text-white group-hover:text-[#C8FF35] transition-colors line-clamp-1 block"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-3 border-t border-[#242426] flex items-center justify-between">
                    <div>
                      <span className="text-base font-black text-white">
                        {siteSettings.currencySymbol}{product.price}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-xs text-gray-500 line-through ml-2">
                          {siteSettings.currencySymbol}{product.compareAtPrice}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/shop/${product.slug}`}
                        className="bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] text-white p-2 rounded-xl transition-all"
                        title="Configure Custom Options"
                      >
                        <Sliders className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() =>
                          addToCart({
                            product,
                            quantity: 1,
                            selectedFinish: product.finishes[0],
                            selectedColor: product.colors[0],
                            selectedSize: product.sizes[0],
                            customizations: {},
                            customizationFee: 0,
                            totalUnitPrice: product.price,
                          })
                        }
                        className="bg-[#C8FF35] text-[#0B0B0C] hover:bg-white p-2 rounded-xl transition-all font-bold"
                        title="Add to Cart"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
