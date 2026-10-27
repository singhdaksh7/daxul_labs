"use client";

import React from "react";
import Link from "next/link";
import { CtaSectionContent } from "@/lib/cms/pageTypes";

export default function CtaSection({ content }: { content: CtaSectionContent }) {
  if (!content) return null;

  const bgStyle =
    content.backgroundMode === "lime"
      ? "bg-daxul-lime text-daxul-black"
      : content.backgroundMode === "carbon"
      ? "bg-daxul-black text-white"
      : content.backgroundMode === "bone"
      ? "bg-daxul-bone text-daxul-black"
      : "bg-daxul-graphite text-daxul-bone";

  return (
    <section className={`w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-10 border-b border-daxul-black/10 select-none ${bgStyle}`}>
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight leading-tight">
          {content.heading}
        </h2>

        {content.text && (
          <p className="text-sm sm:text-base leading-relaxed opacity-85 max-w-xl mx-auto">
            {content.text}
          </p>
        )}

        {content.buttonLabel && content.buttonUrl && (
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href={content.buttonUrl}
              className={`font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 transition-colors ${
                content.backgroundMode === "lime"
                  ? "bg-daxul-black text-white hover:bg-black/80"
                  : "bg-daxul-lime text-daxul-black hover:bg-[#b8eb2f]"
              }`}
            >
              {content.buttonLabel}
            </Link>
            {content.secondaryButtonLabel && content.secondaryButtonUrl && (
              <Link
                href={content.secondaryButtonUrl}
                className="font-semibold text-xs uppercase tracking-[0.2em] px-8 py-3.5 border border-current hover:opacity-75 transition-opacity"
              >
                {content.secondaryButtonLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
