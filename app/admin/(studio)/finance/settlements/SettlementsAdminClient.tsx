"use client";

import React, { useEffect, useState } from "react";
import { CheckSquare, AlertCircle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

export default function SettlementsAdminClient() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/settlements");
      if (res.ok) {
        const d = await res.json();
        setSettlements(d.settlements || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handleVerify = async (settlementId: string, status: "VERIFIED" | "REJECTED", reason?: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/finance/settlements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settlementId,
          status,
          rejectionReason: reason,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Action failed");

      setSuccess(`Settlement ${settlementId} marked as ${status}.`);
      setActiveRejectId(null);
      setRejectReason("");
      fetchSettlements();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8" id="settlements-view">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-[#F3F0E9]">Partner Settlements & Verification</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#B9B9B4]">
          Review incoming debt clearance payments, verify bank UTRs and screenshots, and approve ledger adjustments.
        </p>
      </div>

      {error && (
        <div id="settlement-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="settlement-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-[#C8FF35]" />
          Settlement Verification Queue ({settlements.length})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs text-[#B9B9B4]" id="settlements-table">
            <thead className="border-b border-[#242426] text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Reference / Payer</th>
                <th className="pb-3 pr-4 font-semibold">Recipient Partner</th>
                <th className="pb-3 pr-4 font-semibold">Amount</th>
                <th className="pb-3 pr-4 font-semibold">Payment Method</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]">
              {settlements.map((st) => (
                <tr key={st.id} className="hover:bg-[#1a1a1d] settlement-row" data-settlement-id={st.id}>
                  <td className="py-3.5 pr-4 font-medium text-[#F3F0E9]">
                    {st.payerPartner?.displayName}
                    <span className="block text-[11px] text-gray-500">Ref: {st.transactionReference}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-gray-300">
                    {st.recipientPartner?.displayName || "Primary Settlement"}
                  </td>
                  <td className="py-3.5 pr-4 font-bold text-[#C8FF35]">
                    ₹{(Number(st.amountPaise) / 100).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 pr-4 text-gray-400">{st.paymentMethod}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      st.status === "VERIFIED"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : st.status === "REJECTED"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {st.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    {st.status === "PENDING_VERIFICATION" && (
                      <div className="flex items-center gap-2">
                        <button
                          id={`verify-btn-${st.id}`}
                          onClick={() => handleVerify(st.id, "VERIFIED")}
                          className="rounded bg-[#C8FF35] px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-[#b8eb28]"
                        >
                          Verify & Approve
                        </button>
                        <button
                          id={`reject-btn-${st.id}`}
                          onClick={() => setActiveRejectId(st.id)}
                          className="rounded bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {activeRejectId === st.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          id={`reject-reason-${st.id}`}
                          type="text"
                          placeholder="Rejection reason required"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="rounded border border-[#242426] bg-[#0B0B0C] px-2 py-1 text-xs text-white"
                        />
                        <button
                          id={`confirm-reject-${st.id}`}
                          onClick={() => handleVerify(st.id, "REJECTED", rejectReason)}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {settlements.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No settlements pending verification.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

