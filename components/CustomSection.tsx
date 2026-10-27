"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";

interface CustomSectionProps {
  section?: HomepageSection;
}

export default function CustomSection({ section }: CustomSectionProps) {
  const { customization: cmsCustom } = useCms();

  const label = "CUSTOM OBJECTS";
  const headline = cmsCustom?.headline || "Make it yours.";
  const supportingCopy =
    cmsCustom?.supportingCopy ||
    "Upload a photo, name, silhouette or idea. We'll turn it into an object made for you.";
  const ctaLabel = cmsCustom?.ctaLabel || "START CUSTOMIZING";
  const ctaUrl = cmsCustom?.ctaUrl || "/customize";
  
  const defaultSteps = [
    { num: "01", title: "Upload", desc: "Share a portrait, silhouette, or concept" },
    { num: "02", title: "Customize", desc: "Select finish, light output, and base text" },
    { num: "03", title: "Review", desc: "We convert your input into 3D geometry proof" },
    { num: "04", title: "Order", desc: "Precision printed and hand-finished in India" },
  ];

  const steps =
    cmsCustom?.steps && cmsCustom.steps.length > 0
      ? cmsCustom.steps.map((s, idx) => ({
          num: s.num || `0${idx + 1}`,
          title: s.title,
          desc: s.desc,
        }))
      : defaultSteps;

  const mediaConfig = cmsCustom?.media;
  const fallbackUrl =
    section?.mediaUrl ||
    "/images/custom_preview.jpg";

  return (
    <section id="custom-objects" className="bg-daxul-bone text-daxul-black py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Large lifestyle / product image */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-square bg-[#EAE5DA] border border-daxul-black/10 rounded-xl overflow-hidden order-2 lg:order-1">
            <CmsMediaDisplay
              media={mediaConfig}
              fallbackUrl={fallbackUrl}
              fallbackAlt="Custom Object Preview"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Right Column: Custom label, Heading, Copy, CTA, 4 Steps */}
          <div className="flex flex-col justify-center space-y-6 order-1 lg:order-2">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block">
              {label}
            </span>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-daxul-black uppercase leading-tight">
              {headline}
            </h2>

            <p className="text-base sm:text-lg text-[#555550] leading-relaxed max-w-lg">
              {supportingCopy}
            </p>

            <div className="pt-1">
              <Link
                href={ctaUrl}
                className="inline-flex items-center justify-center bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-semibold text-xs tracking-[0.16em] uppercase px-7 py-4 border border-daxul-black transition-colors daxul-btn"
              >
                {ctaLabel}
              </Link>
            </div>

            {/* 4 Steps Below */}
            <div className="grid grid-cols-2 gap-5 pt-6 border-t border-daxul-black/10">
              {steps.map((st) => (
                <div key={st.num + st.title} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-daxul-black">
                      {st.num}
                    </span>
                    <h3 className="text-sm font-bold uppercase tracking-tight text-daxul-black">
                      {st.title}
                    </h3>
                  </div>
                  {st.desc && (
                    <p className="text-xs text-[#71717A] leading-relaxed">
                      {st.desc}
                    </p>
                  )}
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
