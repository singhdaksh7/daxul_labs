import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getCollectionWithProducts, getSiteSettings } from "@/lib/catalog";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [data, settings] = await Promise.all([getCollectionWithProducts(slug), getSiteSettings()]);
  if (!data) return { title: `Collection not found | ${settings.brandName}`, robots: { index: false } };
  const c = data.collection;
  const title = c.seoTitle || `${c.name} | ${settings.brandName}`;
  const description = c.seoDescription || c.description || settings.seoDescription;
  const og = c.ogImage || c.image || settings.defaultOgImage || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title, description, ...(og ? { images: [og] } : {}) },
  };
}

export default async function CollectionDetailPage({ params }: Params) {
  const { slug } = await params;
  const data = await getCollectionWithProducts(slug);
  if (!data) notFound();
  const { collection, products } = data;

  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      <div className="flex-1 py-10 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full">
        {/* Header: Back link, Title, Short description */}
        <div className="pb-8 border-b border-daxul-black/10">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#71717A] hover:text-daxul-black mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Collections
          </Link>
          <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-sm text-[#555550] max-w-xl leading-relaxed mt-2">
              {collection.description}
            </p>
          )}
        </div>

        {/* Product Grid */}
        <div className="py-10">
          {products.length === 0 ? (
            <div className="text-center py-20 text-[#71717A] space-y-3">
              <p className="text-sm font-semibold uppercase text-daxul-black">No objects currently listed in this collection.</p>
              <Link href="/shop" className="text-daxul-black underline text-xs font-semibold uppercase inline-block">
                View All Shop Objects
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
