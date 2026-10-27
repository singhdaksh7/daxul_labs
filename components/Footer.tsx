"use client";

import React from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import { useSiteSettings } from "@/lib/siteContext";

export default function Footer() {
  const { footer: cmsFooter } = useCms();
  const settings = useSiteSettings();
  const [dynamicFooterLinks, setDynamicFooterLinks] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    fetch("/api/navigation?handle=footer")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.menu?.items && data.menu.items.length > 0) {
          setDynamicFooterLinks(data.menu.items.filter((i: any) => i.isActive));
        }
      })
      .catch(() => {});
  }, []);

  const wordmarkText = cmsFooter?.wordmarkText || settings.brandName || "DAXUL LABS";
  const tagline = cmsFooter?.tagline || settings.brandTagline || "Objects made differently.";
  const copyrightLine = cmsFooter?.copyrightLine || settings.footerText || "© 2026 DAXUL LABS";
  const madeInIndiaText = cmsFooter?.madeInIndiaText || "Crafted on-demand in India.";

  const isHttp = (u: string | null | undefined): u is string => !!u && /^https?:\/\//i.test(u);
  const whatsAppHref = isHttp(settings.whatsAppUrl)
    ? settings.whatsAppUrl
    : settings.whatsAppNumber
    ? `https://wa.me/${settings.whatsAppNumber.replace(/[^0-9]/g, "")}`
    : null;

  return (
    <footer className="bg-daxul-bone text-daxul-black border-t border-daxul-black/10 pt-16 sm:pt-20 pb-12 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
        
        {/* Top: Wordmark & Tagline */}
        <div className="space-y-2 pb-8 border-b border-daxul-black/10">
          <Link href="/" className="inline-block select-none">
            <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">
              {wordmarkText}
            </h2>
          </Link>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A]">
            {tagline}
          </p>
        </div>

        {/* Columns Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 text-xs">
          
          {/* Col 1: Shop */}
          <div className="space-y-3.5">
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#71717A] uppercase font-semibold">
              Explore
            </div>
            <ul className="space-y-2 text-[#555550]">
              <li>
                <Link href="/shop" className="hover:text-daxul-black transition-colors">
                  Shop All Objects
                </Link>
              </li>
              <li>
                <Link href="/collections" className="hover:text-daxul-black transition-colors">
                  Collections
                </Link>
              </li>
              <li>
                <Link href="/customize" className="hover:text-daxul-black transition-colors">
                  Customize
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: About & Info */}
          <div className="space-y-3.5">
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#71717A] uppercase font-semibold">
              About
            </div>
            <ul className="space-y-2 text-[#555550]">
              <li>
                <Link href="/about" className="hover:text-daxul-black transition-colors">
                  About DAXUL
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-daxul-black transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-daxul-black transition-colors">
                  Account & Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Policies */}
          <div className="space-y-3.5">
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#71717A] uppercase font-semibold">
              Policies
            </div>
            <ul className="space-y-2 text-[#555550]">
              <li>
                <Link href="/policies/shipping" className="hover:text-daxul-black transition-colors">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link href="/policies/returns" className="hover:text-daxul-black transition-colors">
                  Returns & Replacement
                </Link>
              </li>
              <li>
                <Link href="/policies/terms" className="hover:text-daxul-black transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="hover:text-daxul-black transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Support & Social (from Store Settings) */}
          <div className="space-y-3.5">
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#71717A] uppercase font-semibold">
              Support
            </div>
            <ul className="space-y-2 text-[#555550]">
              {settings.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-daxul-black transition-colors">
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings.contactPhone && (
                <li>
                  <a href={`tel:${settings.contactPhone}`} className="hover:text-daxul-black transition-colors">
                    {settings.contactPhone}
                  </a>
                </li>
              )}
              {whatsAppHref && (
                <li>
                  <a href={whatsAppHref} target="_blank" rel="noopener noreferrer" className="hover:text-daxul-black transition-colors">
                    WhatsApp {settings.whatsAppNumber || "Support"}
                  </a>
                </li>
              )}
              {settings.instagramUrl && (
                <li>
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-daxul-black transition-colors">
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* Minimal Bottom Line */}
        <div className="pt-8 border-t border-daxul-black/10 flex flex-col sm:flex-row justify-between items-center gap-3 font-mono text-[10px] text-[#71717A] uppercase tracking-wider">
          <div>{copyrightLine}</div>
          <div>{madeInIndiaText}</div>
        </div>

      </div>
    </footer>
  );
}
