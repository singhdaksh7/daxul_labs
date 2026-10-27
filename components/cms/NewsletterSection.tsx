"use client";

import React, { useState } from "react";
import { NewsletterSectionContent } from "@/lib/cms/pageTypes";

export default function NewsletterSection({ content }: { content: NewsletterSectionContent }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  if (!content) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("success");
    setEmail("");
  };

  return (
    <section className="w-full bg-daxul-graphite text-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight">
          {content.heading}
        </h2>

        {content.description && (
          <p className="text-sm sm:text-base opacity-80 leading-relaxed">
            {content.description}
          </p>
        )}

        {status === "success" ? (
          <div className="p-4 bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-widest">
            Thank you for subscribing to our studio archive.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={content.placeholder || "Enter your email"}
              required
              className="bg-[#1D1D1F] border border-white/20 text-white placeholder-white/50 text-xs px-4 py-3.5 focus:outline-none focus:border-daxul-lime flex-1"
            />
            <button
              type="submit"
              className="bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] px-6 py-3.5 hover:bg-[#b8eb2f] transition-colors whitespace-nowrap"
            >
              {content.buttonText || "SUBSCRIBE"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
