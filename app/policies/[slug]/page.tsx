import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SafeMarkdown from "@/components/SafeMarkdown";
import { getPolicy, getSiteSettings, normalizePolicySlug } from "@/lib/catalog";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [policy, settings] = await Promise.all([getPolicy(slug), getSiteSettings()]);
  if (!policy) return { title: `Policy not found | ${settings.brandName}`, robots: { index: false } };
  return {
    title: `${policy.title} | ${settings.brandName}`,
    alternates: { canonical: `/policies/${policy.slug}` },
  };
}

export default async function PolicyPage({ params }: Params) {
  const { slug } = await params;
  const canonical = normalizePolicySlug(slug);
  if (!canonical) notFound();
  if (canonical !== slug) permanentRedirect(`/policies/${canonical}`); // e.g. legacy /policies/return

  const [policy, settings] = await Promise.all([getPolicy(canonical), getSiteSettings()]);
  if (!policy) notFound();

  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      <section className="py-12 sm:py-16 border-b border-daxul-black/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#71717A] hover:text-daxul-black mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
          </Link>
          <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">{policy.title}</h1>
          <p className="text-xs font-mono text-[#71717A] uppercase tracking-wider">Official {settings.brandName} Governance Document</p>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white border border-daxul-black/10 p-8 sm:p-12 rounded-xl space-y-6 text-sm text-[#555550] leading-relaxed shadow-sm">
          <div className="flex items-center gap-3 text-daxul-black font-bold text-base border-b border-daxul-black/10 pb-4">
            <ShieldCheck className="w-5 h-5 text-daxul-black" />
            <span>Policy Terms & Governance</span>
          </div>

          <SafeMarkdown source={policy.content} />

          <div className="pt-6 border-t border-daxul-black/10 text-xs text-[#71717A] flex justify-between">
            <span>{settings.brandName}</span>
            {policy.updatedAt && <span>Last Updated: {new Date(policy.updatedAt).toLocaleDateString("en-IN")}</span>}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
