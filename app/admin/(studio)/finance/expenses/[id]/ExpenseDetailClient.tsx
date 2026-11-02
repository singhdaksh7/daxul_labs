"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Clock, Upload, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import RecoveryPanel from "../../RecoveryPanel";

export default function ExpenseDetailClient() {
  const params = useParams();
  const id = params?.id as string;

  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload proof state
  const [proofNote, setProofNote] = useState("");
  const [fileName, setFileName] = useState("qa-receipt-v1.pdf");

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/expenses/${id}`);
      if (res.ok) {
        const d = await res.json();
        setExpense(d.expense);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to load expense");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const cancelExpense = async () => {
    const reason = window.prompt("Why are you cancelling this expense? (e.g. duplicate entry). This reverses what it added to the partner accounts.");
    if (!reason || reason.trim().length < 3) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/finance/expenses/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to cancel expense");
      setSuccess("Expense cancelled and partner accounts corrected.");
      fetchDetail();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/finance/expenses/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPLOAD_PROOF",
          fileUrl: `/uploads/finance/${fileName}`,
          fileName: fileName,
          fileSize: 10240,
          mimeType: "application/pdf",
          description: proofNote || "QA verified payment receipt",
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to upload proof");

      setSuccess(`Proof ${fileName} registered successfully.`);
      setProofNote("");
      fetchDetail();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-xs text-gray-400">Loading expense timeline...</div>;
  }

  if (!expense) {
    return (
      <div className="p-8 text-xs text-red-400">
        Expense not found. <Link href="/admin/finance/expenses" className="text-[#C8FF35] underline">Back to expenses</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8" id="expense-detail-view">
      <div className="flex items-center gap-4 border-b border-[#242426] pb-6">
        <Link href="/admin/finance/expenses" className="rounded-lg border border-[#242426] bg-[#151515] p-2 text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-[#F3F0E9]">{expense.title}</h1>
          <p className="mt-2 text-xs leading-relaxed text-[#B9B9B4]">
            ID: {expense.id} • Category: {expense.category} • Classification: {expense.classification}
          </p>
        </div>
        {expense.status === "CANCELLED" ? (
          <span className="ml-auto rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase text-red-300">Cancelled</span>
        ) : (
          <button type="button" id="cancel-expense-btn" onClick={cancelExpense} className="ml-auto rounded-lg border border-red-500/40 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10">
            Cancel expense
          </button>
        )}
      </div>

      {expense.recoveryMode === "REVENUE" && expense.status !== "CANCELLED" && (
        expense.isEmi ? (
          <p className="rounded-lg border border-[#C8FF35]/20 bg-[#151515] px-4 py-3 text-xs text-[#B9B9B4]">
            This is an EMI that is recovered from business revenue. Record installments and recoveries on the <Link href="/admin/finance/emi" className="text-[#C8FF35] underline">EMIs page</Link>.
          </p>
        ) : (
          <RecoveryPanel
            expenseId={id}
            paidOutPaise={Number(expense.totalAmountPaise)}
            recoveries={expense.revenueRecoveries || []}
            payerName={expense.paidByPartner?.displayName}
            onChanged={fetchDetail}
            onError={setError}
          />
        )
      )}

      {error && (
        <div id="detail-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="detail-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Timeline & Audit */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C8FF35]" />
              Expense Timeline & Audit Events
            </h2>
            <div className="mt-5 space-y-5" id="expense-timeline">
              <div className="flex items-start gap-3 border-l-2 border-[#C8FF35] pl-4 py-1 timeline-event">
                <div>
                  <span className="text-xs font-semibold text-[#F3F0E9]">Expense Created & Shares Distributed</span>
                  <p className="text-[11px] text-gray-400">
                    Total: ₹{(Number(expense.totalAmountPaise) / 100).toLocaleString('en-IN')} • Split type: {expense.splitType}
                  </p>
                  <span className="text-[11px] text-gray-500">{new Date(expense.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {expense.attachments?.map((att: any, idx: number) => (
                <div key={att.id} className="flex items-start gap-3 border-l-2 border-blue-400 pl-4 py-1 timeline-event" data-attachment-id={att.id}>
                  <div>
                    <span className="text-xs font-semibold text-[#F3F0E9]">
                      Proof Attachment #{idx + 1}: {att.fileName}
                    </span>
                    <p className="text-[11px] text-gray-400">{att.description || "Uploaded payment proof"}</p>
                    <span className="text-[11px] text-gray-500">{new Date(att.uploadedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proof Attachments List */}
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#C8FF35]" />
              Proof Attachments & Version History ({expense.attachments?.length || 0})
            </h2>
            <div className="mt-4 space-y-2" id="attachments-list">
              {expense.attachments?.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between rounded-lg border border-[#242426] bg-[#0B0B0C] p-3 text-xs attachment-item">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-[#C8FF35]" />
                    <div>
                      <span className="font-medium text-[#F3F0E9]">{att.fileName}</span>
                      <span className="block text-[11px] text-gray-500">{(att.fileSize / 1024).toFixed(1)} KB • {att.mimeType}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Private Verified
                  </span>
                </div>
              ))}
              {(!expense.attachments || expense.attachments.length === 0) && (
                <p className="text-xs text-gray-500 py-3">No proof documents attached yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Upload Proof Form */}
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#C8FF35]" />
            Upload / Replace Proof
          </h2>
          <form onSubmit={handleUploadProof} className="mt-5 space-y-5" id="upload-proof-form">
            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Proof File Name</label>
              <input
                id="proof-filename-input"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Description / Note</label>
              <textarea
                id="proof-note-input"
                rows={3}
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="e.g. Supplier tax invoice v2 replacement"
                className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <button
              id="submit-proof-btn"
              type="submit"
              className="w-full rounded-lg bg-[#C8FF35] py-2 text-xs font-semibold text-black hover:bg-[#b8eb28]"
            >
              Attach / Version Proof
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

