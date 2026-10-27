"use client";

import React from "react";
import { SpacerSectionContent } from "@/lib/cms/pageTypes";

export default function SpacerSection({ content }: { content: SpacerSectionContent }) {
  const desktop = content?.heightDesktop ?? 64;
  const mobile = content?.heightMobile ?? 40;

  return (
    <div
      style={{
        ["--desktop-h" as any]: `${desktop}px`,
        ["--mobile-h" as any]: `${mobile}px`,
      }}
      className="w-full flex items-center justify-center relative select-none h-[var(--mobile-h)] md:h-[var(--desktop-h)]"
    >
      {content?.showDivider && (
        <div className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="w-full border-b border-daxul-black/10" />
        </div>
      )}
    </div>
  );
}
