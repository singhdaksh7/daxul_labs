"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useStore } from "@/lib/storeContext";
import { HomepageSection } from "@/lib/types";
import { ArrowRight, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

interface CollectionsProps {
  section?: HomepageSection;
}

export default function Collections({ section }: CollectionsProps) {
  const { collections } = useStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const title = section?.title || "SHOP COLLECTIONS";
  const subtitle = section?.subtitle || "CURATED CATEGORIES";

  return (
    <section id="collections" className="bg-[#F3F0E9] text-[#0B0B0C] py-20 lg:py-28 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Top Header Bar */}
        <div className="flex items-end justify-between mb-10 pb-6 border-b border-[#D8D3C7]">
          <div>
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#666660] block mb-1">
              {subtitle}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Scroll Nav Buttons for Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                aria-label="Previous collections"
                className="w-10 h-10 rounded-full border border-[#D8D3C7] bg-white/60 hover:bg-white text-[#0B0B0C] flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll("right")}
                aria-label="Next collections"
                className="w-10 h-10 rounded-full border border-[#D8D3C7] bg-white/60 hover:bg-white text-[#0B0B0C] flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* View All Link */}
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 font-bold text-xs sm:text-sm uppercase tracking-wider text-[#0B0B0C] hover:text-[#555550] transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Horizontal Collections Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-6 pt-2"
        >
          {collections.map((item) => (
            <Link
              key={item.id}
              href={`/collections/${item.slug}`}
              className="group flex-shrink-0 w-[270px] sm:w-[300px] lg:w-[320px] bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#E5E0D5] flex flex-col snap-start"
            >
              {/* Card Image Container */}
              <div className="relative aspect-square w-full bg-[#151515] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                />
                {item.badge && (
                  <span className="absolute top-3 left-3 bg-[#0B0B0C] text-[#C8FF35] text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Card Content Footer */}
              <div className="p-5 bg-[#F3F0E9] group-hover:bg-[#EAE5DA] transition-colors flex items-center justify-between border-t border-[#E5E0D5]">
                <div>
                  <h3 className="text-lg font-extrabold uppercase tracking-wider text-[#0B0B0C] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#555550] font-medium tracking-wide mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-full bg-[#0B0B0C] text-white group-hover:bg-[#C8FF35] group-hover:text-[#0B0B0C] flex items-center justify-center transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
