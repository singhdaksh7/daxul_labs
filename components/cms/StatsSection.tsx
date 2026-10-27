"use client";

import React from "react";
import { StatsSectionContent } from "@/lib/cms/pageTypes";

export default function StatsSection({ content }: { content: StatsSectionContent }) {
  if (!content || !content.items || content.items.length === 0) return null;

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {(content.eyebrow || content.heading) && (
          <div className="text-center mb-12 sm:mb-16 space-y-2">
            {content.eyebrow && (
              <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-[#71717A] uppercase font-semibold">
                {content.eyebrow}
              </div>
            )}
            {content.heading && (
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-daxul-black">
                {content.heading}
              </h2>
            )}
          </div>
        )}

        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(content.items.length, 4)} gap-8 sm:gap-12 text-center`}>
          {content.items.map((item, idx) => (
            <div key={item.id || idx} className="space-y-2">
              <div className="text-3xl sm:text-5xl font-bold tracking-tight text-daxul-black">
                {item.value}
              </div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#71717A] font-semibold">
                {item.label}
              </div>
              {item.description && (
                <div className="text-xs text-[#555550] max-w-xs mx-auto">
                  {item.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
