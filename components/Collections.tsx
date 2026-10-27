"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCms } from "@/lib/cmsContext";
import type { StoreCollection } from "@/lib/types";

interface CollectionsProps {
  /** Real collection records from PostgreSQL (server-fetched). */
  collections?: StoreCollection[];
}

export default function Collections({ collections = [] }: CollectionsProps) {
  const { collections: cmsCol } = useCms();

  const title = cmsCol?.sectionHeading || "Shop by Collection";
  const eyebrow = cmsCol?.eyebrow;

  // Prefer database collections to ensure admin image/name updates reflect immediately
  // If collections prop is empty or has fewer, blend with CMS tiles
  const tiles = React.useMemo(() => {
    if (collections && collections.length > 0) {
      return collections.slice(0, 5).map((col) => {
        // Find matching CMS tile if any for custom descriptor
        const cmsMatch = cmsCol?.tiles?.find(
          (t) => t.slug === col.slug || t.title.toLowerCase() === col.name.toLowerCase()
        );
        return {
          id: col.id,
          name: col.name,
          slug: col.slug,
          image: col.image || cmsMatch?.media?.url || "/images/collection_shadow.jpg",
          url: `/collections/${col.slug}`,
          count: col.productCount,
        };
      });
    }

    // Fallback to CMS tiles if no DB collections passed
    return (cmsCol?.tiles || []).slice(0, 5).map((t) => ({
      id: t.id || t.slug,
      name: t.title,
      slug: t.slug,
      image: t.media?.url || "/images/collection_shadow.jpg",
      url: t.destinationUrl || `/collections/${t.slug}`,
      count: undefined,
    }));
  }, [collections, cmsCol]);

  if (tiles.length === 0) return null;

  return (
    <section id="collections" className="bg-daxul-bone text-daxul-black py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Top Header */}
        <div className="flex items-end justify-between pb-6 mb-10 border-b border-daxul-black/10">
          <div>
            {eyebrow && (
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block mb-2">
                {eyebrow}
              </span>
            )}
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-daxul-black">
              {title}
            </h2>
          </div>

          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-daxul-black hover:opacity-70 transition-opacity"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Large Clean Image Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {tiles.map((item) => (
            <Link
              key={item.id}
              href={item.url}
              className="group flex flex-col justify-between space-y-3"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#EAE5DA] border border-daxul-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-daxul-black group-hover:underline">
                    {item.name}
                  </h3>
                  {typeof item.count === "number" && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A] block">
                      {item.count} {item.count === 1 ? "Object" : "Objects"}
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-daxul-black group-hover:opacity-70 transition-opacity">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
