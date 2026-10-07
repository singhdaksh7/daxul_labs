"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";

interface LabSectionProps {
  section?: HomepageSection;
}

export default function LabSection({ section }: LabSectionProps) {
  const { lab: cmsLab } = useCms();

  const heading = cmsLab?.heading || "DAXUL LAB";
  const copy =
    cmsLab?.copy ||
    "Experiments. Prototypes. Things that probably shouldn't exist — until they do.";
  const ctaLabel = cmsLab?.ctaLabel || "ENTER THE LAB";
  const ctaUrl = cmsLab?.ctaUrl || "/lab";
  const badgeText = cmsLab?.badgeText || "05 / R&D DISPATCH";
  const mediaConfig = cmsLab?.media;
  const fallbackUrl =
    section?.mediaUrl ||
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop";

  return (
    <section id="lab" className="bg-daxul-black text-white py-20 lg:py-32 border-b border-daxul-graphite">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Black Editorial Container */}
        <div className="bg-daxul-dark border border-daxul-graphite p-8 sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-daxul-gray uppercase mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-daxul-lime" />
                  <span>{badgeText}</span>
                </div>
                
                <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.88] text-white">
                  {heading}
                </h2>
              </div>

              <p className="text-base sm:text-xl text-daxul-gray max-w-xl font-normal leading-relaxed tracking-wide">
                {copy}
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-6">
                <Link
                  href={ctaUrl}
                  className="group inline-flex items-center gap-3 bg-white hover:bg-daxul-bone text-daxul-black font-mono text-xs font-bold tracking-[0.2em] uppercase px-7 py-4 transition-all border border-white"
                >
                  <span>{ctaLabel}</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <span className="font-mono text-[11px] text-daxul-gray uppercase tracking-widest">
                  [ EXPERIMENTAL BATCH 01 ]
                </span>
              </div>
            </div>

            {/* Right Visual Frame: One Large Experimental Visual (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square w-full bg-daxul-black border border-daxul-graphite overflow-hidden group">
                <CmsMediaDisplay
                  media={mediaConfig}
                  fallbackUrl={fallbackUrl}
                  fallbackAlt={heading}
                  className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
                
                <div className="absolute bottom-4 left-4 font-mono text-[10px] text-daxul-lime bg-daxul-black/90 backdrop-blur-sm px-3 py-1 border border-daxul-graphite tracking-widest uppercase">
                  LIMITED KINETIC RUN
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
