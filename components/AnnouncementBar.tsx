"use client";

import React from "react";
import { useSiteSettings } from "@/lib/siteContext";

export default function AnnouncementBar() {
  const siteSettings = useSiteSettings();

  if (!siteSettings.announcementBarEnabled || !siteSettings.announcementBarText) {
    return null;
  }

  return (
    <div className="bg-daxul-graphite text-daxul-bone text-[11px] font-medium tracking-[0.2em] uppercase py-2.5 px-4 text-center overflow-hidden border-b border-daxul-black/10 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-daxul-lime shrink-0" />
        <span className="truncate">{siteSettings.announcementBarText}</span>
      </div>
    </div>
  );
}
