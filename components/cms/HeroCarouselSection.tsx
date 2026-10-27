"use client";

import React, { useEffect, useState } from "react";
import HeroCarousel from "@/components/HeroCarousel";
import type { HeroCarouselSectionContent, HeroBannerSlide } from "@/lib/cms/pageTypes";

interface HeroCarouselSectionProps {
  content: HeroCarouselSectionContent;
}

export default function HeroCarouselSection({ content }: HeroCarouselSectionProps) {
  const [banners, setBanners] = useState<HeroBannerSlide[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/banners/hero")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data?.banners) return;
        let filtered = data.banners;
        if (content.selectedBannerIds && content.selectedBannerIds.length > 0) {
          filtered = filtered.filter((b: HeroBannerSlide) =>
            content.selectedBannerIds?.includes(b.id)
          );
        }
        setBanners(filtered);
      })
      .catch((err) => console.error(err));

    return () => {
      isMounted = false;
    };
  }, [content.selectedBannerIds]);

  return (
    <HeroCarousel
      initialBanners={banners}
      autoplay={content.autoplay !== false}
      interval={content.interval || 5000}
      showArrows={content.showArrows !== false}
      showDots={content.showDots !== false}
    />
  );
}
