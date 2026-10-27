import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteSettings, getCatalog } from "@/lib/catalog";
import { getCmsPageBySlug } from "@/lib/cms/pageService";
import CmsSectionRenderer from "@/components/cms/CmsSectionRenderer";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [siteSettings, cmsPage, { products, collections }] = await Promise.all([
    getSiteSettings(),
    getCmsPageBySlug("about"),
    getCatalog(),
  ]);

  if (cmsPage && cmsPage.sections && cmsPage.sections.length > 0) {
    return (
      <div className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
        <Header />
        <main className="flex-1">
          {cmsPage.sections.map((section: any) => (
            <CmsSectionRenderer
              key={section.id}
              section={section as any}
              products={products}
              collections={collections}
            />
          ))}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      <section className="py-16 sm:py-24 border-b border-daxul-black/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#71717A] block">
            About DAXUL LABS
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold uppercase tracking-tight text-daxul-black leading-tight">
            Objects made differently.
          </h1>
          <p className="text-base sm:text-lg text-[#555550] max-w-2xl mx-auto leading-relaxed">
            {siteSettings.brandDescription}
          </p>
        </div>
      </section>

      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 flex-1">
        <div className="space-y-6 text-sm text-[#555550] leading-relaxed">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-daxul-black">
            The Philosophy
          </h2>
          <p>
            DAXUL LABS is an independent 3D design studio in India. We combine algorithmic 3D optics, precision additive manufacturing, and organic bio-polymers to create lighting objects, personalized monoliths, devotional altars, and workspace decor.
          </p>
          <p>
            Every object is crafted on-demand with intention, balancing modern physical aesthetics with functional illumination. Designed and made in India.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-daxul-black/10">
          <div className="space-y-1.5">
            <span className="font-mono text-xs font-bold text-daxul-black block">01 / DESIGN FIRST</span>
            <h3 className="text-xs font-bold uppercase text-daxul-black">Form Leads Function</h3>
            <p className="text-xs text-[#71717A]">Optics and spatial geometry are calculated before physical build.</p>
          </div>

          <div className="space-y-1.5">
            <span className="font-mono text-xs font-bold text-daxul-black block">02 / ADDITIVE PRECISION</span>
            <h3 className="text-xs font-bold uppercase text-daxul-black">Modern Craft</h3>
            <p className="text-xs text-[#71717A]">Multi-axis precision builds hand-assembled with warm LED optics.</p>
          </div>

          <div className="space-y-1.5">
            <span className="font-mono text-xs font-bold text-daxul-black block">03 / ON-DEMAND</span>
            <h3 className="text-xs font-bold uppercase text-daxul-black">Zero Overproduction</h3>
            <p className="text-xs text-[#71717A]">Manufactured specifically for you upon order placement.</p>
          </div>
        </div>

        <div className="pt-6">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-semibold px-7 py-3.5 rounded-lg text-xs uppercase tracking-widest border border-daxul-black transition-colors"
          >
            <span>Explore The Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
