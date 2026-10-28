"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Check, Plus, HelpCircle } from "lucide-react";
import { AskQuestionModal } from "./AskQuestionModal";

interface PublicAnswer {
  id: string;
  authorName: string;
  isOfficial: boolean;
  answer: string;
  createdAt: string;
}

interface PublicQuestion {
  id: string;
  authorName: string;
  question: string;
  answers: PublicAnswer[];
  createdAt: string;
}

interface ProductQASectionProps {
  productId: string;
  productName: string;
}

export function ProductQASection({ productId, productName }: ProductQASectionProps) {
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/qa`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Failed to fetch product QA:", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return (
    <div className="pt-10 border-t border-[#242426]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-mono uppercase tracking-widest text-white">
              Questions & Answers
            </h3>
            <span className="text-xs font-mono text-[#888884] bg-[#18181A] px-2 py-0.5 border border-[#2D2D30]">
              {questions.length}
            </span>
          </div>
          <p className="text-xs text-[#888884] mt-1">
            Studio-verified answers on tolerances, materials, and operation.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#3A3A3E] text-white hover:border-[#C8FF35] hover:text-[#C8FF35] text-xs font-mono uppercase tracking-wider transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Ask a Question
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs font-mono text-[#666664] animate-pulse">
          Loading studio Q&A...
        </div>
      ) : questions.length === 0 ? (
        <div className="py-10 text-center border border-[#1F1F22] bg-[#0E0E0F] p-8">
          <HelpCircle className="w-8 h-8 text-[#4A4A4D] mx-auto mb-3" />
          <p className="text-xs font-mono uppercase tracking-wider text-[#A0A09C]">
            No inquiries recorded yet
          </p>
          <p className="text-xs text-[#6E6E72] mt-1 max-w-sm mx-auto">
            Have questions about dimensions, biopolymer specs, or custom engraving? Ask our fabrication team directly.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 px-4 py-2 bg-[#18181A] border border-[#2D2D30] text-xs font-mono uppercase text-[#C8FF35] hover:bg-[#202024] transition-colors"
          >
            Ask First Question
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q) => (
            <div
              key={q.id}
              className="border border-[#242426] bg-[#0D0D0E] p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono font-bold text-[#C8FF35] mt-0.5">
                  Q:
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white leading-relaxed font-sans font-medium">
                    {q.question}
                  </p>
                  <p className="text-[10px] font-mono text-[#777774] mt-1.5">
                    Asked by {q.authorName} • {new Date(q.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {q.answers.length > 0 ? (
                <div className="space-y-3 pl-5 border-l-2 border-[#C8FF35]/40 ml-2 pt-2">
                  {q.answers.map((ans) => (
                    <div key={ans.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          A:
                        </span>
                        {ans.isOfficial && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[#0B0B0C] bg-[#C8FF35] px-1.5 py-0.2">
                            <Check className="w-2.5 h-2.5" /> Studio Response
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#888884]">
                          {ans.authorName} • {new Date(ans.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-[#C8C8C4] leading-relaxed pl-5 font-sans">
                        {ans.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pl-5 border-l-2 border-[#2D2D30] ml-2 text-[11px] font-mono text-[#666664] italic">
                  Awaiting studio response...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AskQuestionModal
        productId={productId}
        productName={productName}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchQuestions}
      />
    </div>
  );
}
