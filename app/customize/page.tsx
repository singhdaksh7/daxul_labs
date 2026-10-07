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

/**
 * Personalization is configured on each product page, where the server-defined
 * custom fields (text, uploads, dates, choices) and their fees live. This page
 * lists the customizable objects and explains the process.
 */
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
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />

      <section className="bg-daxul-dark border-b border-daxul-graphite py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-daxul-lime">BESPOKE ADDITIVE STUDIO</span>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">Customize Your Object.</h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Turn your personal photos, couple portraits, vector logos, and sketches into 3D light-refracting projection
            lamps and monolith sculptures.
          </p>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10">
        {/* Process */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="bg-daxul-dark border border-daxul-graphite rounded-2xl p-5 space-y-2">
                <Icon className="w-5 h-5 text-daxul-lime" />
                <h3 className="text-sm font-extrabold uppercase text-white">{st.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{st.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Customizable objects */}
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-tight">Choose an object to personalize</h2>
          {customizable.length === 0 ? (
            <div className="text-center py-14 bg-daxul-dark border border-daxul-graphite rounded-2xl text-gray-400 text-sm">
              Personalized objects are being prepared. Browse the{" "}
              <Link href="/shop" className="text-daxul-lime underline">
                full catalog
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customizable.map((p) => (
                <Link
                  key={p.id}
                  href={`/shop/${p.slug}`}
                  className="flex items-center gap-4 bg-daxul-dark border border-daxul-graphite hover:border-daxul-lime rounded-2xl p-4 group transition-all"
                >
                  <div className="w-20 h-20 rounded-xl bg-daxul-black overflow-hidden shrink-0">
                    {p.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-daxul-gray">{p.category}</div>
                    <div className="text-sm font-bold text-white group-hover:text-daxul-lime transition-colors truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-400">From {formatMoney(s.currencySymbol, p.price)}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-daxul-lime" />
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
