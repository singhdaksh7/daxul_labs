"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCms } from "@/lib/cmsContext";
import { useSiteSettings } from "@/lib/siteContext";
import CmsMediaDisplay from "./CmsMediaDisplay";

export default function InstagramSection() {
  const { buildingDaxul: cmsBD } = useCms();
  const settings = useSiteSettings();

  const heading = cmsBD?.heading || "Building DAXUL Labs";
  const socialHandle = cmsBD?.socialHandle || "@daxul.labs";
  const instagramUrl = settings.instagramUrl || cmsBD?.handleUrl || "https://instagram.com/daxullabs";
  
  const defaultTiles = [
    {
      id: "b-1",
      title: "First Machine Setup",
      description: "Custom multi-axis FDM bed thermal calibration.",
      media: { mediaType: "image" as const, url: "/images/instagram_1.jpg", altText: "First Machine" },
    },
    {
      id: "b-2",
      title: "Prototype 001",
      description: "Light diffraction lithophane lattice testing.",
      media: { mediaType: "image" as const, url: "/images/instagram_2.jpg", altText: "Prototype 001" },
    },
    {
      id: "b-3",
      title: "Behind the Build",
      description: "COB LED modules, brass fittings, and optical QC.",
      media: { mediaType: "image" as const, url: "/images/instagram_3.jpg", altText: "Behind the Build" },
    },
  ];

  const tiles = cmsBD?.tiles && cmsBD.tiles.length > 0 ? cmsBD.tiles.slice(0, 4) : defaultTiles;

  return (
    <section id="building-daxul" className="bg-daxul-bone text-daxul-black py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Header */}
        <div className="flex items-end justify-between pb-6 mb-10 border-b border-daxul-black/10">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block mb-2">
              DISPATCH
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-daxul-black">
              {heading}
            </h2>
          </div>

          <Link
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-daxul-black hover:opacity-70 transition-opacity"
          >
            <span>{socialHandle}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3-4 Clean Restrained Media Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {tiles.map((tile) => (
            <div
              key={tile.id || tile.title}
              className="group flex flex-col space-y-3"
            >
              <div className="relative aspect-[4/3] w-full bg-[#EAE5DA] border border-daxul-black/10 rounded-xl overflow-hidden">
                <CmsMediaDisplay
                  media={tile.media}
                  fallbackUrl={tile.media?.url || "/images/instagram_1.jpg"}
                  fallbackAlt={tile.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-daxul-black">
                  {tile.title}
                </h3>
                {tile.description && (
                  <p className="text-xs text-[#71717A] leading-relaxed line-clamp-2">
                    {tile.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
