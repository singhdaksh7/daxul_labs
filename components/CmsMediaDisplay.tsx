"use client";

import React from "react";
import { CmsMediaConfig } from "@/lib/cmsTypes";

interface CmsMediaDisplayProps {
  media?: CmsMediaConfig;
  fallbackUrl: string;
  fallbackAlt?: string;
  className?: string;
}

export default function CmsMediaDisplay({
  media,
  fallbackUrl,
  fallbackAlt = "DAXUL LABS Object",
  className = "w-full h-full object-cover object-center",
}: CmsMediaDisplayProps) {
  const isVideo = media?.mediaType === "video" || media?.url?.endsWith(".mp4") || media?.url?.endsWith(".webm");
  const mediaUrl = media?.url || fallbackUrl;
  const altText = media?.altText || fallbackAlt;
  const poster = media?.posterUrl || fallbackUrl;
  const fitMode = media?.fitMode === "contain" ? "object-contain" : "object-cover";

  if (isVideo) {
    return (
      <video
        src={mediaUrl}
        poster={poster}
        autoPlay={media?.autoplay !== false}
        muted={media?.muted !== false} // Forced muted for autoplay policy safety
        loop={media?.loop !== false}
        playsInline={media?.playsInline !== false}
        className={`${className} ${fitMode}`}
      />
    );
  }

  return (
    <img
      src={mediaUrl}
      alt={altText}
      loading="lazy"
      className={`${className} ${fitMode}`}
    />
  );
}
