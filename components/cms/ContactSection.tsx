"use client";

import React, { useState } from "react";
import { ContactSectionContent } from "@/lib/cms/pageTypes";
import { Mail, Phone, MessageSquare, MapPin } from "lucide-react";

export default function ContactSection({ content }: { content: ContactSectionContent }) {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!content) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry");
      }
      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full bg-daxul-bone py-16 sm:py-24 border-b border-daxul-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          
          {/* Left: Contact Info */}
          <div className="space-y-8">
            <div>
              <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-[#71717A] uppercase font-semibold mb-2">
                Studio Concierge
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">
                {content.heading}
              </h2>
              {content.description && (
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#555550]">
                  {content.description}
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-daxul-black/10 text-sm">
              {content.email && (
                <div className="flex items-center gap-3 text-daxul-black">
                  <Mail className="w-4 h-4 text-[#71717A]" />
                  <a href={`mailto:${content.email}`} className="hover:underline">
                    {content.email}
                  </a>
                </div>
              )}
              {content.phone && (
                <div className="flex items-center gap-3 text-daxul-black">
                  <Phone className="w-4 h-4 text-[#71717A]" />
                  <a href={`tel:${content.phone}`} className="hover:underline">
                    {content.phone}
                  </a>
                </div>
              )}
              {content.whatsApp && (
                <div className="flex items-center gap-3 text-daxul-black">
                  <MessageSquare className="w-4 h-4 text-[#71717A]" />
                  <a
                    href={`https://wa.me/${content.whatsApp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    WhatsApp: {content.whatsApp}
                  </a>
                </div>
              )}
              {content.address && (
                <div className="flex items-start gap-3 text-daxul-black">
                  <MapPin className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5" />
                  <span>{content.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive Form */}
          {content.showForm !== false && (
            <div className="bg-[#ECE8E0] p-6 sm:p-10 border border-daxul-black/10">
              <h3 className="text-lg font-bold uppercase tracking-wide text-daxul-black mb-6">
                Send an Inquiry
              </h3>

              {submitted ? (
                <div className="p-6 bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-widest text-center">
                  Your message has been submitted. Our team will contact you shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {errorMessage && (
                    <div className="p-3 bg-red-100 text-red-700 text-xs font-mono">
                      {errorMessage}
                    </div>
                  )}

                  <div>
                    <label className="block font-mono uppercase tracking-wider text-[#71717A] mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white border border-daxul-black/10 px-3.5 py-2.5 text-daxul-black focus:outline-none focus:border-daxul-black"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono uppercase tracking-wider text-[#71717A] mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white border border-daxul-black/10 px-3.5 py-2.5 text-daxul-black focus:outline-none focus:border-daxul-black"
                      />
                    </div>
                    <div>
                      <label className="block font-mono uppercase tracking-wider text-[#71717A] mb-1.5">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-white border border-daxul-black/10 px-3.5 py-2.5 text-daxul-black focus:outline-none focus:border-daxul-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono uppercase tracking-wider text-[#71717A] mb-1.5">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-white border border-daxul-black/10 px-3.5 py-2.5 text-daxul-black focus:outline-none focus:border-daxul-black"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-[0.2em] py-3.5 hover:bg-[#b8eb2f] transition-colors disabled:opacity-50"
                  >
                    {submitting ? "SUBMITTING..." : "SEND MESSAGE"}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
