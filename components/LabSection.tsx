"use client";

import React from "react";
import Link from "next/link";
import { HomepageSection } from "@/lib/types";
import { ArrowUpRight, FlaskConical, ShieldAlert } from "lucide-react";

interface LabSectionProps {
  section?: HomepageSection;
}

export default function LabSection({ section }: LabSectionProps) {
  const title = section?.title || "Inside DAXUL LAB.";
  const subtitle = section?.subtitle || "MATERIALS & COMPUTATIONAL PROCESS";
  const badgeText = section?.badgeText || "R&D DISPATCH";
  const content =
    section?.content ||
    "We experiment with gyroid infill density, flexible TPU kinetics, organic PETG bio-polymers, and multi-axis dual-material extrusion.";
  const ctaText = section?.ctaText || "Enter The Lab";
  const ctaUrl = section?.ctaUrl || "/lab";
  const mediaUrl =
    section?.mediaUrl ||
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop";

  return (
    <section id="lab" className="bg-[#0B0B0C] text-white py-20 lg:py-32 border-b border-[#242426] relative overflow-hidden">
      
      {/* Background Subtle Accent Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#242426_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="rounded-3xl bg-[#151515] border border-[#242426] p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Text Side */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C8FF35]/10 border border-[#C8FF35]/30 text-[11px] font-mono uppercase tracking-[0.25em] text-[#C8FF35]">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>{badgeText}</span>
              </div>

              <h2 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-none">
                {title}
              </h2>

              <p className="text-lg sm:text-xl font-medium text-white max-w-xl leading-relaxed">
                {subtitle}
              </p>

              <p className="text-xs sm:text-sm text-[#B9B9B4] max-w-md">
                {content}
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-3 bg-[#C8FF35] hover:bg-white text-[#0B0B0C] font-bold px-8 py-4 rounded-full text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-[#C8FF35]/20"
                >
                  <span>{ctaText}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>

                <span className="text-xs font-mono text-[#B9B9B4] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#C8FF35]" />
                  <span>BATCH 01: 50 UNITS ONLY</span>
                </span>
              </div>

            </div>

            {/* Visual Frame */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0B0B0C] border border-[#242426]">
                <img
                  src={mediaUrl}
                  alt={title}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-transparent to-transparent opacity-40" />
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
