"use client";

import React from "react";
import Link from "next/link";
import { useSiteSettings } from "@/lib/siteContext";
import { formatMoney } from "@/lib/cartPricing";
import type { StoreProduct } from "@/lib/types";

export default function ProductCard({ product }: { product: StoreProduct }) {
  const settings = useSiteSettings();
  const image = product.images[0];

  return (
    <div className="group flex flex-col justify-between transition-all duration-200">
      {/* Product Image Frame */}
      <Link
        href={`/shop/${product.slug}`}
        className="relative aspect-square w-full bg-[#EAE5DA] border border-daxul-black/10 rounded-lg overflow-hidden block"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-[#71717A]">
            No image
          </div>
        )}
      </Link>

      {/* Product Info */}
      <div className="pt-3.5 space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#71717A] block">
          {product.category}
        </span>
        
        <Link
          href={`/shop/${product.slug}`}
          className="text-sm sm:text-base font-bold text-daxul-black group-hover:underline line-clamp-1 block"
        >
          {product.name}
        </Link>

        <div className="pt-0.5 flex items-center justify-between">
          <span className="text-sm sm:text-base font-semibold text-daxul-black">
            {formatMoney(settings.currencySymbol, product.price)}
          </span>
          {!product.inStock && (
            <span className="text-[10px] font-mono uppercase text-[#71717A] tracking-wider">
              Sold out
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
