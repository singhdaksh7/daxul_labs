"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, ShieldCheck, MessageSquare, Plus, Check } from "lucide-react";
import ReviewModal from "./ReviewModal";
import type { ReviewSummary, PublicReview } from "@/lib/reviews";

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
}

export default function ProductReviewsSection({
  productId,
  productName,
}: ProductReviewsSectionProps) {
  const [data, setData] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const summary = data || {
    averageRating: 5.0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviews: [] as PublicReview[],
  };

  return (
    <div className="space-y-8">
      {/* Reviews Summary & Rating Header */}
      <div className="bg-white border border-daxul-black/10 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Score & Stars */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-daxul-black">
              {summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : "—"}
            </span>
            <span className="text-sm font-mono text-[#71717A]">/ 5.0</span>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  (summary.totalReviews > 0 && Math.round(summary.averageRating) >= star)
                    ? "fill-daxul-black text-daxul-black"
                    : "text-daxul-black/20"
                }`}
              />
            ))}
            <span className="text-xs font-mono text-[#71717A] ml-2">
              Based on {summary.totalReviews} {summary.totalReviews === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>

        {/* Rating Distribution Bars */}
        <div className="flex-1 w-full max-w-xs space-y-1 text-[11px] font-mono text-[#71717A]">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = summary.distribution[star] || 0;
            const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-6 text-right font-medium">{star}★</span>
                <div className="flex-1 bg-daxul-black/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-daxul-black rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[10px]">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Write a Review Button */}
        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-daxul-black text-daxul-bone font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-daxul-black/85 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Write a Review</span>
          </button>
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#71717A] font-mono uppercase tracking-wider">
            Loading reviews...
          </div>
        ) : summary.reviews.length === 0 ? (
          <div className="py-12 text-center bg-white border border-daxul-black/10 rounded-2xl p-6 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-daxul-black">
              No customer reviews yet
            </p>
            <p className="text-xs text-[#71717A] max-w-sm mx-auto">
              Be the first to share your experience with this handcrafted object.
            </p>
          </div>
        ) : (
          summary.reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-daxul-black/10 rounded-2xl p-5 sm:p-6 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-daxul-black/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-daxul-bone border border-daxul-black/15 flex items-center justify-center font-bold text-xs text-daxul-black uppercase">
                    {rev.authorName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase text-daxul-black">
                        {rev.authorName}
                      </span>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          Verified Buyer
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          rev.rating >= s ? "fill-daxul-black text-daxul-black" : "text-daxul-black/15"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-[#71717A]">
                    {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {rev.title && (
                <h4 className="text-xs sm:text-sm font-bold text-daxul-black uppercase">
                  {rev.title}
                </h4>
              )}

              <p className="text-xs sm:text-sm text-[#555550] leading-relaxed">
                {rev.comment}
              </p>

              {/* Official Studio Response */}
              {rev.adminResponse && (
                <div className="mt-3 p-3.5 bg-[#FAF8F5] border-l-2 border-daxul-black rounded-r-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-daxul-black">
                    <MessageSquare className="w-3 h-3" />
                    <span>Studio Response</span>
                  </div>
                  <p className="text-xs text-[#555550] italic leading-relaxed">
                    &ldquo;{rev.adminResponse}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review Submission Modal */}
      <ReviewModal
        productId={productId}
        productName={productName}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchReviews}
      />
    </div>
  );
}
