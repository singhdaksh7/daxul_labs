"use client";

import React from "react";
import Link from "next/link";
import { useStore } from "@/lib/storeContext";
import { HomepageSection, Product } from "@/lib/types";
import { ShoppingBag, ArrowRight, Sparkles, Sliders } from "lucide-react";

interface NewDropsSectionProps {
  section?: HomepageSection;
}

export default function NewDropsSection({ section }: NewDropsSectionProps) {
  const { products, addToCart, siteSettings } = useStore();

  const title = section?.title || "New Drops & Bestsellers";
  const subtitle = section?.subtitle || "ON-DEMAND PRODUCTION RUNS";
  const badgeText = section?.badgeText || "ACTIVE CATALOG";

  const activeProducts = products.filter((p) => !p.isArchived).slice(0, 6);

  return (
    <section className="bg-[#0B0B0C] text-white py-20 lg:py-32 border-b border-[#242426]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-[#242426]">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35] block mb-1">
              {badgeText} — {subtitle}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              {title}
            </h2>
          </div>

          <Link
            href="/shop"
            className="mt-4 md:mt-0 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8FF35] hover:text-white transition-colors"
          >
            <span>View Full Catalog ({products.length} Objects)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeProducts.map((product) => (
            <div
              key={product.id}
              className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg"
            >
              {/* Product Media Container */}
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

              {/* Card Body */}
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

                {/* Price & Action */}
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

                  <div className="flex gap-1.5">
                    {product.customFields.length > 0 ? (
                      <Link
                        href={`/shop/${product.slug}`}
                        className="bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] text-white p-2 rounded-xl transition-all"
                        title="Configure Custom Options"
                      >
                        <Sliders className="w-4 h-4" />
                      </Link>
                    ) : (
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
                        title="Quick Add to Cart"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
