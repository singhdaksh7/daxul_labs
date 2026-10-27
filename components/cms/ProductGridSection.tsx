"use client";

import React from "react";
import Link from "next/link";
import { ProductGridSectionContent } from "@/lib/cms/pageTypes";
import ProductCard from "@/components/ProductCard";
import type { StoreProduct } from "@/lib/types";

export default function ProductGridSection({
  content,
  products = [],
}: {
  content: ProductGridSectionContent;
  products?: StoreProduct[];
}) {
  if (!content) return null;

  // Filter by selected product IDs if specified
  let displayed = [...products];
  if (content.productIds && content.productIds.length > 0) {
    const idSet = new Set(content.productIds);
    displayed = displayed.filter((p) => idSet.has(p.id));
  }

  // Sort
  if (content.sortMode === "price_asc") {
    displayed.sort((a, b) => a.price - b.price);
  } else if (content.sortMode === "price_desc") {
    displayed.sort((a, b) => b.price - a.price);
  }

  // Limit
  if (content.limit && content.limit > 0) {
    displayed = displayed.slice(0, content.limit);
  }

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-14">
          <div>
            <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
              {content.heading}
            </h2>
            {content.description && (
              <p className="mt-2 text-sm text-[#71717A] max-w-xl">
                {content.description}
              </p>
            )}
          </div>
          {content.ctaLabel && content.ctaLink && (
            <Link
              href={content.ctaLink}
              className="font-mono text-xs uppercase tracking-widest text-daxul-black hover:underline shrink-0"
            >
              {content.ctaLabel} →
            </Link>
          )}
        </div>

        {displayed.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {displayed.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center font-mono text-xs text-[#71717A] uppercase tracking-wider bg-[#ECE8E0]">
            No objects currently available in this grid.
          </div>
        )}

      </div>
    </section>
  );
}
