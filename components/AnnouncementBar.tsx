"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSiteSettings } from "@/lib/siteContext";
import { X } from "lucide-react";

interface ActiveBanner {
  id: string;
  text: string;
  buttonText?: string | null;
  linkUrl?: string | null;
}

export default function AnnouncementBar() {
  const siteSettings = useSiteSettings();
  const [activeBanner, setActiveBanner] = useState<ActiveBanner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/banners/active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.banner) {
          setActiveBanner(data.banner);
        }
      })
      .catch(() => {});
  }, []);

  if (dismissed) return null;

  const text = activeBanner?.text || siteSettings.announcementBarText;
  const isEnabled = activeBanner ? true : siteSettings.announcementBarEnabled;

  if (!isEnabled || !text) {
    return null;
  }

  return (
    <div className="bg-daxul-graphite text-daxul-bone text-[11px] font-medium tracking-[0.2em] uppercase py-2.5 px-4 text-center overflow-hidden border-b border-daxul-black/10 select-none relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-daxul-lime shrink-0" />
        <span className="truncate">{text}</span>
        {activeBanner?.linkUrl && (
          <Link
            href={activeBanner.linkUrl}
            className="underline underline-offset-2 ml-1 text-daxul-lime hover:text-white transition-colors"
          >
            {activeBanner.buttonText || "DETAILS"}
          </Link>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss Announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
