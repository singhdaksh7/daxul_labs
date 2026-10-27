"use client";

import React from "react";
import { BrandStatementSectionContent } from "@/lib/cms/pageTypes";

export default function BrandStatementSection({ content }: { content: BrandStatementSectionContent }) {
  if (!content) return null;

  return (
    <section className="w-full bg-[#0B0B0C] text-white py-20 sm:py-28 px-4 sm:px-6 lg:px-10 border-b border-[#242426]">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {content.accentTag && (
          <div className="inline-block font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase px-3 py-1 bg-[#242426] text-daxul-lime">
            {content.accentTag}
          </div>
        )}

        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight uppercase leading-tight">
          "{content.headline}"
        </h2>

        {content.paragraph && (
          <p className="text-sm sm:text-base leading-relaxed text-[#B9B9B4] max-w-2xl mx-auto">
            {content.paragraph}
          </p>
        )}

        {(content.quoteAuthor || content.quoteRole) && (
          <div className="pt-4 font-mono text-xs uppercase tracking-widest text-[#B9B9B4]">
            <span className="font-bold text-white">{content.quoteAuthor}</span>
            {content.quoteRole && <span> — {content.quoteRole}</span>}
          </div>
        )}
      </div>
    </section>
  );
}
