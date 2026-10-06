"use client";

import React, { use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { ShieldCheck, FileText, ArrowLeft } from "lucide-react";

export default function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { siteSettings } = useStore();

  let title = "Store Policy";
  let content = "";

  switch (slug) {
    case "shipping":
      title = "Shipping & Delivery Policy";
      content = siteSettings.shippingPolicyText;
      break;
    case "return":
      title = "Return & Replacement Policy";
      content = siteSettings.returnPolicyText;
      break;
    case "privacy":
      title = "Privacy & Encryption Policy";
      content = siteSettings.privacyPolicyText;
      break;
    case "terms":
      title = "Terms & Conditions";
      content = siteSettings.termsConditionsText;
      break;
    case "cancellation":
      title = "Cancellation Policy";
      content = siteSettings.cancellationPolicyText;
      break;
    default:
      title = "DAXUL LABS Store Policies";
      content = siteSettings.shippingPolicyText;
  }

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      <section className="bg-[#151515] border-b border-[#242426] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-mono text-[#C8FF35] uppercase mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
          </Link>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">{title}</h1>
          <p className="text-xs font-mono text-gray-400">Official DAXUL LABS Governance Document</p>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-[#151515] border border-[#242426] p-8 sm:p-12 rounded-3xl space-y-6 text-sm text-gray-300 leading-relaxed shadow-2xl">
          <div className="flex items-center gap-3 text-[#C8FF35] font-bold text-base border-b border-[#242426] pb-4">
            <ShieldCheck className="w-6 h-6" />
            <span>Policy Terms & Governance</span>
          </div>

          <div className="whitespace-pre-line text-gray-300 space-y-4">
            {content}
          </div>

          <div className="pt-6 border-t border-[#242426] text-xs text-gray-500 flex justify-between">
            <span>DAXUL LABS Legal Team</span>
            <span>Last Updated: 2026</span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
