"use client";

import React, { useMemo } from "react";
import Hero from "@/components/Hero";
import HeroCarousel from "@/components/HeroCarousel";
import Collections from "@/components/Collections";
import FeaturedProduct from "@/components/FeaturedProduct";
import CustomSection from "@/components/CustomSection";
import LabSection from "@/components/LabSection";
import BrandSection from "@/components/BrandSection";
import InstagramSection from "@/components/InstagramSection";
import { useCms } from "@/lib/cmsContext";
import type { StoreCollection, StoreProduct } from "@/lib/types";
import type { HeroBannerSlide } from "@/lib/cms/pageTypes";

interface HomeSectionsProps {
  products: StoreProduct[];
  collections?: StoreCollection[];
  totalCount: number;
  initialHeroBanners?: HeroBannerSlide[];
}

/**
 * Dynamic Homepage orchestration.
 * Respects CMS section visibility and CMS admin section ordering.
 * Real DB products and collections ensure live updates when admin alters data.
 */
export default function HomeSections({
  products,
  collections = [],
  initialHeroBanners = [],
}: HomeSectionsProps) {
  const { visibility, sectionsList, hero } = useCms();

  // Sort sections by admin sortOrder if available
  const orderedSectionKeys = useMemo(() => {
    if (sectionsList && sectionsList.length > 0) {
      return [...sectionsList]
        .filter((s) => s.sectionKey !== "HEADER" && s.sectionKey !== "FOOTER")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => s.sectionKey);
    }
    return [
      "HERO",
      "FEATURED_PRODUCT",
      "COLLECTIONS",
      "CUSTOMIZATION",
      "BUILDING_DAXUL",
      "LAB",
    ];
  }, [sectionsList]);

  const renderSection = (key: string) => {
    switch (key) {
      case "HERO":
        return visibility.HERO !== false ? (
          <HeroCarousel
            key="HERO"
            initialBanners={initialHeroBanners}
            autoplay={hero.carouselAutoplay !== false}
            interval={hero.carouselInterval || 5500}
            showArrows={hero.carouselShowArrows !== false}
            showDots={hero.carouselShowDots !== false}
            transitionStyle={hero.carouselTransitionStyle || "subtle"}
          />
        ) : null;
      case "FEATURED_PRODUCT":
        return visibility.FEATURED_PRODUCT !== false ? (
          <FeaturedProduct key="FEATURED_PRODUCT" products={products} />
        ) : null;
      case "COLLECTIONS":
        return visibility.COLLECTIONS !== false ? (
          <Collections key="COLLECTIONS" collections={collections} />
        ) : null;
      case "CUSTOMIZATION":
        return visibility.CUSTOMIZATION !== false ? (
          <CustomSection key="CUSTOMIZATION" />
        ) : null;
      case "BUILDING_DAXUL":
        return visibility.BUILDING_DAXUL !== false ? (
          <InstagramSection key="BUILDING_DAXUL" />
        ) : null;
      case "LAB":
        return visibility.LAB !== false ? <LabSection key="LAB" /> : null;
      default:
        return null;
    }
  };

  return (
    <>
      {orderedSectionKeys.map((key) => renderSection(key))}
      <BrandSection />
    </>
  );
}
