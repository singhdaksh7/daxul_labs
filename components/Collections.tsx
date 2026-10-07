"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { HomepageSection } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";

interface CollectionsProps {
  section?: HomepageSection;
}

export default function Collections({ section }: CollectionsProps) {
  const { collections: cmsCol } = useCms();

  const title = cmsCol?.sectionHeading || section?.title || "COLLECTIONS";
  const eyebrow = cmsCol?.eyebrow || section?.subtitle || "03 / CATALOG ARCHIVE";
  const tiles = cmsCol?.tiles || [];

  return (
    <section id="collections" className="bg-daxul-bone text-daxul-black py-20 lg:py-32 border-b border-daxul-black/15 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Editorial Section Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-8 mb-12 border-b border-daxul-black/15">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#666660] uppercase mb-2">
              [ {eyebrow} ]
            </div>
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.88] text-daxul-black">
              {title}
            </h2>
          </div>

          <Link
            href="/collections"
            className="mt-6 sm:mt-0 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-daxul-black hover:text-[#555550] transition-colors"
          >
            <span>VIEW FULL ARCHIVE</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Editorial Asymmetrical Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Top Items (6 Cols Each) */}
          {tiles.slice(0, 2).map((item) => (
            <Link
              key={item.id || item.title}
              href={item.destinationUrl || `/collections/${item.slug}`}
              className="group md:col-span-6 border border-daxul-black/15 bg-[#EAE5DA]/50 hover:bg-[#EAE5DA] transition-colors p-6 sm:p-8 flex flex-col justify-between"
            >
              <div className="space-y-4 mb-6">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-daxul-black/5 border border-daxul-black/10">
                  <CmsMediaDisplay
                    media={item.media}
                    fallbackUrl={item.media?.url || "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop"}
                    fallbackAlt={item.title}
                    className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />
                </div>
              </div>

              <div className="flex items-end justify-between pt-4 border-t border-daxul-black/15">
                <div>
                  <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-daxul-black leading-none mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#555550] max-w-sm font-normal">
                    {item.descriptor}
                  </p>
                </div>

                <div className="w-10 h-10 border border-daxul-black/20 text-daxul-black group-hover:bg-daxul-black group-hover:text-white flex items-center justify-center transition-all duration-300 shrink-0 ml-4">
                  <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </Link>
          ))}

          {/* Remaining Items (4 Cols Each) */}
          {tiles.slice(2).map((item) => (
            <Link
              key={item.id || item.title}
              href={item.destinationUrl || `/collections/${item.slug}`}
              className="group md:col-span-4 border border-daxul-black/15 bg-[#EAE5DA]/50 hover:bg-[#EAE5DA] transition-colors p-6 flex flex-col justify-between"
            >
              <div className="space-y-4 mb-6">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-daxul-black/5 border border-daxul-black/10">
                  <CmsMediaDisplay
                    media={item.media}
                    fallbackUrl={item.media?.url || "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop"}
                    fallbackAlt={item.title}
                    className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />
                </div>
              </div>

              <div className="flex items-end justify-between pt-4 border-t border-daxul-black/15">
                <div>
                  <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-daxul-black leading-none mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#555550] font-normal line-clamp-2">
                    {item.descriptor}
                  </p>
                </div>

                <div className="w-9 h-9 border border-daxul-black/20 text-daxul-black group-hover:bg-daxul-black group-hover:text-white flex items-center justify-center transition-all duration-300 shrink-0 ml-3">
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </Link>
          ))}

        </div>

      </div>
    </section>
  );
}
