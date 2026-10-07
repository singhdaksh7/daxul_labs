"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/storeContext";
import { useSiteSettings } from "@/lib/siteContext";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { formatMoney } from "@/lib/cartPricing";
import type { StoreProduct } from "@/lib/types";
import { ArrowUpRight, ShoppingBag } from "lucide-react";

interface FeaturedProductProps {
  /** Active products from the database (server-fetched). */
  products: StoreProduct[];
}

export default function FeaturedProduct({ products }: FeaturedProductProps) {
  const { addToCart } = useCart();
  const siteSettings = useSiteSettings();
  const { featuredProduct: cmsFP } = useCms();

  const targetSlug = cmsFP?.productSlug;
  const flagship =
    (targetSlug ? products.find((p) => p.slug === targetSlug) : undefined) ||
    products.find((p) => p.isFeatured) ||
    products[0];

  // groupId -> variantId (defaults to the first in-stock variant)
  const [picked, setPicked] = useState<Record<string, string>>({});

  if (!flagship) return null;

  const selectedFor = (gId: string) => {
    const g = flagship.variantGroups.find((x) => x.id === gId)!;
    return g.variants.find((v) => v.id === picked[gId]) ?? g.variants.find((v) => v.inStock) ?? g.variants[0];
  };
  const variantSelections = flagship.variantGroups.map((g) => {
    const v = selectedFor(g.id);
    return {
      groupId: g.id,
      variantId: v.id,
      groupName: g.name,
      variantName: v.name,
      priceAdjustment: v.priceAdjustment,
    };
  });
  const variantAdj = variantSelections.reduce((a, v) => a + v.priceAdjustment, 0);
  const unitPrice = flagship.price + variantAdj;
  const needsConfiguration = flagship.customFields.length > 0 || !flagship.inStock;

  const badge = cmsFP?.badge || `02 / FEATURED DROP — ${flagship.name}`;
  const headline = cmsFP?.headline || "LIGHT BECOMES THE OBJECT.";
  const displayTitle = cmsFP?.customOverrideTitle || flagship.name;
  const description = cmsFP?.description || flagship.description;
  const ctaLabel = cmsFP?.ctaLabel || "DISCOVER SHADOW";
  const ctaUrl = cmsFP?.ctaUrl || `/shop/${flagship.slug}`;
  const mediaConfig = cmsFP?.media;
  const fallbackUrl =
    flagship.images[0] ||
    "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop";

  const showPricing = cmsFP?.showPricing !== false;
  const showProductOptions = cmsFP?.showProductOptions !== false;

  const handleAddToCart = () => {
    addToCart({
      productId: flagship.id,
      slug: flagship.slug,
      name: flagship.name,
      image: flagship.images[0] || "",
      quantity: 1,
      basePrice: flagship.price,
      variantSelections,
      customizations: {},
      customizationDetails: [],
      customizationFee: 0,
      unitPrice,
      prepaidOnly: flagship.prepaidOnly,
      codEnabled: flagship.codEnabled,
      customizable: flagship.customizable,
    });
  };

  return (
    <section id="featured-shadow" className="bg-daxul-black text-white py-20 lg:py-32 border-b border-daxul-graphite">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Editorial Top Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 mb-12 border-b border-daxul-graphite">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-daxul-gray uppercase mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-daxul-lime" />
              <span>{badge}</span>
            </div>
            <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.9] text-white">
              {headline}
            </h2>
          </div>

          <div className="mt-4 md:mt-0 font-mono text-[11px] text-daxul-gray tracking-widest uppercase">
            [ ARCHIVE ID: {flagship.slug.toUpperCase()} ]
          </div>
        </div>

        {/* Editorial Grid Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Main Visual Showcase (7 Cols) */}
          <div className="lg:col-span-7 relative group">
            <div className="relative aspect-[4/3] w-full bg-daxul-dark border border-daxul-graphite overflow-hidden">
              <CmsMediaDisplay
                media={mediaConfig}
                fallbackUrl={fallbackUrl}
                fallbackAlt={displayTitle}
                className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />

              {flagship.badge && (
                <div className="absolute top-4 right-4 bg-daxul-black/90 backdrop-blur-sm px-3.5 py-1.5 border border-daxul-graphite font-mono text-[10px] text-daxul-lime tracking-widest uppercase">
                  {flagship.badge}
                </div>
              )}

              <div className="absolute bottom-6 left-6 font-mono text-xs text-daxul-gray bg-daxul-black/90 backdrop-blur-sm px-4 py-2 border border-daxul-graphite">
                <span className="block text-white font-semibold">{displayTitle}</span>
                <span className="text-[10px] text-daxul-gray tracking-wider uppercase">
                  {flagship.subtitle || flagship.category}
                </span>
              </div>
            </div>
          </div>

          {/* Product Details & Purchase Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <span className="font-mono text-[11px] text-daxul-gray uppercase tracking-[0.2em] block">
                {flagship.category}
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
                {displayTitle}
              </h3>
              <p className="text-xs sm:text-sm text-daxul-gray leading-relaxed font-normal pt-1">{description}</p>
            </div>

            {/* Variant selectors (from product variant groups) */}
            {showProductOptions &&
              flagship.variantGroups.map((g, gi) => {
                const current = selectedFor(g.id);
                const lime = gi % 2 === 1;
                return (
                  <div key={g.id} className={`space-y-3 ${gi === 0 ? "pt-4 border-t border-daxul-graphite" : "pt-2"}`}>
                    <div className="flex justify-between items-center font-mono text-[11px] uppercase tracking-wider">
                      <span className="text-daxul-gray">{g.name}</span>
                      <span className={`${lime ? "text-daxul-lime" : "text-white"} font-semibold`}>{current.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.variants.map((v) => {
                        const isSelected = current.id === v.id;
                        return (
                          <button
                            key={v.id}
                            disabled={!v.inStock}
                            onClick={() => setPicked((prev) => ({ ...prev, [g.id]: v.id }))}
                            className={`font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 transition-all border ${
                              isSelected
                                ? lime
                                  ? "bg-daxul-lime text-daxul-black border-daxul-lime font-bold"
                                  : "bg-white text-daxul-black border-white font-bold"
                                : "bg-daxul-dark text-daxul-gray border-daxul-graphite hover:border-white hover:text-white"
                            } ${!v.inStock ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                          >
                            {v.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {/* Price & Purchase Actions */}
            <div className="pt-6 border-t border-daxul-graphite space-y-5">
              {showPricing && (
                <div className="flex items-baseline justify-between font-mono">
                  <div>
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {formatMoney(siteSettings.currencySymbol, unitPrice)}
                    </span>
                    {flagship.compareAtPrice && flagship.compareAtPrice > flagship.price && (
                      <span className="text-xs text-daxul-gray line-through ml-3">
                        {formatMoney(siteSettings.currencySymbol, flagship.compareAtPrice)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-daxul-lime tracking-widest uppercase">
                    {flagship.inStock ? `[ IN STOCK — DISPATCH ~${flagship.estimatedDispatchDays}D ]` : "[ SOLD OUT ]"}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {needsConfiguration ? (
                  <Link
                    href={`/shop/${flagship.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-daxul-bone text-daxul-black font-mono text-xs font-bold uppercase tracking-[0.2em] py-4 transition-all border border-white"
                  >
                    <ShoppingBag className="w-4 h-4 stroke-[1.75]" />
                    <span>{flagship.inStock ? "CUSTOMIZE" : "VIEW"}</span>
                  </Link>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-daxul-bone text-daxul-black font-mono text-xs font-bold uppercase tracking-[0.2em] py-4 transition-all border border-white"
                  >
                    <ShoppingBag className="w-4 h-4 stroke-[1.75]" />
                    <span>ADD TO CART</span>
                  </button>
                )}

                <Link
                  href={ctaUrl}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-daxul-dark hover:bg-daxul-graphite text-white font-mono text-xs font-medium uppercase tracking-[0.2em] py-4 transition-all border border-daxul-graphite hover:border-white"
                >
                  <span>{ctaLabel}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
