import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCollections, getProducts, getSiteSettings } from "@/lib/catalog";
import ShopClient from "./ShopClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: `Shop | ${s.brandName}`,
    description: s.seoDescription,
    alternates: { canonical: "/shop" },
    openGraph: s.defaultOgImage ? { images: [s.defaultOgImage] } : undefined,
  };
}

export default async function ShopPage() {
  const [products, collections] = await Promise.all([getProducts(), getCollections()]);

  return (
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />
      <ShopClient
        products={products}
        collections={collections.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      />
      <Footer />
    </main>
  );
}
