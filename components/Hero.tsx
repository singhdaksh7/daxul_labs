"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomepageSection } from "@/lib/types";

interface HeroProps {
  section?: HomepageSection;
}

export default function Hero({ section }: HeroProps) {
  const badgeText = section?.badgeText || "DAXUL LABS STUDIO";
  const title = section?.title || "Objects\nmade\ndifferently.";
  const content =
    section?.content ||
    "Design-led light objects, projection lamps, customized monoliths, and minimal desk objects crafted on-demand in India.";
  const ctaText = section?.ctaText || "Explore Objects";
  const ctaUrl = section?.ctaUrl || "/shop";
  const secondaryCtaText = section?.secondaryCtaText || "Customize Yours";
  const secondaryCtaUrl = section?.secondaryCtaUrl || "/customize";
  const mediaUrl =
    section?.mediaUrl ||
    "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop";

  return (
    <section className="relative bg-[#0B0B0C] text-white pt-12 lg:pt-20 pb-20 lg:pb-28 overflow-hidden border-b border-[#242426]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Copy */}
          <div className="lg:col-span-6 space-y-8">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151515] border border-[#242426] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B9B9B4]">
              <span className="w-2 h-2 rounded-full bg-[#C8FF35]" />
              <span>{badgeText}</span>
            </div>

            {/* Headline - Exact Line Breaks & Line-Height */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.92] text-white select-none whitespace-pre-line">
              {title}
            </h1>

            {/* Paragraph copy */}
            <p className="text-sm sm:text-base text-[#B9B9B4] max-w-lg leading-relaxed font-normal">
              {content}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={ctaUrl}
                className="group inline-flex items-center gap-3 bg-[#C8FF35] hover:bg-white text-[#0B0B0C] font-extrabold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-[#C8FF35]/10"
              >
                <span>{ctaText}</span>
                <span className="w-6 h-6 rounded-full bg-[#0B0B0C] text-[#C8FF35] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              <Link
                href={secondaryCtaUrl}
                className="inline-flex items-center gap-2 bg-[#151515] hover:bg-[#242426] text-white hover:text-[#C8FF35] border border-[#242426] font-semibold px-7 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all duration-300"
              >
                <span>{secondaryCtaText}</span>
              </Link>
            </div>

            {/* Brand Proof Pills */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#242426] max-w-md text-[11px] text-[#B9B9B4] font-medium uppercase tracking-wider">
              <div>
                <span className="block text-white font-bold text-xs">IN-HOUSE</span>
                <span>Designed Studio</span>
              </div>
              <div>
                <span className="block text-white font-bold text-xs">ON-DEMAND</span>
                <span>Crafted in India</span>
              </div>
              <div>
                <span className="block text-white font-bold text-xs">PRECISION</span>
                <span>Additive Build</span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Media Showcase */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none group">
              <div className="relative rounded-2xl overflow-hidden bg-[#151515] border border-[#242426] shadow-2xl transition-all duration-500">
                <img
                  src={mediaUrl}
                  alt="DAXUL LABS Flagship Object"
                  className="w-full h-[420px] sm:h-[500px] object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-transparent to-transparent opacity-70" />

                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] tracking-[0.3em] text-[#C8FF35] font-mono font-semibold uppercase block mb-1">
                      FLAGSHIP OBJECT 01
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                      DAXUL SHADOW 01
                    </h3>
                  </div>

                  <span className="text-xs tracking-widest text-[#B9B9B4] font-mono bg-[#0B0B0C]/80 backdrop-blur px-3 py-1.5 rounded border border-[#242426]">
                    SERIES 2026
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
