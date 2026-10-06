"use client";

import React from "react";
import Link from "next/link";
import { useStore } from "@/lib/storeContext";
import { ArrowUpRight, MessageCircle, Mail, Phone, Shield, Cpu, Lock } from "lucide-react";

export default function Footer() {
  const { siteSettings, collections } = useStore();

  return (
    <footer className="bg-[#070708] border-t border-[#242426] text-gray-400 pt-16 pb-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-extrabold text-2xl tracking-[0.2em] text-white">
                {siteSettings.brandName.split(" ")[0]}
                <span className="text-[#C8FF35]">{siteSettings.brandName.split(" ")[1] || "LABS"}</span>
              </span>
              <div className="text-[10px] tracking-[0.4em] text-[#B9B9B4] font-medium uppercase mt-0.5">
                {siteSettings.brandTagline}
              </div>
            </Link>
            
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              {siteSettings.brandDescription}
            </p>

            {/* Direct WhatsApp & Contact */}
            <div className="pt-2 space-y-2">
              <a
                href={`https://wa.me/${siteSettings.whatsAppNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#151515] border border-[#242426] hover:border-[#C8FF35] text-white hover:text-[#C8FF35] px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span>Chat on WhatsApp ({siteSettings.whatsAppNumber})</span>
              </a>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#C8FF35]" /> {siteSettings.contactEmail}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Explore Store</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/shop" className="hover:text-[#C8FF35] transition-colors">
                  All Objects & Drops
                </Link>
              </li>
              <li>
                <Link href="/collections" className="hover:text-[#C8FF35] transition-colors">
                  Shop Collections
                </Link>
              </li>
              <li>
                <Link href="/customize" className="hover:text-[#C8FF35] transition-colors">
                  Custom Studio Builder
                </Link>
              </li>
              <li>
                <Link href="/lab" className="hover:text-[#C8FF35] transition-colors">
                  Inside The Lab (R&D)
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#C8FF35] transition-colors">
                  About DAXUL LABS
                </Link>
              </li>
            </ul>
          </div>

          {/* Collections list */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Categories</h4>
            <ul className="space-y-2 text-xs">
              {collections.slice(0, 5).map((col) => (
                <li key={col.id}>
                  <Link href={`/collections/${col.slug}`} className="hover:text-[#C8FF35] transition-colors">
                    {col.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policy & Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Customer Care</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/account" className="hover:text-[#C8FF35] transition-colors">
                  My Account & Orders
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-[#C8FF35] transition-colors">
                  Track Order Status
                </Link>
              </li>
              <li>
                <Link href="/policies/shipping" className="hover:text-[#C8FF35] transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/return" className="hover:text-[#C8FF35] transition-colors">
                  Return & Replacements
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="hover:text-[#C8FF35] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/terms" className="hover:text-[#C8FF35] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/policies/cancellation" className="hover:text-[#C8FF35] transition-colors">
                  Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-[#C8FF35] hover:underline font-bold transition-colors">
                  Admin Dashboard Login →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#242426] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>{siteSettings.footerText}</div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#C8FF35]" /> 256-bit Encrypted Checkout</span>
            <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-[#C8FF35]" /> Additive Manufacturing</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
