"use client";

import React from "react";
import { TextSectionContent } from "@/lib/cms/pageTypes";
import { SafeMarkdown } from "@/lib/safeMarkdown";

export default function TextSection({ content }: { content: TextSectionContent }) {
  if (!content) return null;

  const maxWidthClass =
    content.maxWidth === "sm"
      ? "max-w-xl"
      : content.maxWidth === "lg"
      ? "max-w-4xl"
      : content.maxWidth === "full"
      ? "max-w-[1440px]"
      : "max-w-2xl";

  const alignClass =
    content.align === "left"
      ? "text-left items-start"
      : content.align === "right"
      ? "text-right items-end"
      : "text-center items-center";

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className={`mx-auto px-4 sm:px-6 lg:px-10 flex flex-col ${alignClass} ${maxWidthClass}`}>
        {content.eyebrow && (
          <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-[#71717A] uppercase font-semibold mb-3">
            {content.eyebrow}
          </div>
        )}

        {content.heading && (
          <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black mb-6">
            {content.heading}
          </h2>
        )}

        {content.body && (
          <div className="text-sm sm:text-base leading-relaxed text-[#555550] w-full">
            <SafeMarkdown source={content.body} />
          </div>
        )}
      </div>
    </section>
  );
}
