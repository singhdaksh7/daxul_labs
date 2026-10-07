"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  tag?: string;
}

interface CollectionCardProps {
  collection: CollectionItem;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link
      href={collection.href}
      className="group flex-shrink-0 w-[270px] sm:w-[300px] lg:w-[320px] bg-white daxul-card-sm overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#E5E0D5] flex flex-col snap-start"
    >
      {/* Card Image Container */}
      <div className="relative aspect-square w-full bg-daxul-dark overflow-hidden">
        <Image
          src={collection.image}
          alt={collection.title}
          fill
          sizes="(max-width: 768px) 280px, 320px"
          className="object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
        />
        {collection.tag && (
          <span className="absolute top-3 left-3 bg-daxul-black text-daxul-lime text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded">
            {collection.tag}
          </span>
        )}
      </div>

      {/* Card Content Footer */}
      <div className="p-5 bg-daxul-bone group-hover:bg-[#EAE5DA] transition-colors flex items-center justify-between border-t border-[#E5E0D5]">
        <div>
          <h3 className="text-lg font-extrabold uppercase tracking-wider text-daxul-black group-hover:text-daxul-black transition-colors">
            {collection.title}
          </h3>
          <p className="text-xs text-[#555550] font-medium tracking-wide mt-0.5">
            {collection.subtitle}
          </p>
        </div>

        <div className="w-8 h-8 rounded-full bg-daxul-black text-white group-hover:bg-daxul-lime group-hover:text-daxul-black flex items-center justify-center transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
