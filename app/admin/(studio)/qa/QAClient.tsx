"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Check,
  X,
  Trash2,
  Send,
  HelpCircle,
  ExternalLink,
  Shield,
  Clock,
} from "lucide-react";

interface AnswerItem {
  id: string;
  authorName: string;
  isOfficial: boolean;
  answer: string;
  createdAt: string;
}

interface QuestionItem {
  id: string;
  productId: string;
  authorName: string;
  authorEmail: string;
  question: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  product?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  answers: AnswerItem[];
}

interface QAClientProps {
  initialQuestions: QuestionItem[];
  initialCounts: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export default function QAClient({ initialQuestions, initialCounts }: QAClientProps) {
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [counts, setCounts] = useState(initialCounts);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filtered = questions.filter((q) => {
    if (filter === "ALL") return true;
    return q.status === filter;
  });

  async function handleStatus(id: string, status: "APPROVED" | "REJECTED") {
    setLoadingAction(id);
    try {
      const res = await fetch(`/api/admin/qa/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status } : q))
        );
        recalcCounts(questions.map((q) => (q.id === id ? { ...q, status } : q)));
      }
    } catch (err) {
      console.error("Failed to update question status:", err);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setLoadingAction(id);
    try {
      const res = await fetch(`/api/admin/qa/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const next = questions.filter((q) => q.id !== id);
        setQuestions(next);
        recalcCounts(next);
      }
    } catch (err) {
      console.error("Failed to delete question:", err);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAnswerSubmit(questionId: string) {
    if (!answerText.trim()) return;
    setSubmittingAnswer(true);
    try {
      const res = await fetch(`/api/admin/qa/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: answerText.trim(),
          authorName: "Daxul Studio",
          isOfficial: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id === questionId) {
              return {
                ...q,
                status: "APPROVED",
                answers: [...q.answers, { ...data.answer, createdAt: new Date().toISOString() }],
              };
            }
            return q;
          })
        );
        setAnsweringId(null);
        setAnswerText("");
        recalcCounts(
          questions.map((q) =>
            q.id === questionId ? { ...q, status: "APPROVED" } : q
          )
        );
      }
    } catch (err) {
      console.error("Failed to post answer:", err);
    } finally {
      setSubmittingAnswer(false);
    }
  }

  function recalcCounts(list: QuestionItem[]) {
    const pending = list.filter((q) => q.status === "PENDING").length;
    const approved = list.filter((q) => q.status === "APPROVED").length;
    const rejected = list.filter((q) => q.status === "REJECTED").length;
    setCounts({ pending, approved, rejected, total: list.length });
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121214] border border-[#242426] p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#888884]">
            Pending Inquiries
          </p>
          <p className="text-2xl font-mono font-bold text-[#C8FF35] mt-1">
            {counts.pending}
          </p>
        </div>
        <div className="bg-[#121214] border border-[#242426] p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#888884]">
            Approved & Live
          </p>
          <p className="text-2xl font-mono font-bold text-white mt-1">
            {counts.approved}
          </p>
        </div>
        <div className="bg-[#121214] border border-[#242426] p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#888884]">
            Rejected / Spam
          </p>
          <p className="text-2xl font-mono font-bold text-[#666664] mt-1">
            {counts.rejected}
          </p>
        </div>
        <div className="bg-[#121214] border border-[#242426] p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#888884]">
            Total Inquiries
          </p>
          <p className="text-2xl font-mono font-bold text-white mt-1">
            {counts.total}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-[#242426] gap-2">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
              filter === tab
                ? "border-[#C8FF35] text-[#C8FF35] font-bold"
                : "border-transparent text-[#888884] hover:text-white"
            }`}
          >
            {tab} {tab === "PENDING" && counts.pending > 0 && `(${counts.pending})`}
          </button>
        ))}
      </div>

      {/* Question Cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center border border-[#1E1E22] bg-[#0E0E10] text-[#777774] font-mono text-xs">
          No inquiries found for filter: {filter}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => (
            <div
              key={q.id}
              className={`border p-5 space-y-4 ${
                q.status === "PENDING"
                  ? "border-[#C8FF35]/30 bg-[#12130F]"
                  : "border-[#242426] bg-[#121214]"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 font-bold ${
                        q.status === "APPROVED"
                          ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                          : q.status === "PENDING"
                          ? "bg-amber-950/60 border border-amber-800 text-amber-400"
                          : "bg-zinc-800 border border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {q.status}
                    </span>
                    {q.product && (
                      <Link
                        href={`/shop/${q.product.slug || q.product.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#C8FF35] hover:underline"
                      >
                        {q.product.name} <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  <p className="text-sm text-white pt-1 font-medium font-sans">
                    {q.question}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#888884] pt-1">
                    <span>From: <strong className="text-[#C8C8C4]">{q.authorName}</strong></span>
                    <span className="flex items-center gap-1 text-[#666664]">
                      <Shield className="w-3 h-3 text-[#C8FF35]" /> {q.authorEmail} (admin only)
                    </span>
                    <span className="flex items-center gap-1 text-[#666664]">
                      <Clock className="w-3 h-3" /> {new Date(q.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {q.status !== "APPROVED" && (
                    <button
                      onClick={() => handleStatus(q.id, "APPROVED")}
                      disabled={loadingAction === q.id}
                      className="px-3 py-1.5 bg-[#C8FF35] text-black font-mono text-[11px] uppercase tracking-wider font-semibold hover:bg-[#b0e82c] transition-colors inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {q.status !== "REJECTED" && (
                    <button
                      onClick={() => handleStatus(q.id, "REJECTED")}
                      disabled={loadingAction === q.id}
                      className="px-3 py-1.5 border border-[#3A3A3E] text-[#A0A09C] hover:text-red-400 hover:border-red-500 font-mono text-[11px] uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={loadingAction === q.id}
                    className="p-1.5 text-[#666664] hover:text-red-400 transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Answers List */}
              {q.answers.length > 0 && (
                <div className="pl-4 border-l-2 border-[#C8FF35]/40 space-y-2 pt-1">
                  {q.answers.map((ans) => (
                    <div key={ans.id} className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#C8FF35] font-bold uppercase">
                          {ans.isOfficial ? "Official Studio Answer" : ans.authorName}:
                        </span>
                        <span className="text-[10px] font-mono text-[#666664]">
                          {new Date(ans.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[#C8C8C4] font-sans">{ans.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Answer Form */}
              {answeringId === q.id ? (
                <div className="pt-2 border-t border-[#242426] space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#C8FF35]">
                    Publish Official Studio Answer (will auto-approve question)
                  </p>
                  <textarea
                    rows={2}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Enter official engineering/craft response..."
                    className="w-full bg-[#18181A] border border-[#2D2D30] p-2.5 text-xs text-white placeholder-[#5A5A58] focus:border-[#C8FF35] focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAnsweringId(null);
                        setAnswerText("");
                      }}
                      className="px-3 py-1 border border-[#2D2D30] text-xs font-mono text-[#888884] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingAnswer || !answerText.trim()}
                      onClick={() => handleAnswerSubmit(q.id)}
                      className="px-4 py-1 bg-[#C8FF35] text-black font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#b0e82c] disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      {submittingAnswer ? "Posting..." : "Post Official Answer"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      setAnsweringId(q.id);
                      setAnswerText("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#C8FF35] hover:underline"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {q.answers.length > 0 ? "Add Another Answer" : "Reply / Post Official Answer"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
