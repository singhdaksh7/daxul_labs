"use client";

import React, { useState } from "react";
import { Star, X, ShieldCheck, CheckCircle2 } from "lucide-react";

interface ReviewModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({
  productId,
  productName,
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !comment.trim()) {
      setError("Please fill in your name, email, and review.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: name,
          authorEmail: email,
          rating,
          title: title || undefined,
          comment,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
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
        className="bg-daxul-bone border border-daxul-black/20 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start border-b border-daxul-black/10 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-daxul-black">
              Review Object
            </h3>
            <p className="text-xs text-[#71717A] truncate max-w-xs">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-daxul-black/60 hover:text-daxul-black"
            aria-label="Close review dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-10 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-daxul-black mx-auto" />
            <h4 className="text-sm font-bold uppercase tracking-wide text-daxul-black">
              Thank You For Your Review!
            </h4>
            <p className="text-xs text-[#71717A] max-w-sm mx-auto">
              Your feedback has been submitted to the studio and will appear once verified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Star Rating Picker */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-[#71717A] font-bold block">
                Your Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-daxul-black focus:outline-none"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        (hoverRating || rating) >= star
                          ? "fill-daxul-black text-daxul-black"
                          : "text-daxul-black/20"
                      }`}
                    />
                  </button>
                ))}
                <span className="font-mono text-xs text-[#71717A] ml-2 font-bold">
                  {hoverRating || rating} / 5
                </span>
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-daxul-black">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan S."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-daxul-black/15 rounded-lg px-3 py-2 text-xs text-daxul-black focus:border-daxul-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-daxul-black">Your Email *</label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-daxul-black/15 rounded-lg px-3 py-2 text-xs text-daxul-black focus:border-daxul-black focus:outline-none"
                />
              </div>
            </div>

            <div className="text-[10px] text-[#71717A] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-daxul-black shrink-0" />
              <span>Email is private and strictly used to verify your purchase.</span>
            </div>

            {/* Headline */}
            <div className="space-y-1">
              <label className="font-semibold text-daxul-black">Headline (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Stunning projection detail & quality"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full bg-white border border-daxul-black/15 rounded-lg px-3 py-2 text-xs text-daxul-black focus:border-daxul-black focus:outline-none"
              />
            </div>

            {/* Review Comment */}
            <div className="space-y-1">
              <label className="font-semibold text-daxul-black">Review *</label>
              <textarea
                rows={4}
                required
                placeholder="Share your experience with the craftsmanship, projection clarity, and finish..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                className="w-full bg-white border border-daxul-black/15 rounded-lg p-3 text-xs text-daxul-black focus:border-daxul-black focus:outline-none resize-none"
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
              {submitting ? "Submitting..." : "Submit Review for Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
