"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";

interface CustomSectionProps {
  section?: HomepageSection;
}

export default function CustomSection({ section }: CustomSectionProps) {
  const { customization: cmsCustom } = useCms();

  const headline = cmsCustom?.headline || "MAKE IT YOURS.";
  const supportingCopy =
    cmsCustom?.supportingCopy ||
    "Upload a photo, silhouette, logo or idea. We turn it into a physical object.";
  const ctaLabel = cmsCustom?.ctaLabel || "START CUSTOMIZING";
  const ctaUrl = cmsCustom?.ctaUrl || "/customize";
  const steps = cmsCustom?.steps || [];
  const mediaConfig = cmsCustom?.media;
  const fallbackUrl =
    section?.mediaUrl ||
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop";

  return (
    <section id="customize" className="bg-[#0B0B0C] text-white py-20 lg:py-32 border-b border-[#242426]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 mb-12 border-b border-[#242426]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#B9B9B4] uppercase mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#C8FF35]" />
              <span>04 / BESPOKE STUDIO</span>
            </div>
            <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.88] text-white">
              {headline}
            </h2>
            <p className="text-sm sm:text-base text-[#B9B9B4] max-w-xl font-normal leading-relaxed mt-3">
              {supportingCopy}
            </p>
          </div>

          <Link
            href={ctaUrl}
            className="mt-6 md:mt-0 inline-flex items-center gap-3 bg-white hover:bg-[#F3F0E9] text-[#0B0B0C] font-mono text-xs font-bold uppercase tracking-[0.2em] px-7 py-4 transition-all border border-white shrink-0"
          >
            <span>{ctaLabel}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Editorial Layout: Dynamic Steps Flow + Large Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Editorial Vertical Dynamic Steps Flow (6 Cols) */}
          <div className="lg:col-span-6 space-y-0 divide-y divide-[#242426] border-y border-[#242426]">
            {steps.map((step) => (
              <div
                key={step.id || step.num + step.title}
                className="py-5 sm:py-6 flex items-start justify-between gap-6 group hover:bg-[#151515]/50 transition-colors px-2"
              >
                <div className="flex items-start gap-5 sm:gap-8">
                  <span className="font-mono text-xs font-bold text-[#C8FF35] tracking-widest pt-0.5">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#B9B9B4] leading-relaxed font-normal mt-1 max-w-md">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* One Large Editorial Image Visual (6 Cols) */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] w-full bg-[#151515] border border-[#242426] overflow-hidden group">
              <CmsMediaDisplay
                media={mediaConfig}
                fallbackUrl={fallbackUrl}
                fallbackAlt="Custom Monolith Proof"
                className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
              
              <div className="absolute bottom-6 left-6 font-mono text-xs text-[#B9B9B4] bg-[#0B0B0C]/90 backdrop-blur-sm px-4 py-2 border border-[#242426]">
                <span className="block text-white font-semibold">CUSTOM MONOLITH PROOF</span>
                <span className="text-[10px] text-[#B9B9B4] tracking-wider uppercase">DUAL PERSPECTIVE VECTOR</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
