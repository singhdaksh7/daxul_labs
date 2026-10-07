"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";

export default function Footer() {
  const { footer: cmsFooter } = useCms();

  const wordmarkText = cmsFooter?.wordmarkText || "DAXUL LABS";
  const tagline = cmsFooter?.tagline || "Objects made differently.";
  const copyrightLine = cmsFooter?.copyrightLine || "© 2026 DAXUL LABS";
  const madeInIndiaText = cmsFooter?.madeInIndiaText || "Made in India.";
  const columns = cmsFooter?.columns || [];

  return (
    <footer className="bg-[#0B0B0C] text-white border-t border-[#242426] pt-16 lg:pt-24 pb-12 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-16">
        
        {/* Large DAXUL LABS Wordmark & Tagline */}
        <div className="border-b border-[#242426] pb-12">
          <Link href="/" className="inline-block select-none group">
            <h2 className="text-5xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tighter text-white group-hover:text-white/80 transition-colors leading-none">
              {wordmarkText}
            </h2>
            <div className="font-mono text-xs sm:text-sm tracking-[0.35em] text-[#B9B9B4] uppercase mt-3">
              {tagline}
            </div>
          </Link>
        </div>

        {/* Dynamic 4-Column Navigation Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 font-mono text-xs">
          {columns.map((col) => (
            <div key={col.id || col.heading} className="space-y-4">
              <div className="text-[10px] tracking-[0.25em] text-[#B9B9B4] uppercase">
                {col.heading}
              </div>
              <ul className="space-y-2.5 text-[#B9B9B4]">
                {col.links.map((link) => {
                  const isExternal = link.url.startsWith("http") || link.url.startsWith("mailto:");
                  if (isExternal) {
                    return (
                      <li key={link.url + link.label}>
                        <a
                          href={link.url}
                          target={link.url.startsWith("http") ? "_blank" : undefined}
                          rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={link.url + link.label}>
                      <Link href={link.url} className="hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Minimal Bottom Line */}
        <div className="pt-8 border-t border-[#242426] flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-[10px] text-[#B9B9B4] uppercase tracking-widest">
          <div>{copyrightLine}</div>
          <div>{madeInIndiaText}</div>
        </div>

      </div>
    </footer>
  );
}
