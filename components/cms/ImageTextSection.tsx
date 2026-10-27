"use client";

import React from "react";
import Link from "next/link";
import { ImageTextSectionContent } from "@/lib/cms/pageTypes";
import { SafeMarkdown } from "@/lib/safeMarkdown";

export default function ImageTextSection({ content }: { content: ImageTextSectionContent }) {
  if (!content) return null;

  const isImageLeft = content.imagePosition === "left";

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${isImageLeft ? "" : "lg:flex-row-reverse"}`}>
          
          {/* Media Column */}
          <div className={`relative w-full aspect-[4/3] bg-[#E5E1D8] overflow-hidden ${isImageLeft ? "lg:order-1" : "lg:order-2"}`}>
            {content.image ? (
              <img
                src={content.image}
                alt={content.imageAlt || content.heading}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-xs uppercase tracking-widest text-[#71717A]">
                Image Placement
              </div>
            )}
          </div>

          {/* Text Column */}
          <div className={`flex flex-col justify-center space-y-6 ${isImageLeft ? "lg:order-2" : "lg:order-1"}`}>
            {content.eyebrow && (
              <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-[#71717A] uppercase font-semibold">
                {content.eyebrow}
              </div>
            )}

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-daxul-black leading-tight">
              {content.heading}
            </h2>

            {content.description && (
              <div className="text-sm sm:text-base leading-relaxed text-[#555550]">
                <SafeMarkdown source={content.description} />
              </div>
            )}

            {(content.ctaLabel || content.secondaryCtaLabel) && (
              <div className="pt-2 flex flex-wrap gap-4 items-center">
                {content.ctaLabel && content.ctaLink && (
                  <Link
                    href={content.ctaLink}
                    className="bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 hover:bg-[#b8eb2f] transition-colors border border-transparent shadow-none"
                  >
                    {content.ctaLabel}
                  </Link>
                )}
                {content.secondaryCtaLabel && content.secondaryCtaLink && (
                  <Link
                    href={content.secondaryCtaLink}
                    className="bg-transparent text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 border border-daxul-black/20 hover:border-daxul-black hover:bg-daxul-black/5 transition-colors"
                  >
                    {content.secondaryCtaLabel}
                  </Link>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
