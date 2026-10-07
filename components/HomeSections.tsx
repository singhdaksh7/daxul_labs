"use client";

import React from "react";
import Hero from "@/components/Hero";
import Collections from "@/components/Collections";
import FeaturedProduct from "@/components/FeaturedProduct";
import CustomSection from "@/components/CustomSection";
import LabSection from "@/components/LabSection";
import BrandSection from "@/components/BrandSection";
import NewDropsSection from "@/components/NewDropsSection";
import InstagramSection from "@/components/InstagramSection";
import NewsletterSection from "@/components/NewsletterSection";
import { useCms } from "@/lib/cmsContext";
import type { StoreProduct } from "@/lib/types";

/**
 * Homepage composition. Section visibility comes from the published CMS
 * (HomepageSection table via /api/cms/published); product data is passed in
 * from the server page (PostgreSQL).
 */
export default function HomeSections({
  products,
  totalCount,
}: {
  products: StoreProduct[];
  totalCount: number;
}) {
  const { visibility } = useCms();

  return (
    <>
      {visibility.HERO && <Hero />}
      {visibility.FEATURED_PRODUCT && <FeaturedProduct products={products} />}
      {visibility.COLLECTIONS && <Collections />}
      {visibility.CUSTOMIZATION && <CustomSection />}
      {visibility.LAB && <LabSection />}
      <BrandSection />
      <NewDropsSection products={products.slice(0, 8)} totalCount={totalCount} />
      {visibility.BUILDING_DAXUL && <InstagramSection />}
      <NewsletterSection />
    </>
  );
}
