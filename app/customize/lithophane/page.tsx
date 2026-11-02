import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LithophaneBuilder from "@/components/lithophane/LithophaneBuilder";
import { getSiteSettings } from "@/lib/catalog";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: `Custom Lithophane Builder | ${s.brandName}`,
    description: "Upload a photo and preview your custom 3D-printed lithophane in 3D, then choose a frame, table stand or light box.",
    alternates: { canonical: "/customize/lithophane" },
  };
}

export default async function LithophanePage() {
  let row: { headline: string; subheadline: string } | null = null;
  try {
    row = await prisma.lithophaneSettings.findUnique({ where: { id: "default" } });
  } catch {
    row = null;
  }
  const headline = row?.headline ?? "Turn your photo into light";
  const sub = row?.subheadline ?? "Upload a photo. We turn it into a custom 3D-printed lithophane.";
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-daxul-bone font-sans text-daxul-black">
      <Header />
      <section className="border-b border-daxul-black/10 py-10 sm:py-16">
        <div className="mx-auto max-w-[1440px] space-y-3 px-4 sm:px-6 lg:px-10">
          <span className="block font-mono text-xs uppercase tracking-[0.25em] text-[#71717A]">Custom Lithophane</span>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-daxul-black sm:text-5xl">{headline}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-[#555550]">{sub}</p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <LithophaneBuilder />
      </section>
      <Footer />
    </main>
  );
}
