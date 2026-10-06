"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { ArrowRight, Sparkles, ShieldCheck, Cpu, Layers } from "lucide-react";

export default function AboutPage() {
  const { siteSettings } = useStore();

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Hero */}
      <section className="bg-[#151515] border-b border-[#242426] py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35]">
            BRAND MANIFESTO & CRAFTSMANSHIP
          </span>
          <h1 className="text-4xl sm:text-7xl font-black uppercase tracking-tight leading-none">
            WE DON'T PRINT THINGS.<br />
            WE BUILD OBJECTS WORTH KEEPING.
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {siteSettings.brandDescription}
          </p>
        </div>
      </section>

      {/* Story Content */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
          <h2 className="text-2xl font-black uppercase text-[#C8FF35]">The Philosophy of DAXUL LABS</h2>
          <p>
            DAXUL LABS was founded on a simple realization: standard mass manufacturing strips products of personal soul, while generic 3D printing services produce cheap plastic trinkets. We exist in the high-end space between.
          </p>
          <p>
            By combining algorithmic 3D optics, precision multi-axis additive hardware, and organic bio-polymers, we craft physical monoliths, shadow projection lamps, and custom collectibles that feel like living art.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#242426]">
          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-2">
            <span className="text-xs font-mono text-[#C8FF35] font-bold">01 / DESIGN FIRST</span>
            <h3 className="text-sm font-bold text-white uppercase">Form Leads Function</h3>
            <p className="text-xs text-gray-400">Optics and spatial geometry are calculated before a single layer of filament is laid.</p>
          </div>

          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-2">
            <span className="text-xs font-mono text-[#C8FF35] font-bold">02 / CRAFT & CODE</span>
            <h3 className="text-sm font-bold text-white uppercase">Additive Precision</h3>
            <p className="text-xs text-gray-400">Layer heights tuned to 0.12mm with hand-inspected electronic COB LED drivers.</p>
          </div>

          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-2">
            <span className="text-xs font-mono text-[#C8FF35] font-bold">03 / ON-DEMAND</span>
            <h3 className="text-sm font-bold text-white uppercase">Zero Overproduction</h3>
            <p className="text-xs text-gray-400">Every single piece is manufactured specifically for you upon order placement.</p>
          </div>
        </div>

        <div className="text-center pt-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[#C8FF35] text-[#0B0B0C] px-8 py-4 rounded-full text-xs font-extrabold uppercase tracking-wider hover:bg-white transition-colors"
          >
            <span>Explore The Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
