import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCollections, getSiteSettings } from "@/lib/catalog";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: `Collections | ${s.brandName}`,
    description: s.seoDescription,
    alternates: { canonical: "/collections" },
    openGraph: s.defaultOgImage ? { images: [s.defaultOgImage] } : undefined,
  };
}

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-daxul-dark border-b border-daxul-graphite py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-daxul-lime">CURATED DESIGN TAXONOMY</span>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">ALL COLLECTIONS</h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Explore curated series spanning shadow projection lamps, couple monoliths, devotional altars, desk
            organizers, and experimental lab drops.
          </p>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {collections.length === 0 ? (
          <div className="text-center py-20 text-gray-400 space-y-3">
            <p className="text-base font-bold uppercase text-gray-200">Collections are coming soon.</p>
            <Link href="/shop" className="text-daxul-lime text-xs font-bold uppercase underline inline-block">
              Browse All Objects
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                className="group bg-daxul-dark border border-daxul-graphite hover:border-daxul-lime daxul-card-lg overflow-hidden shadow-xl transition-all duration-500 flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] bg-daxul-black overflow-hidden">
                  {col.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={col.image}
                      alt={col.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  {col.badge && (
                    <span className="absolute top-4 left-4 bg-daxul-black/80 backdrop-blur text-daxul-lime text-xs font-mono uppercase tracking-wider px-3 py-1 rounded border border-daxul-graphite">
                      {col.badge}
                    </span>
                  )}
                  <span className="absolute bottom-4 right-4 bg-daxul-black/90 text-white text-xs font-mono px-3 py-1 rounded border border-daxul-graphite">
                    {col.productCount} {col.productCount === 1 ? "Object" : "Objects"}
                  </span>
                </div>

                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-black uppercase text-white group-hover:text-daxul-lime transition-colors">
                      {col.name}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-2">{col.description}</p>
                  </div>

                  <div className="pt-4 border-t border-daxul-graphite flex items-center justify-between text-xs font-bold uppercase tracking-wider text-daxul-lime">
                    <span>Explore Series</span>
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
