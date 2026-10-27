"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TabsSectionContent } from "@/lib/cms/pageTypes";
import { SafeMarkdown } from "@/lib/safeMarkdown";

export default function TabsSection({ content }: { content: TabsSectionContent }) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  if (!content || !content.tabs || content.tabs.length === 0) return null;

  const activeTab = content.tabs[activeTabIdx] || content.tabs[0];

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {content.heading && (
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
              {content.heading}
            </h2>
            {content.description && (
              <p className="mt-2 text-sm text-[#71717A] max-w-xl mx-auto">
                {content.description}
              </p>
            )}
          </div>
        )}

        {/* Tab Headers - Horizontal Scrollable on Mobile */}
        <div className="flex border-b border-daxul-black/10 overflow-x-auto no-scrollbar gap-2 sm:gap-8 justify-start sm:justify-center mb-10">
          {content.tabs.map((tab, idx) => {
            const isActive = idx === activeTabIdx;
            return (
              <button
                key={tab.id || idx}
                onClick={() => setActiveTabIdx(idx)}
                className={`py-3.5 px-4 font-mono text-xs uppercase tracking-[0.2em] transition-all whitespace-nowrap border-b-2 -mb-[2px] ${
                  isActive
                    ? "border-daxul-black text-daxul-black font-bold"
                    : "border-transparent text-[#71717A] hover:text-daxul-black"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="max-w-4xl mx-auto bg-[#ECE8E0] p-6 sm:p-10 border border-daxul-black/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-daxul-black">
                {activeTab.label}
              </h3>
              <div className="text-sm leading-relaxed text-[#555550]">
                <SafeMarkdown source={activeTab.content} />
              </div>
              {activeTab.ctaLabel && activeTab.ctaLink && (
                <div className="pt-2">
                  <Link
                    href={activeTab.ctaLink}
                    className="inline-block bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-[#b8eb2f] transition-colors"
                  >
                    {activeTab.ctaLabel}
                  </Link>
                </div>
              )}
            </div>

            {activeTab.image && (
              <div className="relative aspect-[4/3] bg-[#E5E1D8] overflow-hidden">
                <img
                  src={activeTab.image}
                  alt={activeTab.label}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
