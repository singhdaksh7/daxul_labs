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
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />

      <section className="bg-daxul-dark border-b border-daxul-graphite py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-mono text-daxul-lime uppercase mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
          </Link>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">{policy.title}</h1>
          <p className="text-xs font-mono text-gray-400">Official {settings.brandName} Governance Document</p>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-daxul-dark border border-daxul-graphite p-8 sm:p-12 rounded-3xl space-y-6 text-sm text-gray-300 leading-relaxed shadow-2xl">
          <div className="flex items-center gap-3 text-daxul-lime font-bold text-base border-b border-daxul-graphite pb-4">
            <ShieldCheck className="w-6 h-6" />
            <span>Policy Terms & Governance</span>
          </div>

          <SafeMarkdown source={policy.content} />

          <div className="pt-6 border-t border-daxul-graphite text-xs text-gray-500 flex justify-between">
            <span>{settings.brandName}</span>
            {policy.updatedAt && <span>Last Updated: {new Date(policy.updatedAt).toLocaleDateString("en-IN")}</span>}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
