import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProductByIdOrSlug, getRelatedProducts, getSiteSettings } from "@/lib/catalog";
import ProductClient from "./ProductClient";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const [product, settings] = await Promise.all([getProductByIdOrSlug(id), getSiteSettings()]);
  if (!product) return { title: `Object not found | ${settings.brandName}`, robots: { index: false } };

  const title = product.seoTitle || `${product.name} | ${settings.brandName}`;
  const description = product.seoDescription || product.subtitle || product.description.slice(0, 200);
  const og = product.ogImage || product.images[0] || settings.defaultOgImage || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: { title, description, type: "website", ...(og ? { images: [og] } : {}) },
  };
}

export default async function ProductDetailPage({ params }: Params) {
  const { id } = await params;
  const product = await getProductByIdOrSlug(id);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.category, 4);

  return (
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />
      <ProductClient product={product} related={related} />
      <Footer />
    </main>
  );
}
