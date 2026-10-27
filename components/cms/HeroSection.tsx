"use client";

import React from "react";
import Link from "next/link";
import { HeroSectionContent } from "@/lib/cms/pageTypes";

export default function HeroSection({ content }: { content: HeroSectionContent }) {
  if (!content) return null;

  const alignClass =
    content.textAlignment === "left"
      ? "text-left items-start"
      : content.textAlignment === "right"
      ? "text-right items-end"
      : "text-center items-center";

  const hasMedia = !!(content.desktopImage || content.videoUrl);

  return (
    <section className="relative w-full bg-daxul-bone border-b border-daxul-black/10 overflow-hidden">
      {hasMedia && (
        <div className="absolute inset-0 z-0 select-none">
          {content.videoUrl ? (
            <video
              src={content.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <picture>
              {content.mobileImage && (
                <source media="(max-width: 640px)" srcSet={content.mobileImage} />
              )}
              <img
                src={content.desktopImage}
                alt={content.heading || "Hero"}
                className="w-full h-full object-cover"
              />
            </picture>
          )}
          {content.overlay !== false && (
            <div className="absolute inset-0 bg-daxul-black/30" />
          )}
        </div>
      )}

      <div
        className={`relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-24 sm:py-32 lg:py-40 flex flex-col ${alignClass} ${
          hasMedia ? "text-white" : "text-daxul-black"
        }`}
      >
        {content.eyebrow && (
          <div
            className={`font-mono text-[11px] sm:text-xs tracking-[0.25em] uppercase font-semibold mb-4 sm:mb-6 ${
              hasMedia ? "text-white/80" : "text-[#71717A]"
            }`}
          >
            {content.eyebrow}
          </div>
        )}

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight uppercase leading-[1.05] max-w-4xl">
          {content.heading}
        </h1>

        {content.subheading && (
          <p
            className={`mt-4 sm:mt-6 text-lg sm:text-2xl font-light max-w-2xl ${
              hasMedia ? "text-white/90" : "text-daxul-black/80"
            }`}
          >
            {content.subheading}
          </p>
        )}

        {content.body && (
          <p
            className={`mt-3 text-sm sm:text-base max-w-xl leading-relaxed ${
              hasMedia ? "text-white/70" : "text-[#555550]"
            }`}
          >
            {content.body}
          </p>
        )}

        {(content.cta1Label || content.cta2Label) && (
          <div className="mt-8 sm:mt-10 flex flex-wrap gap-4 items-center">
            {content.cta1Label && content.cta1Link && (
              <Link
                href={content.cta1Link}
                className="bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 hover:bg-[#b8eb2f] transition-colors border border-transparent shadow-none"
              >
                {content.cta1Label}
              </Link>
            )}
            {content.cta2Label && content.cta2Link && (
              <Link
                href={content.cta2Link}
                className={`font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 transition-colors border ${
                  hasMedia
                    ? "bg-transparent text-white border-white/30 hover:border-white hover:bg-white/10"
                    : "bg-transparent text-daxul-black border-daxul-black/20 hover:border-daxul-black hover:bg-daxul-black/5"
                }`}
              >
                {content.cta2Label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
