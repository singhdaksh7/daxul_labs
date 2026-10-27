"use client";

import React from "react";
import { PageSectionType } from "@/lib/cms/pageTypes";
import HeroSection from "./HeroSection";
import BannerSection from "./BannerSection";
import TextSection from "./TextSection";
import ImageTextSection from "./ImageTextSection";
import ProductGridSection from "./ProductGridSection";
import CollectionGridSection from "./CollectionGridSection";
import FeaturedProductSection from "./FeaturedProductSection";
import GallerySection from "./GallerySection";
import VideoSection from "./VideoSection";
import CtaSection from "./CtaSection";
import StatsSection from "./StatsSection";
import TabsSection from "./TabsSection";
import FaqSection from "./FaqSection";
import TestimonialsSection from "./TestimonialsSection";
import CustomizationSection from "./CustomizationSection";
import BrandStatementSection from "./BrandStatementSection";
import InstagramSection from "./InstagramSection";
import NewsletterSection from "./NewsletterSection";
import ContactSection from "./ContactSection";
import SpacerSection from "./SpacerSection";
import type { StoreProduct } from "@/lib/types";

interface CmsSectionRendererProps {
  section: {
    id: string;
    type: string | PageSectionType;
    visible?: boolean;
    draftContent: any;
    publishedContent: any;
    settings?: any;
  };
  useDraft?: boolean;
  products?: StoreProduct[];
  collections?: any[];
}

export default function CmsSectionRenderer({
  section,
  useDraft = false,
  products = [],
  collections = [],
}: CmsSectionRendererProps) {
  if (section.visible === false && !useDraft) return null;

  const content = useDraft ? section.draftContent : section.publishedContent;
  if (!content) return null;

  const type = section.type as PageSectionType;

  switch (type) {
    case "HERO":
      return <HeroSection content={content} />;
    case "BANNER":
      return <BannerSection content={content} />;
    case "TEXT":
      return <TextSection content={content} />;
    case "IMAGE_TEXT":
      return <ImageTextSection content={content} />;
    case "PRODUCT_GRID":
      return <ProductGridSection content={content} products={products} />;
    case "COLLECTION_GRID":
      return <CollectionGridSection content={content} collections={collections} />;
    case "FEATURED_PRODUCT": {
      const featProduct = content.productId
        ? products.find((p) => p.id === content.productId) || products[0]
        : products[0] || null;
      return <FeaturedProductSection content={content} product={featProduct} />;
    }
    case "GALLERY":
      return <GallerySection content={content} />;
    case "VIDEO":
      return <VideoSection content={content} />;
    case "CTA":
      return <CtaSection content={content} />;
    case "STATS":
      return <StatsSection content={content} />;
    case "TABS":
      return <TabsSection content={content} />;
    case "FAQ":
      return <FaqSection content={content} />;
    case "TESTIMONIALS":
      return <TestimonialsSection content={content} />;
    case "CUSTOMIZATION":
      return <CustomizationSection content={content} />;
    case "BRAND_STATEMENT":
      return <BrandStatementSection content={content} />;
    case "INSTAGRAM":
      return <InstagramSection content={content} />;
    case "NEWSLETTER":
      return <NewsletterSection content={content} />;
    case "CONTACT":
      return <ContactSection content={content} />;
    case "SPACER":
      return <SpacerSection content={content} />;
    default:
      return null;
  }
}
