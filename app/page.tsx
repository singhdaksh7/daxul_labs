import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeSections from "@/components/HomeSections";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans selection:bg-daxul-lime selection:text-daxul-black">
      <Header />
      <div className="flex-1">
        <HomeSections products={products.slice(0, 24)} totalCount={products.length} />
      </div>
      <Footer />
    </main>
  );
}
