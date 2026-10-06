"use client";

import React from "react";
import Link from "next/link";
import { useStore } from "@/lib/storeContext";
import { HomepageSection } from "@/lib/types";
import { Upload, Palette, Cpu, Hammer, ArrowRight } from "lucide-react";

interface CustomSectionProps {
  section?: HomepageSection;
}

export default function CustomSection({ section }: CustomSectionProps) {
  const { siteSettings } = useStore();

  const title = section?.title || "Customize Your Object.";
  const subtitle = section?.subtitle || "PERSONALIZED LIGHTING STUDIO";
  const content =
    section?.content ||
    "Same object. Different stories. Make it yours. Upload a photo, silhouette, logo or memory — we transform your vision into a physical, illuminated centerpiece.";
  const mediaUrl =
    section?.mediaUrl ||
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop";

  const steps = [
    {
      number: "01",
      title: siteSettings.customizationStep1Title || "1. Upload & Input",
      desc: siteSettings.customizationStep1Desc || "Upload your high-res image, logo, silhouette, or enter custom names.",
      icon: Upload,
    },
    {
      number: "02",
      title: siteSettings.customizationStep2Title || "2. Algorithmic Slicing",
      desc: siteSettings.customizationStep2Desc || "Our studio translates vector paths into 3D light-refracting geometries.",
      icon: Palette,
    },
    {
      number: "03",
      title: siteSettings.customizationStep3Title || "3. Precision Printing",
      desc: siteSettings.customizationStep3Desc || "Crafted on multi-axis FDM & SLA printers using high-density organic biopolymers.",
      icon: Cpu,
    },
    {
      number: "04",
      title: siteSettings.customizationStep4Title || "4. Hand Finishing & QC",
      desc: siteSettings.customizationStep4Desc || "Inspected for optical clarity, electronics tested, packed in anti-static casing.",
      icon: Hammer,
    },
  ];

  return (
    <section id="customize" className="bg-[#151515] text-white py-20 lg:py-32 border-b border-[#242426]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35] block mb-2">
                {subtitle}
              </span>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-tight whitespace-pre-line">
                {title}
              </h2>
            </div>

            <p className="text-base text-[#B9B9B4] max-w-lg leading-relaxed">
              {content}
            </p>

            {/* 4 Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {steps.map((step) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.number}
                    className="p-4 rounded-xl bg-[#0B0B0C] border border-[#242426] hover:border-[#C8FF35]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-[#C8FF35]">
                        {step.number}
                      </span>
                      <IconComponent className="w-4 h-4 text-[#B9B9B4]" />
                    </div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                      {step.title}
                    </h4>
                    <p className="text-xs text-[#B9B9B4] leading-normal">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Action CTA */}
            <div className="pt-4">
              <Link
                href="/customize"
                className="inline-flex items-center gap-3 bg-[#C8FF35] hover:bg-white text-[#0B0B0C] font-bold px-8 py-4 rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-lg shadow-[#C8FF35]/15"
              >
                <span>Start Custom Studio Builder</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

          {/* Right Visual Frame */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden bg-[#0B0B0C] border border-[#242426] shadow-2xl p-2">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <img
                  src={mediaUrl}
                  alt={title}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-transparent to-transparent opacity-50" />
                
                {/* Visual Interface Overlay */}
                <div className="absolute top-4 right-4 bg-[#0B0B0C]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#242426] text-[10px] font-mono text-[#C8FF35] tracking-wider uppercase">
                  LIVE OPTIC PREVIEW
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
