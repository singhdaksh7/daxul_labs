"use client";

import React, { useState } from "react";
import { HomepageSection } from "@/lib/types";
import { Mail, Check, ArrowRight } from "lucide-react";

interface NewsletterSectionProps {
  section?: HomepageSection;
}

export default function NewsletterSection({ section }: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const title = section?.title || "Join The Experimental Dispatch";
  const subtitle = section?.subtitle || "LIMITED DROPS & SECRET PROTO-RELEASES";
  const content =
    section?.content ||
    "Subscribe to get early access to limited edition 3D sculptures, custom design drops, and insider lab dispatches.";
  const ctaText = section?.ctaText || "Subscribe Now";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section className="bg-daxul-dark text-white py-20 lg:py-28 border-b border-daxul-graphite">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        
        <span className="text-xs font-mono uppercase tracking-[0.3em] text-daxul-lime">
          {subtitle}
        </span>

        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
          {title}
        </h2>

        <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
          {content}
        </p>

        {submitted ? (
          <div className="inline-flex items-center gap-2 bg-daxul-lime/10 border border-daxul-lime text-daxul-lime px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider">
            <Check className="w-4 h-4" />
            <span>Welcome to the DAXUL LABS Dispatch list!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-2 pt-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-4 top-3.5 text-gray-500" />
              <input
                type="email"
                required
                placeholder="ENTER YOUR EMAIL..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-daxul-black border border-daxul-graphite focus:border-daxul-lime rounded-full pl-11 pr-4 py-3 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-daxul-lime text-daxul-black hover:bg-white px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

      </div>
    </section>
  );
}
