"use client";

import React, { useState } from "react";
import { X, CheckCircle, ShieldCheck } from "lucide-react";

interface AskQuestionModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AskQuestionModal({
  productId,
  productName,
  isOpen,
  onClose,
  onSuccess,
}: AskQuestionModalProps) {
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/products/${productId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, authorEmail, question }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit question");
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F0F10] border border-[#242426] p-6 sm:p-8 rounded-none shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#888884] hover:text-white transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-12 h-12 text-[#C8FF35] mx-auto" />
            <h3 className="text-lg font-mono uppercase tracking-widest text-white">
              Question Received
            </h3>
            <p className="text-sm text-[#A0A09C] max-w-sm mx-auto leading-relaxed">
              Your inquiry regarding <span className="text-white">{productName}</span> has been sent to our design studio. Approved answers appear on the product page.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 bg-[#C8FF35] text-black font-mono text-xs uppercase tracking-widest hover:bg-[#b0e82c] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#888884]">
                Inquiry Desk
              </p>
              <h3 className="text-base font-mono uppercase tracking-wider text-white mt-1">
                Ask About {productName}
              </h3>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-mono">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#A0A09C]">
                Your Name
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-[#18181A] border border-[#2D2D30] px-3.5 py-2.5 text-xs text-white placeholder-[#5A5A58] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase text-[#A0A09C]">
                  Email Address
                </label>
                <span className="flex items-center gap-1 text-[10px] text-[#7A7A76]">
                  <ShieldCheck className="w-3 h-3 text-[#C8FF35]" /> Private / Not published
                </span>
              </div>
              <input
                type="email"
                required
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full bg-[#18181A] border border-[#2D2D30] px-3.5 py-2.5 text-xs text-white placeholder-[#5A5A58] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#A0A09C]">
                Your Question
              </label>
              <textarea
                required
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about dimensions, materials, tolerances, or lighting electronics..."
                className="w-full bg-[#18181A] border border-[#2D2D30] px-3.5 py-2.5 text-xs text-white placeholder-[#5A5A58] focus:border-[#C8FF35] focus:outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#2D2D30] text-[#A0A09C] hover:text-white font-mono text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#C8FF35] text-black font-mono text-xs uppercase tracking-widest font-semibold hover:bg-[#b0e82c] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Sending..." : "Submit Question"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
