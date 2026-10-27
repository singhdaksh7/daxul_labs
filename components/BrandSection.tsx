"use client";

import React from "react";
import { useSiteSettings } from "@/lib/siteContext";

export default function BrandSection() {
  const siteSettings = useSiteSettings();

  return (
    <section id="brand-statement" className="bg-daxul-bone text-daxul-black py-20 sm:py-28 border-b border-daxul-black/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#71717A] block">
          {siteSettings.brandName || "DAXUL LABS"}
        </span>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase text-daxul-black leading-tight">
          Objects made differently.
        </h2>

        <p className="text-sm sm:text-base font-semibold uppercase tracking-wider text-daxul-black">
          Designed and made in India.
        </p>

        {siteSettings.brandDescription && (
          <p className="text-xs sm:text-sm text-[#71717A] max-w-xl mx-auto leading-relaxed pt-2">
            {siteSettings.brandDescription}
          </p>
        )}
      </div>
    </section>
  );
}
