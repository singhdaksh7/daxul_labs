"use client";

import React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Collections from "@/components/Collections";
import FeaturedProduct from "@/components/FeaturedProduct";
import CustomSection from "@/components/CustomSection";
import LabSection from "@/components/LabSection";
import BrandSection from "@/components/BrandSection";
import NewDropsSection from "@/components/NewDropsSection";
import ReviewsSection from "@/components/ReviewsSection";
import InstagramSection from "@/components/InstagramSection";
import NewsletterSection from "@/components/NewsletterSection";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";

export default function Home() {
  const { sections } = useStore();

  const activeSections = [...sections]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.order - b.order);

  const renderSection = (sec: (typeof sections)[0]) => {
    switch (sec.type) {
      case "hero":
        return <Hero key={sec.id} section={sec} />;
      case "flagship":
        return <FeaturedProduct key={sec.id} section={sec} />;
      case "collections":
        return <Collections key={sec.id} section={sec} />;
      case "customize":
        return <CustomSection key={sec.id} section={sec} />;
      case "lab_spotlight":
        return <LabSection key={sec.id} section={sec} />;
      case "how_it_works":
        return <BrandSection key={sec.id} />;
      case "new_drops":
        return <NewDropsSection key={sec.id} section={sec} />;
      case "reviews":
        return <ReviewsSection key={sec.id} section={sec} />;
      case "instagram":
        return <InstagramSection key={sec.id} />;
      case "newsletter":
        return <NewsletterSection key={sec.id} section={sec} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans selection:bg-[#C8FF35] selection:text-[#0B0B0C]">
      <Header />
      <div className="flex-1">
        {activeSections.map((sec) => renderSection(sec))}
      </div>
      <Footer />
    </main>
  );
}
