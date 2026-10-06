"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { ArrowUpRight, Sparkles } from "lucide-react";

export default function CollectionsPage() {
  const { collections, products } = useStore();

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#151515] border-b border-[#242426] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35]">
            CURATED DESIGN TAXONOMY
          </span>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">
            ALL COLLECTIONS
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Explore curated series spanning shadow projection lamps, couple monoliths, devotional altars, desk organizers, and experimental lab drops.
          </p>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((col) => {
            const count = products.filter(
              (p) => p.category.toLowerCase() === col.name.toLowerCase() || p.slug.includes(col.slug)
            ).length;

            return (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                className="group bg-[#151515] border border-[#242426] hover:border-[#C8FF35] rounded-3xl overflow-hidden shadow-xl transition-all duration-500 flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] bg-[#0B0B0C] overflow-hidden">
                  <img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {col.badge && (
                    <span className="absolute top-4 left-4 bg-[#0B0B0C]/80 backdrop-blur text-[#C8FF35] text-xs font-mono uppercase tracking-wider px-3 py-1 rounded border border-[#242426]">
                      {col.badge}
                    </span>
                  )}
                  <span className="absolute bottom-4 right-4 bg-[#0B0B0C]/90 text-white text-xs font-mono px-3 py-1 rounded border border-[#242426]">
                    {count || 4} Objects
                  </span>
                </div>

                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-black uppercase text-white group-hover:text-[#C8FF35] transition-colors">
                      {col.name}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-2">
                      {col.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#242426] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#C8FF35]">
                    <span>Explore Series</span>
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <Footer />
    </main>
  );
}
