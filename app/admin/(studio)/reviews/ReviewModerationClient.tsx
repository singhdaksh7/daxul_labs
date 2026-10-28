"use client";

import React, { useState } from "react";
import { Check, X, Trash2, MessageSquare, Star, ShieldCheck } from "lucide-react";
import { Panel, EmptyState, StatCard } from "@/components/admin/shell/ui";

interface AdminReviewItem {
  id: string;
  productId: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerifiedPurchase: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminResponse: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ReviewCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function ReviewModerationClient({
  initialReviews,
  initialCounts,
}: {
  initialReviews: AdminReviewItem[];
  initialCounts: ReviewCounts;
}) {
  const [reviews, setReviews] = useState<AdminReviewItem[]>(initialReviews);
  const [counts, setCounts] = useState<ReviewCounts>(initialCounts);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);

  const handleUpdateStatus = async (reviewId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading((p) => ({ ...p, [reviewId]: true }));
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
      );
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: status === "APPROVED" ? prev.approved + 1 : prev.approved,
        rejected: status === "REJECTED" ? prev.rejected + 1 : prev.rejected,
      }));
    } catch (err) {
      alert("Error updating review status");
    } finally {
      setActionLoading((p) => ({ ...p, [reviewId]: false }));
    }
  };

  const handleSaveResponse = async (reviewId: string) => {
    const text = responseInputs[reviewId] ?? "";
    setActionLoading((p) => ({ ...p, [reviewId]: true }));
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminResponse: text }),
      });
      if (!res.ok) throw new Error("Failed to save response");

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, adminResponse: text } : r))
      );
      setEditingResponseId(null);
    } catch {
      alert("Error saving studio response");
    } finally {
      setActionLoading((p) => ({ ...p, [reviewId]: false }));
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    setActionLoading((p) => ({ ...p, [reviewId]: true }));
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete review");

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      alert("Error deleting review");
    } finally {
      setActionLoading((p) => ({ ...p, [reviewId]: false }));
    }
  };

  const displayed = reviews.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Pending Moderation" value={counts.pending} hint="Requires review" />
        <StatCard label="Approved Reviews" value={counts.approved} hint="Published on storefront" />
        <StatCard label="Rejected" value={counts.rejected} hint="Flagged / spam" />
        <StatCard label="Total Reviews" value={counts.total} />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#242426] pb-3 overflow-x-auto hide-scrollbar">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`rounded-full border px-3.5 py-1 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              filterStatus === st
                ? "border-[#C8FF35] bg-[#C8FF35] text-[#0B0B0C]"
                : "border-[#242426] text-gray-400 hover:text-white"
            }`}
          >
            {st} {st === "PENDING" && counts.pending > 0 ? `(${counts.pending})` : ""}
          </button>
        ))}
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {displayed.length === 0 ? (
          <EmptyState>No reviews found in this view.</EmptyState>
        ) : (
          displayed.map((rev) => (
            <Panel key={rev.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242426] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase">{rev.authorName}</span>
                    <span className="text-[11px] font-mono text-gray-400">({rev.authorEmail})</span>
                    {rev.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    Object: <span className="text-white font-semibold">{rev.product.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          rev.rating >= s ? "fill-[#C8FF35] text-[#C8FF35]" : "text-[#242426]"
                        }`}
                      />
                    ))}
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      rev.status === "APPROVED"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : rev.status === "REJECTED"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {rev.status}
                  </span>
                </div>
              </div>

              {rev.title && <h4 className="text-sm font-bold text-white uppercase">{rev.title}</h4>}
              <p className="text-xs text-gray-300 leading-relaxed">{rev.comment}</p>

              {/* Studio Response Section */}
              {rev.adminResponse && editingResponseId !== rev.id && (
                <div className="p-3 bg-[#0B0B0C] rounded-lg border border-[#242426] text-xs space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#C8FF35] uppercase flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Official Studio Response
                  </span>
                  <p className="text-gray-300 italic">{rev.adminResponse}</p>
                  <button
                    onClick={() => {
                      setEditingResponseId(rev.id);
                      setResponseInputs((p) => ({ ...p, [rev.id]: rev.adminResponse || "" }));
                    }}
                    className="text-[10px] text-gray-400 hover:text-white underline pt-1 block"
                  >
                    Edit Response
                  </button>
                </div>
              )}

              {editingResponseId === rev.id && (
                <div className="space-y-2 p-3 bg-[#0B0B0C] rounded-lg border border-[#242426]">
                  <textarea
                    rows={2}
                    value={responseInputs[rev.id] ?? ""}
                    onChange={(e) => setResponseInputs((p) => ({ ...p, [rev.id]: e.target.value }))}
                    placeholder="Write an official response from Daxul Labs Studio..."
                    className="w-full bg-[#151515] border border-[#242426] rounded-lg p-2 text-xs text-white focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveResponse(rev.id)}
                      className="px-3 py-1 bg-[#C8FF35] text-[#0B0B0C] text-[11px] font-bold rounded"
                    >
                      Save Response
                    </button>
                    <button
                      onClick={() => setEditingResponseId(null)}
                      className="px-3 py-1 bg-transparent text-gray-400 text-[11px] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#242426]">
                <div className="flex items-center gap-2">
                  {rev.status !== "APPROVED" && (
                    <button
                      onClick={() => handleUpdateStatus(rev.id, "APPROVED")}
                      disabled={actionLoading[rev.id]}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  {rev.status !== "REJECTED" && (
                    <button
                      onClick={() => handleUpdateStatus(rev.id, "REJECTED")}
                      disabled={actionLoading[rev.id]}
                      className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 rounded text-xs font-semibold"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                  {!rev.adminResponse && editingResponseId !== rev.id && (
                    <button
                      onClick={() => {
                        setEditingResponseId(rev.id);
                        setResponseInputs((p) => ({ ...p, [rev.id]: "" }));
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-[#242426] text-gray-300 hover:text-white rounded text-xs font-semibold"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Add Studio Reply</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(rev.id)}
                  disabled={actionLoading[rev.id]}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}
