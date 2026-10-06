"use client";

import React, { use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { ShoppingBag, Sliders, ArrowLeft } from "lucide-react";

export default function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { collections, products, addToCart, siteSettings } = useStore();

  const collection = collections.find((c) => c.slug === slug || c.id === slug);
  
  // Filter products by collection slug or matching category
  const collectionProducts = products.filter(
    (p) =>
      !p.isArchived &&
      (collection
        ? p.category.toLowerCase().includes(collection.name.toLowerCase()) || collection.name.toLowerCase().includes(p.category.toLowerCase())
        : true)
  );

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#151515] border-b border-[#242426] py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center relative z-10">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1 text-xs font-mono text-[#C8FF35] hover:underline uppercase mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Collections
          </Link>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">
            {collection?.name || slug.replace("-", " ")}
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            {collection?.description || "Curated 3D printed objects designed for modern physical spaces."}
          </p>
        </div>
      </section>

      {/* Product Grid */}
      <section className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {collectionProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-base font-bold uppercase">No objects currently listed in this collection.</p>
            <Link href="/shop" className="text-[#C8FF35] text-xs font-bold uppercase underline mt-2 inline-block">
              View All Shop Objects
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collectionProducts.map((product) => (
              <div
                key={product.id}
                className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg"
              >
                {/* Image */}
                <div className="relative aspect-square bg-[#0B0B0C] overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {product.badge && (
                    <span className="absolute top-3 left-3 bg-[#0B0B0C]/80 backdrop-blur text-[#C8FF35] text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-[#242426]">
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#B9B9B4] block mb-1">
                      {product.category}
                    </span>
                    <Link
                      href={`/shop/${product.slug}`}
                      className="text-base font-bold text-white group-hover:text-[#C8FF35] transition-colors line-clamp-1 block"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="pt-3 border-t border-[#242426] flex items-center justify-between">
                    <span className="text-base font-black text-white">
                      {siteSettings.currencySymbol}{product.price}
                    </span>

                    <div className="flex gap-2">
                      <Link
                        href={`/shop/${product.slug}`}
                        className="bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] text-white p-2 rounded-xl transition-all"
                        title="Configure Custom Options"
                      >
                        <Sliders className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() =>
                          addToCart({
                            product,
                            quantity: 1,
                            selectedFinish: product.finishes[0],
                            selectedColor: product.colors[0],
                            selectedSize: product.sizes[0],
                            customizations: {},
                            customizationFee: 0,
                            totalUnitPrice: product.price,
                          })
                        }
                        className="bg-[#C8FF35] text-[#0B0B0C] hover:bg-white p-2 rounded-xl transition-all font-bold"
                        title="Add to Cart"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
