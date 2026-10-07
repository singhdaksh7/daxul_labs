"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/storeContext";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";
import { ArrowUpRight, ShoppingBag } from "lucide-react";

interface FeaturedProductProps {
  section?: HomepageSection;
}

export default function FeaturedProduct({ section }: FeaturedProductProps) {
  const { products, addToCart, siteSettings } = useStore();
  const { featuredProduct: cmsFP } = useCms();

  const targetSlug = cmsFP?.productSlug || "daxul-shadow-01";
  const flagship = products.find((p) => p.slug === targetSlug) || products[0];

  const [selectedFinish, setSelectedFinish] = useState(flagship?.finishes[0] || "Matte Charcoal");
  const [selectedColor, setSelectedColor] = useState(flagship?.colors[0] || "Warm Gold LED (2700K)");
  const [selectedSize, setSelectedSize] = useState(flagship?.sizes[0] || "Standard (220mm)");

  if (!flagship) return null;

  const badge = cmsFP?.badge || "02 / FEATURED DROP — DAXUL SHADOW 01 (Projection Lamp)";
  const headline = cmsFP?.headline || "LIGHT BECOMES THE OBJECT.";
  const displayTitle = cmsFP?.customOverrideTitle || flagship.name;
  const description = cmsFP?.description || flagship.description;
  const ctaLabel = cmsFP?.ctaLabel || "DISCOVER SHADOW";
  const ctaUrl = cmsFP?.ctaUrl || `/shop/${flagship.slug}`;
  const mediaConfig = cmsFP?.media;
  const fallbackUrl = flagship.images[0] || "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop";

  const showPricing = cmsFP?.showPricing !== false;
  const showProductOptions = cmsFP?.showProductOptions !== false;

  const handleAddToCart = () => {
    addToCart({
      product: flagship,
      quantity: 1,
      selectedFinish,
      selectedColor,
      selectedSize,
      customizations: {},
      customizationFee: 0,
      totalUnitPrice: flagship.price,
    });
  };

  return (
    <section id="featured-shadow" className="bg-[#0B0B0C] text-white py-20 lg:py-32 border-b border-[#242426]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Editorial Top Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 mb-12 border-b border-[#242426]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#B9B9B4] uppercase mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#C8FF35]" />
              <span>{badge}</span>
            </div>
            <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.9] text-white">
              {headline}
            </h2>
          </div>

          <div className="mt-4 md:mt-0 font-mono text-[11px] text-[#B9B9B4] tracking-widest uppercase">
            [ ARCHIVE ID: {flagship.slug.toUpperCase()} ]
          </div>
        </div>

        {/* Editorial Grid Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Main Visual Showcase (7 Cols) */}
          <div className="lg:col-span-7 relative group">
            <div className="relative aspect-[4/3] w-full bg-[#151515] border border-[#242426] overflow-hidden">
              <CmsMediaDisplay
                media={mediaConfig}
                fallbackUrl={fallbackUrl}
                fallbackAlt={displayTitle}
                className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
              
              <div className="absolute top-4 right-4 bg-[#0B0B0C]/90 backdrop-blur-sm px-3.5 py-1.5 border border-[#242426] font-mono text-[10px] text-[#C8FF35] tracking-widest uppercase">
                {flagship.badge || "FLAGSHIP DROP"}
              </div>

              <div className="absolute bottom-6 left-6 font-mono text-xs text-[#B9B9B4] bg-[#0B0B0C]/90 backdrop-blur-sm px-4 py-2 border border-[#242426]">
                <span className="block text-white font-semibold">{displayTitle}</span>
                <span className="text-[10px] text-[#B9B9B4] tracking-wider uppercase">MODULAR SHADOW MONOLITH</span>
              </div>
            </div>
          </div>

          {/* Product Details & Purchase Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            <div className="space-y-3">
              <span className="font-mono text-[11px] text-[#B9B9B4] uppercase tracking-[0.2em] block">
                {flagship.category}
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
                {displayTitle}
              </h3>
              <p className="text-xs sm:text-sm text-[#B9B9B4] leading-relaxed font-normal pt-1">
                {description}
              </p>
            </div>

            {/* Option Selector: Finish */}
            {showProductOptions && flagship.finishes.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#242426]">
                <div className="flex justify-between items-center font-mono text-[11px] uppercase tracking-wider">
                  <span className="text-[#B9B9B4]">Finishing Texture</span>
                  <span className="text-white font-semibold">{selectedFinish}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {flagship.finishes.map((f) => {
                    const isSelected = selectedFinish === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setSelectedFinish(f)}
                        className={`font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 transition-all border ${
                          isSelected
                            ? "bg-white text-[#0B0B0C] border-white font-bold"
                            : "bg-[#151515] text-[#B9B9B4] border-[#242426] hover:border-white hover:text-white"
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Option Selector: Lighting Temp */}
            {showProductOptions && flagship.colors.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center font-mono text-[11px] uppercase tracking-wider">
                  <span className="text-[#B9B9B4]">Lighting Output</span>
                  <span className="text-[#C8FF35] font-semibold">{selectedColor}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {flagship.colors.map((c) => {
                    const isSelected = selectedColor === c;
                    return (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 transition-all border ${
                          isSelected
                            ? "bg-[#C8FF35] text-[#0B0B0C] border-[#C8FF35] font-bold"
                            : "bg-[#151515] text-[#B9B9B4] border-[#242426] hover:border-white hover:text-white"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price & Purchase Actions */}
            <div className="pt-6 border-t border-[#242426] space-y-5">
              {showPricing && (
                <div className="flex items-baseline justify-between font-mono">
                  <div>
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {siteSettings.currencySymbol}{flagship.price}
                    </span>
                    {flagship.compareAtPrice && (
                      <span className="text-xs text-[#B9B9B4] line-through ml-3">
                        {siteSettings.currencySymbol}{flagship.compareAtPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#C8FF35] tracking-widest uppercase">
                    {flagship.stock > 0 ? "[ IN STOCK — DISPATCH 48H ]" : "[ MADE TO ORDER ]"}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F3F0E9] text-[#0B0B0C] font-mono text-xs font-bold uppercase tracking-[0.2em] py-4 transition-all border border-white"
                >
                  <ShoppingBag className="w-4 h-4 stroke-[1.75]" />
                  <span>ADD TO CART</span>
                </button>

                <Link
                  href={ctaUrl}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#151515] hover:bg-[#242426] text-white font-mono text-xs font-medium uppercase tracking-[0.2em] py-4 transition-all border border-[#242426] hover:border-white"
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
