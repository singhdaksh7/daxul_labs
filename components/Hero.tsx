"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";

interface HeroProps {
  section?: HomepageSection;
}

export default function Hero({ section }: HeroProps) {
  const { hero } = useCms();

  const eyebrow = hero?.eyebrow || section?.badgeText || "01 / STUDIO EXHIBIT";
  const line1 = hero?.headlineLine1 || "OBJECTS";
  const line2 = hero?.headlineLine2 || "MADE";
  const line3 = hero?.headlineLine3 || "DIFFERENTLY.";
  const supportingCopy =
    hero?.supportingCopy ||
    section?.content ||
    "Experimental objects, lighting and personalized design. Made in India.";
  const primaryCtaLabel = hero?.primaryCtaLabel || section?.ctaText || "EXPLORE OBJECTS";
  const primaryCtaUrl = hero?.primaryCtaUrl || section?.ctaUrl || "/shop";
  const secondaryCtaLabel = hero?.secondaryCtaLabel || section?.secondaryCtaText || "CREATE YOURS";
  const secondaryCtaUrl = hero?.secondaryCtaUrl || section?.secondaryCtaUrl || "/customize";
  const mediaConfig = hero?.media;
  const fallbackUrl =
    section?.mediaUrl ||
    "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop";

  return (
    <section className="relative bg-daxul-black text-white pt-8 sm:pt-14 pb-16 sm:pb-24 border-b border-daxul-graphite overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Top Industrial Micro Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-daxul-graphite/60 font-mono text-[10px] tracking-[0.25em] text-daxul-gray uppercase">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-daxul-lime" />
            <span>{eyebrow}</span>
          </div>
          <div className="hidden sm:block">
            <span>DAXUL LABS — EST. 2026</span>
          </div>
          <div>
            <span>[ IN-HOUSE ADDITIVE BUILD ]</span>
          </div>
        </div>

        {/* Hero Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          
          {/* Left Column: Typography & CTAs (6 Cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              
              {/* Oversized Editorial Headline */}
              <h1 className="text-5xl sm:text-7xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter leading-[0.88] text-white select-none break-words">
                {line1}
                <br />
                {line2}
                <br />
                {line3}
              </h1>

              {/* Supporting Line */}
              <p className="text-sm sm:text-base text-daxul-gray max-w-md font-normal leading-relaxed tracking-wide pt-2">
                {supportingCopy}
              </p>
            </div>

            {/* CTAs & Metadata Grid */}
            <div className="space-y-8 pt-2">
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={primaryCtaUrl}
                  className="group inline-flex items-center gap-3 bg-white hover:bg-daxul-bone text-daxul-black font-mono text-xs font-bold tracking-[0.2em] uppercase px-7 py-4 transition-all duration-200 border border-white"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <Link
                  href={secondaryCtaUrl}
                  className="inline-flex items-center gap-2 bg-transparent hover:bg-daxul-dark text-white font-mono text-xs font-medium tracking-[0.2em] uppercase px-7 py-4 transition-all duration-200 border border-daxul-graphite hover:border-white"
                >
                  <span>{secondaryCtaLabel}</span>
                </Link>
              </div>

              {/* Minimalist Specs Footer */}
              <div className="pt-6 border-t border-daxul-graphite grid grid-cols-3 gap-4 font-mono text-[10px] text-daxul-gray uppercase tracking-widest">
                <div>
                  <span className="block text-white font-semibold mb-0.5">PROCESS</span>
                  <span>Additive Precision</span>
                </div>
                <div>
                  <span className="block text-white font-semibold mb-0.5">ORIGIN</span>
                  <span>Crafted in India</span>
                </div>
                <div>
                  <span className="block text-white font-semibold mb-0.5">BATCH</span>
                  <span>On-Demand Series</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: ONE Large Cinematic Product Visual (6 Cols) */}
          <div className="lg:col-span-6 relative flex flex-col">
            <div className="relative flex-1 w-full min-h-[380px] sm:min-h-[500px] lg:min-h-[560px] bg-daxul-dark border border-daxul-graphite overflow-hidden group">
              <CmsMediaDisplay
                media={mediaConfig}
                fallbackUrl={fallbackUrl}
                fallbackAlt="DAXUL LABS Flagship Display"
                className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />

              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-daxul-black via-transparent to-transparent opacity-50 pointer-events-none" />

              {/* Bottom Editorial Caption */}
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between font-mono text-xs pointer-events-none">
                <div className="bg-daxul-black/90 backdrop-blur-sm px-4 py-2.5 border border-daxul-graphite">
                  <span className="text-[10px] text-daxul-gray tracking-[0.25em] uppercase block">
                    [ FLAGSHIP DISPLAY ]
                  </span>
                  <span className="font-sans text-sm font-semibold text-white tracking-wide">
                    DAXUL SHADOW 01
                  </span>
                </div>

                <div className="hidden sm:block bg-daxul-black/90 backdrop-blur-sm px-3.5 py-2 border border-daxul-graphite text-[10px] text-daxul-gray tracking-widest uppercase">
                  SERIES 2026
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
