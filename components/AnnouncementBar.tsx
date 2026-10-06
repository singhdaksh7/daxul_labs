"use client";

import React from 'react';
import { useStore } from '@/lib/storeContext';

export default function AnnouncementBar() {
  const { siteSettings } = useStore();

  if (!siteSettings.announcementBarEnabled || !siteSettings.announcementBarText) {
    return null;
  }

  return (
    <div className="bg-[#C8FF35] text-[#0B0B0C] text-[11px] font-extrabold uppercase tracking-widest py-2 px-4 text-center overflow-hidden border-b border-[#0B0B0C]/10 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="truncate">{siteSettings.announcementBarText}</span>
      </div>
    </div>
  );
}
