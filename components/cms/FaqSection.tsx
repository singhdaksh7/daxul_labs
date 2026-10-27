"use client";

import React, { useState } from "react";
import { FaqSectionContent } from "@/lib/cms/pageTypes";
import { SafeMarkdown } from "@/lib/safeMarkdown";
import { Plus, Minus } from "lucide-react";

export default function FaqSection({ content }: { content: FaqSectionContent }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  if (!content || !content.items || content.items.length === 0) return null;

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="text-center mb-12 space-y-2">
          {content.eyebrow && (
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-[#71717A] uppercase font-semibold">
              {content.eyebrow}
            </div>
          )}
          <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
            {content.heading}
          </h2>
        </div>

        <div className="divide-y divide-daxul-black/10 border-t border-b border-daxul-black/10">
          {content.items.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={item.id || idx} className="py-5 sm:py-6">
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between text-left gap-4 group"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-semibold text-daxul-black group-hover:text-daxul-black/75 transition-colors">
                    {item.question}
                  </span>
                  <span className="p-1 text-daxul-black/60 group-hover:text-daxul-black shrink-0 transition-colors">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-4 text-sm leading-relaxed text-[#555550] pr-6">
                    <SafeMarkdown source={item.answer} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
