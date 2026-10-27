"use client";

import React from "react";
import Link from "next/link";
import { BannerSectionContent } from "@/lib/cms/pageTypes";

export default function BannerSection({ content }: { content: BannerSectionContent }) {
  if (!content) return null;

  const bgStyle =
    content.accentStyle === "lime"
      ? "bg-daxul-lime text-daxul-black"
      : content.accentStyle === "black"
      ? "bg-daxul-black text-white"
      : content.accentStyle === "bone"
      ? "bg-daxul-bone text-daxul-black"
      : "bg-daxul-graphite text-daxul-bone";

  return (
    <div className={`w-full py-8 sm:py-10 px-4 sm:px-6 lg:px-10 border-b border-daxul-black/10 select-none ${bgStyle}`}>
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-sm sm:text-base font-bold tracking-[0.15em] uppercase">
            {content.text}
          </div>
          {content.subtext && (
            <div className="font-mono text-xs opacity-75 tracking-wider">
              {content.subtext}
            </div>
          )}
        </div>

        {content.buttonText && content.linkUrl && (
          <Link
            href={content.linkUrl}
            className={`font-semibold text-xs uppercase tracking-[0.2em] px-6 py-3 transition-colors shrink-0 ${
              content.accentStyle === "lime"
                ? "bg-daxul-black text-white hover:bg-black/80"
                : "bg-daxul-lime text-daxul-black hover:bg-[#b8eb2f]"
            }`}
          >
            {content.buttonText}
          </Link>
        )}
      </div>
    </div>
  );
}
