"use client";

import React from 'react';
import { useSiteSettings } from '@/lib/siteContext';

export default function AnnouncementBar() {
  const siteSettings = useSiteSettings();

  if (!siteSettings.announcementBarEnabled || !siteSettings.announcementBarText) {
    return null;
  }

  return (
    <div className="bg-daxul-lime text-daxul-black text-[11px] font-extrabold uppercase tracking-widest py-2 px-4 text-center overflow-hidden border-b border-daxul-black/10 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="truncate">{siteSettings.announcementBarText}</span>
      </div>
    </div>
  );
}
