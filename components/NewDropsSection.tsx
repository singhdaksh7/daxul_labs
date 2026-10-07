"use client";

import React from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { StoreProduct } from "@/lib/types";
import { ArrowRight } from "lucide-react";

interface NewDropsSectionProps {
  /** Active products from the database (server-fetched). */
  products: StoreProduct[];
  totalCount: number;
}

export default function NewDropsSection({ products, totalCount }: NewDropsSectionProps) {
  const title = "New Drops & Bestsellers";
  const subtitle = "ON-DEMAND PRODUCTION RUNS";
  const badgeText = "ACTIVE CATALOG";

  return (
    <section className="bg-daxul-black text-white py-20 lg:py-32 border-b border-daxul-graphite">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-daxul-graphite">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.3em] text-daxul-lime block mb-1">
              {badgeText} — {subtitle}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">{title}</h2>
          </div>

          <Link
            href="/shop"
            className="mt-4 md:mt-0 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-daxul-lime hover:text-white transition-colors"
          >
            <span>{totalCount > 0 ? `View Full Catalog (${totalCount} Objects)` : "Visit The Shop"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-400 space-y-2">
            <p className="text-base font-bold uppercase text-gray-200">New drops are on the way.</p>
            <p className="text-xs font-mono uppercase tracking-widest">Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
