"use client";

import React from "react";
import Link from "next/link";
import { FeaturedProductSectionContent } from "@/lib/cms/pageTypes";
import { formatMoney } from "@/lib/cartPricing";
import { useSiteSettings } from "@/lib/siteContext";
import type { StoreProduct } from "@/lib/types";

export default function FeaturedProductSection({
  content,
  product,
}: {
  content: FeaturedProductSectionContent;
  product?: StoreProduct | null;
}) {
  const settings = useSiteSettings();
  if (!content) return null;

  const title = content.overrideHeadline || product?.name || "Featured Studio Object";
  const desc = content.overrideDescription || product?.description || "A bespoke spatial fixture designed and crafted in our studio.";
  const image = content.mediaOverride || product?.images?.[0] || "/images/hero-default.webp";
  const slug = product?.slug || "featured";
  const ctaUrl = content.ctaLink || `/shop/${slug}`;
  const ctaLabel = content.ctaLabel || "VIEW OBJECT";

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Image */}
          <Link href={ctaUrl} className="relative aspect-square bg-[#ECE8E0] overflow-hidden border border-daxul-black/10 group block">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </Link>

          {/* Details */}
          <div className="space-y-6">
            {content.badge && (
              <span className="inline-block font-mono text-[10px] sm:text-xs tracking-[0.25em] uppercase px-3 py-1 bg-daxul-graphite text-daxul-lime">
                {content.badge}
              </span>
            )}

            <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black leading-tight">
              {title}
            </h2>

            {product && (
              <div className="text-xl font-bold text-daxul-black">
                {formatMoney(settings.currencySymbol, product.price)}
              </div>
            )}

            <p className="text-sm sm:text-base leading-relaxed text-[#555550] max-w-xl">
              {desc}
            </p>

            <div className="pt-2">
              <Link
                href={ctaUrl}
                className="inline-block bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 hover:bg-[#b8eb2f] transition-colors"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
