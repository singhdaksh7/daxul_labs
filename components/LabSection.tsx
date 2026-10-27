"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";

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
  const badgeText = cmsLab?.badgeText || "R&D DISPATCH";
  const mediaConfig = cmsLab?.media;
  const fallbackUrl =
    section?.mediaUrl ||
    "/images/collection_lab.jpg";

  return (
    <section id="lab" className="bg-daxul-bone text-daxul-black py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="bg-[#EAE5DA] border border-daxul-black/10 rounded-xl p-8 sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block mb-2">
                  {badgeText}
                </span>
                
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase text-daxul-black">
                  {heading}
                </h2>
              </div>

              <p className="text-base sm:text-lg text-[#555550] max-w-xl leading-relaxed">
                {copy}
              </p>

              <div className="pt-2">
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center justify-center bg-daxul-black hover:bg-daxul-black/85 text-daxul-bone font-semibold text-xs tracking-[0.16em] uppercase px-7 py-4 rounded-lg transition-colors"
                >
                  <span>{ctaLabel}</span>
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>

            {/* Right Visual */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square w-full bg-daxul-bone border border-daxul-black/10 rounded-xl overflow-hidden">
                <CmsMediaDisplay
                  media={mediaConfig}
                  fallbackUrl={fallbackUrl}
                  fallbackAlt={heading}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
