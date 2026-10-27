"use client";

import React from "react";
import Link from "next/link";
import { CustomizationSectionContent } from "@/lib/cms/pageTypes";

export default function CustomizationSection({ content }: { content: CustomizationSectionContent }) {
  if (!content) return null;

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 space-y-4">
          <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-[#71717A] uppercase font-semibold">
            Bespoke Objects
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">
            {content.headline}
          </h2>
          {content.supportingCopy && (
            <p className="text-sm sm:text-base leading-relaxed text-[#555550]">
              {content.supportingCopy}
            </p>
          )}
        </div>

        {/* Steps Grid */}
        {content.steps && content.steps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12">
            {content.steps.map((step, idx) => (
              <div
                key={step.id || idx}
                className="bg-[#ECE8E0] p-6 sm:p-8 border border-daxul-black/10 flex flex-col justify-between"
              >
                <div>
                  <div className="font-mono text-2xl font-bold text-daxul-black mb-3">
                    {step.num || `0${idx + 1}`}
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-wide text-daxul-black mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#555550] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {content.ctaLabel && content.ctaUrl && (
          <div className="text-center">
            <Link
              href={content.ctaUrl}
              className="inline-block bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 hover:bg-[#b8eb2f] transition-colors"
            >
              {content.ctaLabel}
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
