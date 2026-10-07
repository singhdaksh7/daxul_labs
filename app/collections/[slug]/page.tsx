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
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />

      <section className="bg-daxul-dark border-b border-daxul-graphite py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center relative z-10">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1 text-xs font-mono text-daxul-lime hover:underline uppercase mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Collections
          </Link>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">{collection.name}</h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">{collection.description}</p>
        </div>
      </section>

      <section className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-base font-bold uppercase">No objects currently listed in this collection.</p>
            <Link href="/shop" className="text-daxul-lime text-xs font-bold uppercase underline mt-2 inline-block">
              View All Shop Objects
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
