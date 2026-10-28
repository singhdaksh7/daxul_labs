"use client";

import React, { useState } from "react";
import { Bell, X, CheckCircle2, ShieldCheck } from "lucide-react";

interface BackInStockModalProps {
  productId: string;
  productName: string;
  variantId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BackInStockModal({
  productId,
  productName,
  variantId,
  isOpen,
  onClose,
}: BackInStockModalProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/back-in-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: phone.trim() || undefined,
          variantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail("");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-daxul-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-daxul-bone border border-daxul-black/20 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start border-b border-daxul-black/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-daxul-black text-daxul-lime flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-tight text-daxul-black">
                Notify When Available
              </h3>
              <p className="text-[11px] text-[#71717A] truncate max-w-[240px]">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-daxul-black/60 hover:text-daxul-black"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-daxul-black mx-auto" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-daxul-black">
              You are on the notification list!
            </h4>
            <p className="text-xs text-[#71717A]">
              We will email you the moment our studio crafts more units.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <p className="text-xs text-[#555550] leading-relaxed">
              This handcrafted piece is currently sold out. Leave your email and be the first to know when the next print batch goes live.
            </p>

            <div className="space-y-1">
              <label className="font-semibold text-daxul-black">Email Address *</label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-daxul-black/15 rounded-lg px-3 py-2.5 text-xs text-daxul-black focus:border-daxul-black focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-daxul-black">WhatsApp / Phone (Optional)</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-daxul-black/15 rounded-lg px-3 py-2.5 text-xs text-daxul-black focus:border-daxul-black focus:outline-none"
              />
            </div>

            {error && (
              <div className="text-xs bg-red-50 border border-red-300 text-red-700 p-2.5 rounded-lg font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-daxul-black text-daxul-bone font-bold uppercase tracking-widest rounded-lg text-xs hover:bg-daxul-black/85 transition-colors disabled:opacity-50"
            >
              {submitting ? "Subscribing..." : "Notify Me Upon Restock"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
