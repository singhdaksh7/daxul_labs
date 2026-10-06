"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/storeContext";
import { HomepageSection } from "@/lib/types";
import { Sparkles, Check, ArrowRight, Sliders, ShoppingBag } from "lucide-react";

interface FeaturedProductProps {
  section?: HomepageSection;
}

export default function FeaturedProduct({ section }: FeaturedProductProps) {
  const { products, addToCart, siteSettings } = useStore();
  const flagship = products.find((p) => p.isFeatured || p.badge === "Flagship Object") || products[0];

  const [selectedFinish, setSelectedFinish] = useState(flagship?.finishes[0] || "Matte Charcoal");
  const [selectedColor, setSelectedColor] = useState(flagship?.colors[0] || "Warm Gold LED (2700K)");
  const [selectedSize, setSelectedSize] = useState(flagship?.sizes[0] || "Standard (220mm)");

  if (!flagship) return null;

  const title = section?.title || "Flagship Object: Aethel Shadow Lamp";
  const subtitle = section?.subtitle || "OPTICAL DIFFRACTION MONOLITH";
  const badgeText = section?.badgeText || "FEATURED DESIGN";
  const content = section?.content || flagship.description;
  const mediaUrl = section?.mediaUrl || flagship.images[0];

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
    <section id="featured-shadow" className="bg-[#0B0B0C] text-white py-20 lg:py-32 border-b border-[#242426]/50 relative overflow-hidden">
      
      {/* Background Lighting */}
      <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-[#C8FF35]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-[#242426]">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-[#C8FF35] mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{badgeText}</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-tight">
              {title}
            </h2>
          </div>

          <div className="mt-4 md:mt-0 font-mono text-xs text-[#B9B9B4]">
            [ MODEL: {flagship.slug.toUpperCase()} ]
          </div>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Visual Showcase (7 Cols) */}
          <div className="lg:col-span-7 relative group">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#151515] border border-[#242426] shadow-2xl">
              <img
                src={mediaUrl}
                alt={flagship.name}
                className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-transparent to-transparent opacity-60" />
              
              {/* Product Badge */}
              <div className="absolute bottom-6 left-6 bg-[#0B0B0C]/80 backdrop-blur-md px-4 py-2 rounded-lg border border-[#242426]">
                <span className="text-[11px] font-mono tracking-widest text-[#B9B9B4] uppercase block">
                  {subtitle}
                </span>
                <span className="text-sm font-bold text-white">
                  {flagship.name}
                </span>
              </div>
            </div>
          </div>

          {/* Product Details & Options (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div>
              <span className="text-xs font-semibold text-[#B9B9B4] uppercase tracking-widest block mb-1">
                {flagship.category}
              </span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight mb-3">
                {flagship.name}
              </h3>
              <p className="text-sm text-[#B9B9B4] leading-relaxed">
                {content}
              </p>
            </div>

            {/* Finish Selection */}
            {flagship.finishes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#242426]">
                <label className="text-xs font-bold uppercase tracking-wider text-white flex justify-between">
                  <span>Finish:</span>
                  <span className="text-[#C8FF35]">{selectedFinish}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {flagship.finishes.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFinish(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                        selectedFinish === f
                          ? "bg-[#C8FF35] text-[#0B0B0C] font-extrabold"
                          : "bg-[#151515] text-gray-300 border border-[#242426] hover:border-gray-500"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Light / Color Selection */}
            {flagship.colors.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white flex justify-between">
                  <span>Lighting Temp:</span>
                  <span className="text-[#C8FF35]">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {flagship.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedColor === c
                          ? "bg-[#C8FF35] text-[#0B0B0C] font-extrabold"
                          : "bg-[#151515] text-gray-300 border border-[#242426] hover:border-gray-500"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price & CTA Buttons */}
            <div className="pt-6 border-t border-[#242426] space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-white">
                    {siteSettings.currencySymbol}{flagship.price}
                  </span>
                  {flagship.compareAtPrice && (
                    <span className="text-sm text-gray-500 line-through ml-2">
                      {siteSettings.currencySymbol}{flagship.compareAtPrice}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-[#C8FF35] bg-[#C8FF35]/10 px-2.5 py-1 rounded">
                  {flagship.stock > 0 ? "IN STOCK" : "MADE TO ORDER"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#C8FF35] hover:bg-white text-[#0B0B0C] font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-[#C8FF35]/10"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add To Cart</span>
                </button>

                <Link
                  href={`/shop/${flagship.slug}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#151515] hover:bg-[#242426] text-white border border-[#242426] hover:border-[#C8FF35] font-semibold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all duration-300"
                >
                  <Sliders className="w-4 h-4 text-[#C8FF35]" />
                  <span>Configure Custom</span>
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
