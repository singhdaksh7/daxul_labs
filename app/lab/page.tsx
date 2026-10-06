"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { FlaskConical, Cpu, Layers, Sparkles, ShieldAlert, ArrowRight } from "lucide-react";

export default function LabPage() {
  const { products } = useStore();

  const labProducts = products.filter(
    (p) => p.category.toLowerCase().includes("experimental") || p.badge?.includes("Lab") || p.badge?.includes("Limited")
  );

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Lab Hero */}
      <section className="bg-[#151515] border-b border-[#242426] py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#242426_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8FF35]/10 border border-[#C8FF35]/30 text-xs font-mono uppercase tracking-[0.25em] text-[#C8FF35]">
            <FlaskConical className="w-4 h-4" />
            <span>R&D DISPATCH / ADDITIVE FABRICATION LAB</span>
          </div>

          <h1 className="text-4xl sm:text-7xl font-black uppercase tracking-tight">
            INSIDE DAXUL LAB.
          </h1>

          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Where computational geometry, non-assembly print-in-place mechanics, and organic bio-polymers are pushed beyond industrial standards.
          </p>
        </div>
      </section>

      {/* Lab R&D Pillars */}
      <section className="py-16 bg-[#0B0B0C] border-b border-[#242426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0B0C] border border-[#242426] flex items-center justify-center text-[#C8FF35]">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold uppercase text-white">0.12mm Layer Micro-Slicing</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ultra-high layer resolution eliminates visible striations while maximizing wall optical clarity for shadow projection.
            </p>
          </div>

          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0B0C] border border-[#242426] flex items-center justify-center text-[#C8FF35]">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold uppercase text-white">Triply Periodic Gyroid Infill</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Mathematical minimal surfaces provide highest strength-to-weight ratio with 100% internal light diffusion channels.
            </p>
          </div>

          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0B0C] border border-[#242426] flex items-center justify-center text-[#C8FF35]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold uppercase text-white">Print-in-Place Kinematic Art</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Mechanisms with 0.2mm tolerances printed fully assembled without glue, screws, or manual assembly steps.
            </p>
          </div>
        </div>
      </section>

      {/* Experimental Drops */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        <div className="flex justify-between items-end border-b border-[#242426] pb-4">
          <div>
            <span className="text-xs font-mono text-[#C8FF35] uppercase tracking-widest block">ACTIVE R&D BATCH</span>
            <h2 className="text-2xl font-black uppercase">Experimental Objects Showcase</h2>
          </div>
          <span className="text-xs font-mono text-gray-400">Micro-batches: 50 units max</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {labProducts.map((p) => (
            <Link
              key={p.id}
              href={`/shop/${p.slug}`}
              className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] p-5 rounded-2xl group transition-all"
            >
              <div className="aspect-square bg-[#0B0B0C] rounded-xl overflow-hidden mb-4 relative">
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <span className="absolute top-3 left-3 bg-[#0B0B0C] text-[#C8FF35] text-[10px] font-mono px-2.5 py-1 rounded">
                  {p.badge || "Lab Release"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#C8FF35] transition-colors">{p.name}</h3>
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">{p.description}</p>
              <div className="pt-3 border-t border-[#242426] mt-4 flex items-center justify-between text-xs font-extrabold text-[#C8FF35]">
                <span>View Prototype Spec</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
