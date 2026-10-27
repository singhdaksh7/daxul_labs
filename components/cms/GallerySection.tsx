"use client";

import React from "react";
import { GallerySectionContent } from "@/lib/cms/pageTypes";

export default function GallerySection({ content }: { content: GallerySectionContent }) {
  if (!content || !content.items || content.items.length === 0) return null;

  const colClass =
    content.layout === "2-col"
      ? "grid-cols-1 sm:grid-cols-2"
      : content.layout === "4-col"
      ? "grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {(content.heading || content.description) && (
          <div className="text-center mb-10 sm:mb-14 space-y-2">
            {content.heading && (
              <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
                {content.heading}
              </h2>
            )}
            {content.description && (
              <p className="text-sm text-[#71717A] max-w-xl mx-auto">
                {content.description}
              </p>
            )}
          </div>
        )}

        <div className={`grid ${colClass} gap-4 sm:gap-6`}>
          {content.items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="group relative aspect-[4/5] bg-[#ECE8E0] overflow-hidden border border-daxul-black/10"
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.altText || "Gallery visual"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-daxul-black/70 text-white p-3 font-mono text-[11px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.caption}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
