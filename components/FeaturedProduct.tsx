"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCms } from "@/lib/cmsContext";
import ProductCard from "./ProductCard";
import type { StoreProduct } from "@/lib/types";

interface FeaturedProductProps {
  /** Real active products from the database (server-fetched). */
  products: StoreProduct[];
}

export default function FeaturedProduct({ products }: FeaturedProductProps) {
  const { featuredProduct: cmsFP } = useCms();

  const title = cmsFP?.headline || "Featured Objects";
  const badge = cmsFP?.badge;
  const targetSlug = cmsFP?.productSlug;

  // Order products: prioritize selected CMS slug, then featured items
  const sortedProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    const list = [...products];
    if (targetSlug) {
      const idx = list.findIndex((p) => p.slug === targetSlug);
      if (idx > -1) {
        const [target] = list.splice(idx, 1);
        list.unshift(target);
      }
    }
    return list.slice(0, 4);
  }, [products, targetSlug]);

  if (sortedProducts.length === 0) return null;

  return (
    <section id="featured-objects" className="bg-daxul-bone text-daxul-black py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Top Header */}
        <div className="flex items-end justify-between pb-6 mb-10 border-b border-daxul-black/10">
          <div>
            {badge && (
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block mb-2">
                {badge}
              </span>
            )}
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-daxul-black">
              {title}
            </h2>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-daxul-black hover:opacity-70 transition-opacity"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Columns Desktop / 2 Columns Mobile Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {sortedProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>

      </div>
    </section>
  );
}
