"use client";

import React from "react";
import { VideoSectionContent } from "@/lib/cms/pageTypes";

export default function VideoSection({ content }: { content: VideoSectionContent }) {
  if (!content || !content.videoUrl) return null;

  const aspectClass =
    content.aspectRatio === "4:3"
      ? "aspect-[4/3]"
      : content.aspectRatio === "1:1"
      ? "aspect-square"
      : content.aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : "aspect-video";

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {content.heading && (
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
              {content.heading}
            </h2>
          </div>
        )}

        <div className={`relative w-full max-w-5xl mx-auto ${aspectClass} bg-black overflow-hidden border border-daxul-black/10`}>
          <video
            src={content.videoUrl}
            poster={content.posterImage}
            autoPlay={content.autoplay}
            muted={content.muted !== false}
            loop={content.loop !== false}
            controls={!content.autoplay}
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {content.caption && (
          <p className="mt-4 text-center font-mono text-xs text-[#71717A] tracking-wider uppercase">
            {content.caption}
          </p>
        )}

      </div>
    </section>
  );
}
