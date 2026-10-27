"use client";

import React from "react";
import Link from "next/link";
import { CollectionGridSectionContent } from "@/lib/cms/pageTypes";
import CollectionCard from "@/components/CollectionCard";

export default function CollectionGridSection({
  content,
  collections = [],
}: {
  content: CollectionGridSectionContent;
  collections?: any[];
}) {
  if (!content) return null;

  let displayed = [...collections];
  if (content.collectionIds && content.collectionIds.length > 0) {
    const idSet = new Set(content.collectionIds);
    displayed = displayed.filter((c) => idSet.has(c.id));
  }

  const colClass =
    content.layout === "2-col"
      ? "grid-cols-1 sm:grid-cols-2"
      : content.layout === "4-col"
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-14">
          <div>
            <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
              {content.heading}
            </h2>
            {content.description && (
              <p className="mt-2 text-sm text-[#71717A] max-w-xl">
                {content.description}
              </p>
            )}
          </div>
          {content.ctaLabel && content.ctaLink && (
            <Link
              href={content.ctaLink}
              className="font-mono text-xs uppercase tracking-widest text-daxul-black hover:underline shrink-0"
            >
              {content.ctaLabel} →
            </Link>
          )}
        </div>

        {displayed.length > 0 ? (
          <div className={`grid ${colClass} gap-6`}>
            {displayed.map((c) => (
              <CollectionCard
                key={c.id}
                collection={{
                  id: c.id,
                  title: c.name,
                  subtitle: c.description || "Studio Series",
                  image: c.image || "/images/collection-default.webp",
                  href: `/collections/${c.slug}`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center font-mono text-xs text-[#71717A] uppercase tracking-wider bg-[#ECE8E0]">
            No collections currently configured.
          </div>
        )}

      </div>
    </section>
  );
}
