import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProducts, getSiteSettings } from "@/lib/catalog";
import { formatMoney } from "@/lib/cartPricing";
import { Upload, Palette, Cpu, Hammer, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: `Customize | ${s.brandName}`,
    description: s.seoDescription,
    alternates: { canonical: "/customize" },
  };
}

export default async function CustomizePage() {
  const [products, s] = await Promise.all([getProducts(), getSiteSettings()]);
  const customizable = products.filter((p) => p.customizable);

  const steps = [
    { icon: Upload, title: s.customizationStep1Title, desc: s.customizationStep1Desc },
    { icon: Palette, title: s.customizationStep2Title, desc: s.customizationStep2Desc },
    { icon: Cpu, title: s.customizationStep3Title, desc: s.customizationStep3Desc },
    { icon: Hammer, title: s.customizationStep4Title, desc: s.customizationStep4Desc },
  ];

  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      <section className="py-14 sm:py-20 border-b border-daxul-black/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-3">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block">
            Custom Objects
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">
            Customize Your Object
          </h1>
          <p className="text-sm text-[#555550] max-w-xl leading-relaxed">
            Turn your personal photos, portraits, logos, and ideas into light-refracting projection lamps and monoliths.
          </p>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full space-y-12">
        {/* Process */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="bg-white border border-daxul-black/10 rounded-xl p-6 space-y-3">
                <Icon className="w-5 h-5 text-daxul-black" />
                <h3 className="text-sm font-bold uppercase text-daxul-black">{st.title}</h3>
                <p className="text-xs text-[#71717A] leading-relaxed">{st.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Customizable objects */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-daxul-black">
            Choose an object to personalize
          </h2>
          {customizable.length === 0 ? (
            <div className="text-center py-14 bg-white border border-daxul-black/10 rounded-xl text-[#71717A] text-sm">
              Personalized objects are being prepared. Browse the{" "}
              <Link href="/shop" className="text-daxul-black font-semibold underline">
                full catalog
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {customizable.map((p) => (
                <Link
                  key={p.id}
                  href={`/shop/${p.slug}`}
                  className="flex items-center gap-4 bg-white border border-daxul-black/10 hover:border-daxul-black rounded-xl p-4 group transition-all"
                >
                  <div className="w-20 h-20 rounded-lg bg-[#EAE5DA] overflow-hidden shrink-0">
                    {p.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#71717A]">{p.category}</div>
                    <div className="text-sm font-bold text-daxul-black group-hover:underline truncate">
                      {p.name}
                    </div>
                    <div className="text-xs font-semibold text-daxul-black mt-1">
                      From {formatMoney(s.currencySymbol, p.price)}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-daxul-black group-hover:translate-x-1 transition-transform" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
