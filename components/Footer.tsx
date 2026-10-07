"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import { useSiteSettings } from "@/lib/siteContext";

export default function Footer() {
  const { footer: cmsFooter } = useCms();
  const settings = useSiteSettings();

  const wordmarkText = cmsFooter?.wordmarkText || "DAXUL LABS";
  const tagline = cmsFooter?.tagline || "Objects made differently.";
  const copyrightLine = cmsFooter?.copyrightLine || settings.footerText || "© 2026 DAXUL LABS";
  const madeInIndiaText = cmsFooter?.madeInIndiaText || "Made in India.";
  const columns = cmsFooter?.columns || [];

  const isHttp = (u: string | null | undefined): u is string => !!u && /^https?:\/\//i.test(u);
  const whatsAppHref = isHttp(settings.whatsAppUrl)
    ? settings.whatsAppUrl
    : settings.whatsAppNumber
    ? `https://wa.me/${settings.whatsAppNumber.replace(/[^0-9]/g, "")}`
    : null;
  const socials = [
    { label: "Instagram", url: isHttp(settings.instagramUrl) ? settings.instagramUrl : null },
    { label: "WhatsApp", url: whatsAppHref },
    { label: "YouTube", url: isHttp(settings.youtubeUrl) ? settings.youtubeUrl : null },
    { label: "Facebook", url: isHttp(settings.facebookUrl) ? settings.facebookUrl : null },
  ].filter((x): x is { label: string; url: string } => !!x.url);

  return (
    <footer className="bg-daxul-black text-white border-t border-daxul-graphite pt-16 lg:pt-24 pb-12 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-16">
        
        {/* Large DAXUL LABS Wordmark & Tagline */}
        <div className="border-b border-daxul-graphite pb-12">
          <Link href="/" className="inline-block select-none group">
            <h2 className="text-5xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tighter text-white group-hover:text-white/80 transition-colors leading-none">
              {wordmarkText}
            </h2>
            <div className="font-mono text-xs sm:text-sm tracking-[0.35em] text-daxul-gray uppercase mt-3">
              {tagline}
            </div>
          </Link>
        </div>

        {/* Dynamic 4-Column Navigation Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 font-mono text-xs">
          {columns.map((col) => (
            <div key={col.id || col.heading} className="space-y-4">
              <div className="text-[10px] tracking-[0.25em] text-daxul-gray uppercase">
                {col.heading}
              </div>
              <ul className="space-y-2.5 text-daxul-gray">
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

        {/* Social links (from Store Settings) */}
        {socials.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-daxul-gray">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}

        {/* Minimal Bottom Line */}
        <div className="pt-8 border-t border-daxul-graphite flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-[10px] text-daxul-gray uppercase tracking-widest">
          <div>{copyrightLine}</div>
          <div>{madeInIndiaText}</div>
        </div>

      </div>
    </footer>
  );
}
