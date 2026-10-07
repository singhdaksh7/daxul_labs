"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import CmsMediaDisplay from "./CmsMediaDisplay";
import { ArrowUpRight } from "lucide-react";

export default function InstagramSection() {
  const { buildingDaxul: cmsBD } = useCms();

  const heading = cmsBD?.heading || "BUILDING DAXUL LABS";
  const supportingCopy = cmsBD?.supportingCopy || "From our first machine to our first objects.";
  const socialHandle = cmsBD?.socialHandle || "@daxul.labs";
  const handleUrl = cmsBD?.handleUrl || "https://instagram.com/daxullabs";
  const tiles = cmsBD?.tiles || [];

  return (
    <section className="bg-daxul-black text-white py-20 lg:py-32 border-b border-daxul-graphite">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 mb-12 border-b border-daxul-graphite">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-daxul-gray uppercase mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-daxul-lime" />
              <span>06 / CHRONICLES</span>
            </div>
            <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.88] text-white">
              {heading}
            </h2>
            <p className="text-sm sm:text-base text-daxul-gray font-normal leading-relaxed mt-2">
              {supportingCopy}
            </p>
          </div>

          <Link
            href={handleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 md:mt-0 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white hover:text-daxul-lime transition-colors shrink-0"
          >
            <span>{socialHandle}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Dynamic Clean Editorial Journey Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiles.map((tile) => (
            <div
              key={tile.id || tile.title}
              className="group bg-daxul-dark border border-daxul-graphite p-6 space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="relative aspect-[4/3] w-full bg-daxul-black border border-daxul-graphite overflow-hidden">
                  <CmsMediaDisplay
                    media={tile.media}
                    fallbackUrl={tile.media?.url || "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1000&auto=format&fit=crop"}
                    fallbackAlt={tile.title}
                    className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />
                  {tile.tag && (
                    <div className="absolute top-3 left-3 bg-daxul-black/90 backdrop-blur-sm px-2.5 py-1 border border-daxul-graphite font-mono text-[10px] text-daxul-gray tracking-widest uppercase">
                      {tile.tag}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight uppercase">
                    {tile.title}
                  </h3>
                  <p className="text-xs text-daxul-gray leading-relaxed font-normal">
                    {tile.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-daxul-graphite font-mono text-[10px] text-daxul-gray tracking-widest uppercase flex items-center justify-between">
                <span>[ JOURNAL ARCHIVE ]</span>
                <span className="text-white">DOCUMENTED</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
