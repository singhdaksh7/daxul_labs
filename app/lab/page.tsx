import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/catalog";
import { Cpu, Layers, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const products = await getProducts();

  const labProducts = products.filter(
    (p) =>
      p.category.toLowerCase().includes("experimental") ||
      p.category.toLowerCase().includes("collectible") ||
      p.badge?.toLowerCase().includes("lab") ||
      p.badge?.toLowerCase().includes("limited")
  );

  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      {/* Lab Header */}
      <section className="py-16 sm:py-20 border-b border-daxul-black/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-4">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block">
            R&D Dispatch
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold uppercase tracking-tight text-daxul-black">
            DAXUL LAB
          </h1>
          <p className="text-sm sm:text-base text-[#555550] max-w-2xl leading-relaxed">
            Experiments, prototypes, and print-in-place kinematics pushed beyond industrial standards.
          </p>
        </div>
      </section>

      {/* Lab Pillars */}
      <section className="py-12 border-b border-daxul-black/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-daxul-black/10 p-6 rounded-xl space-y-2">
            <span className="font-mono text-xs font-bold text-daxul-black block">01 / RESOLUTION</span>
            <h3 className="text-sm font-bold uppercase text-daxul-black">0.12mm Micro-Slicing</h3>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Ultra-high layer resolution eliminates visible striations while maximizing wall optical clarity.
            </p>
          </div>

          <div className="bg-white border border-daxul-black/10 p-6 rounded-xl space-y-2">
            <span className="font-mono text-xs font-bold text-daxul-black block">02 / STRUCTURE</span>
            <h3 className="text-sm font-bold uppercase text-daxul-black">Gyroid Infill Geometry</h3>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Mathematical minimal surfaces provide highest strength-to-weight ratio with internal light diffusion.
            </p>
          </div>

          <div className="bg-white border border-daxul-black/10 p-6 rounded-xl space-y-2">
            <span className="font-mono text-xs font-bold text-daxul-black block">03 / MECHANICS</span>
            <h3 className="text-sm font-bold uppercase text-daxul-black">Kinematic Art</h3>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Mechanisms with 0.2mm tolerances printed fully assembled without screws or manual assembly.
            </p>
          </div>
        </div>
      </section>

      {/* Experimental Drops */}
      <section className="flex-1 py-12 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full space-y-8">
        <div className="flex justify-between items-end border-b border-daxul-black/10 pb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#71717A] block">CATALOG</span>
            <h2 className="text-xl sm:text-2xl font-bold uppercase text-daxul-black">Experimental Objects</h2>
          </div>
          <span className="text-xs font-mono text-[#71717A]">Limited batches</span>
        </div>

        {labProducts.length === 0 ? (
          <div className="text-center py-16 text-[#71717A] text-xs font-mono uppercase tracking-widest">
            No active experimental releases right now. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {labProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
