"use client";

import React from "react";
import { InstagramSectionContent } from "@/lib/cms/pageTypes";
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export default function InstagramSection({ content }: { content: InstagramSectionContent }) {
  if (!content) return null;

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-daxul-black">
              {content.heading}
            </h2>
          </div>
          {content.handle && (
            <a
              href={content.handleUrl || `https://instagram.com/${content.handle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-daxul-black hover:text-daxul-black/70 transition-colors"
            >
              <InstagramIcon className="w-4 h-4" />
              <span>{content.handle}</span>
            </a>
          )}
        </div>

        {content.images && content.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {content.images.map((img, idx) => (
              <a
                key={img.id || idx}
                href={img.link || content.handleUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square bg-[#ECE8E0] overflow-hidden border border-daxul-black/10"
              >
                <img
                  src={img.url}
                  alt={img.caption || "Instagram feed"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-daxul-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <InstagramIcon className="w-6 h-6" />
                </div>
              </a>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
