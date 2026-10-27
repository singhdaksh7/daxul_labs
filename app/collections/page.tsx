import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCollections, getSiteSettings } from "@/lib/catalog";
import { ArrowRight } from "lucide-react";

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
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      <div className="flex-1 py-10 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full">
        {/* Header */}
        <div className="pb-8 border-b border-daxul-black/10">
          <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">
            Collections
          </h1>
          <p className="text-sm text-[#555550] max-w-xl leading-relaxed mt-2">
            Explore curated series of shadow projection lamps, personalized objects, altars, and desk organizers.
          </p>
        </div>

        {/* Collections Grid */}
        <div className="py-10">
          {collections.length === 0 ? (
            <div className="text-center py-20 text-[#71717A] space-y-3">
              <p className="text-sm font-semibold uppercase text-daxul-black">Collections are coming soon.</p>
              <Link href="/shop" className="text-daxul-black text-xs font-semibold uppercase underline inline-block">
                Browse All Objects
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="group block relative overflow-hidden rounded-xl border border-daxul-black/10 bg-[#EAE5DA]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    {col.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={col.image}
                        alt={col.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-daxul-black/70 via-daxul-black/10 to-transparent pointer-events-none" />

                    <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
                      <div>
                        <h3 className="text-xl font-bold uppercase tracking-tight text-white drop-shadow-sm">
                          {col.name}
                        </h3>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/80">
                          {col.productCount} {col.productCount === 1 ? "Object" : "Objects"}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white group-hover:text-daxul-lime transition-colors">
                        <span>Explore</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
