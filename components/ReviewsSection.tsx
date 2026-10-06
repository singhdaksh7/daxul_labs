"use client";

import React from "react";
import { useStore } from "@/lib/storeContext";
import { HomepageSection } from "@/lib/types";
import { Star, CheckCircle, Quote } from "lucide-react";

interface ReviewsSectionProps {
  section?: HomepageSection;
}

export default function ReviewsSection({ section }: ReviewsSectionProps) {
  const { siteSettings } = useStore();

  const title = section?.title || "Collector Feedback";
  const subtitle = section?.subtitle || "VERIFIED REVIEWS FROM OUR COMMUNITY";
  const badgeText = section?.badgeText || "COMMUNITY";

  const reviews = [
    {
      id: "rev-1",
      author: "Aarav Mehta",
      location: "Mumbai, India",
      rating: 5,
      productName: "Aethel Projection Shadow Lamp",
      comment:
        "The shadow projection in my bedroom is mind-blowing. The dark matte finish feels so premium and the neon lime branding box was an awesome unboxing experience!",
      date: "2 days ago",
    },
    {
      id: "rev-2",
      author: "Sanya & Kabir",
      location: "Bangalore, India",
      rating: 5,
      productName: "Intertwined Infinity Couple Monolith",
      comment:
        "Got our anniversary date and names engraved. Everyone who visits our apartment asks where we got this dual-angle name sculpture from!",
      date: "1 week ago",
    },
    {
      id: "rev-3",
      author: "Rohan Deshmukh",
      location: "Pune, India",
      rating: 5,
      productName: "Quantum Lattice Kinetic Sphere",
      comment:
        "As a mechanical engineer, seeing a print-in-place kinetic sphere with zero assembly work flabbergasted me. DAXUL LABS is doing true 3D printing art.",
      date: "2 weeks ago",
    },
  ];

  return (
    <section id="reviews" className="bg-[#0B0B0C] text-white py-20 lg:py-28 border-b border-[#242426]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35]">
            {badgeText} — {subtitle}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            {title}
          </h2>
        </div>

        {/* Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#151515] border border-[#242426] p-6 rounded-2xl flex flex-col justify-between hover:border-[#C8FF35]/50 transition-colors relative"
            >
              <Quote className="w-8 h-8 text-[#242426] absolute top-4 right-4" />
              
              <div className="space-y-4">
                {/* Stars */}
                <div className="flex items-center gap-1 text-[#C8FF35]">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-6 border-t border-[#242426] mt-6 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>{rev.author}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-[#C8FF35]" />
                  </div>
                  <div className="text-[11px] text-gray-500">{rev.location}</div>
                </div>

                <div className="text-[10px] text-right font-mono text-[#C8FF35]">
                  {rev.productName}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
