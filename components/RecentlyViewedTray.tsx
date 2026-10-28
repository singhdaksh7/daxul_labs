"use client";

import React from "react";
import ProductCard from "@/components/ProductCard";
import { useRecentlyViewed } from "@/lib/useRecentlyViewed";
import { Clock, Trash2 } from "lucide-react";

interface RecentlyViewedTrayProps {
  currentProductId?: string;
  title?: string;
}

export default function RecentlyViewedTray({
  currentProductId,
  title = "Recently Viewed Objects",
}: RecentlyViewedTrayProps) {
  const { items, isMounted, clearRecentlyViewed } = useRecentlyViewed(currentProductId);

  if (!isMounted || items.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t border-daxul-black/10">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-daxul-black/70" />
          <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-daxul-black">
            {title}
          </h3>
          <span className="font-mono text-xs text-[#71717A] ml-1">
            ({items.length})
          </span>
        </div>
        <button
          onClick={clearRecentlyViewed}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#71717A] hover:text-daxul-black transition-colors"
          aria-label="Clear recently viewed history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {items.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
