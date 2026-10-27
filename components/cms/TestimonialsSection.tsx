"use client";

import React from "react";
import { TestimonialsSectionContent } from "@/lib/cms/pageTypes";
import { Star } from "lucide-react";

export default function TestimonialsSection({ content }: { content: TestimonialsSectionContent }) {
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
              <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
                {content.heading}
              </h2>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(content.items.length, 3)} gap-8`}>
          {content.items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="bg-[#ECE8E0] p-6 sm:p-8 border border-daxul-black/10 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {item.rating && item.rating > 0 && (
                  <div className="flex gap-1 text-daxul-black">
                    {Array.from({ length: item.rating }).map((_, rIdx) => (
                      <Star key={rIdx} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                )}
                <blockquote className="text-sm sm:text-base leading-relaxed text-[#242426] italic">
                  "{item.quote}"
                </blockquote>
              </div>

              <div className="mt-6 pt-4 border-t border-daxul-black/10 flex items-center gap-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-daxul-black">
                    {item.name}
                  </div>
                  {item.location && (
                    <div className="font-mono text-[10px] text-[#71717A] uppercase tracking-wider">
                      {item.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
