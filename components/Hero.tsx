"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";

interface HeroProps {
  section?: HomepageSection;
}

export default function Hero({ section }: HeroProps) {
  const { hero } = useCms();

  const eyebrow = hero?.eyebrow || section?.badgeText || "OBJECTS MADE DIFFERENTLY";
  
  // Assemble heading from CMS parts or defaults
  const headline =
    [hero?.headlineLine1, hero?.headlineLine2, hero?.headlineLine3].filter(Boolean).join(" ") ||
    section?.title ||
    "OBJECTS MADE DIFFERENTLY.";

  const supportingCopy =
    hero?.supportingCopy ||
    section?.content ||
    "Custom objects, lighting and things worth keeping.";

  const primaryCtaLabel = hero?.primaryCtaLabel || section?.ctaText || "SHOP OBJECTS";
  const primaryCtaUrl = hero?.primaryCtaUrl || section?.ctaUrl || "/shop";
  const secondaryCtaLabel = hero?.secondaryCtaLabel || section?.secondaryCtaText || "CREATE YOURS";
  const secondaryCtaUrl = hero?.secondaryCtaUrl || section?.secondaryCtaUrl || "/customize";
  const mediaConfig = hero?.media;
  const fallbackUrl =
    section?.mediaUrl ||
    "/images/hero_shadow_lamp.jpg";

  return (
    <section className="bg-daxul-bone text-daxul-black py-16 sm:py-24 lg:py-28 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Eyebrow, Heading, Description, CTAs */}
          <div className="flex flex-col justify-center space-y-6">
            {eyebrow && (
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block">
                {eyebrow}
              </span>
            )}

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-daxul-black leading-[1.05] uppercase">
              {headline}
            </h1>

            <p className="text-base sm:text-lg text-[#555550] leading-relaxed max-w-lg">
              {supportingCopy}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={primaryCtaUrl}
                className="inline-flex items-center justify-center bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-semibold text-xs tracking-[0.16em] uppercase px-7 py-4 border border-daxul-black transition-colors daxul-btn"
              >
                {primaryCtaLabel}
              </Link>

              <Link
                href={secondaryCtaUrl}
                className="inline-flex items-center justify-center bg-transparent hover:bg-daxul-black/5 text-daxul-black font-semibold text-xs tracking-[0.16em] uppercase px-7 py-4 border border-daxul-black/30 hover:border-daxul-black transition-colors daxul-btn"
              >
                {secondaryCtaLabel}
              </Link>
            </div>
          </div>

          {/* Right Column: ONE large high-quality product visual (no clutter/overlays) */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-square bg-[#EAE5DA] border border-daxul-black/10 rounded-xl overflow-hidden">
            <CmsMediaDisplay
              media={mediaConfig}
              fallbackUrl={fallbackUrl}
              fallbackAlt="DAXUL LABS Flagship Object"
              className="w-full h-full object-cover object-center"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
