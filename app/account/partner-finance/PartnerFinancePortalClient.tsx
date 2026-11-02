"use client";

import React, { useEffect, useState } from "react";
import { User, CreditCard, Clock, Coins, TrendingUp, CheckCircle2, AlertCircle, ArrowUpRight, Upload } from "lucide-react";

export default function PartnerFinancePortalClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settlement submission state
  const [amountRupees, setAmountRupees] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionReference, setTransactionReference] = useState("");
  const [proofFileUrl, setProofFileUrl] = useState("/uploads/settlements/qa-payment-receipt.pdf");

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/partner-finance");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to load partner financial portal");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/account/partner-finance/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: parseFloat(amountRupees),
          paymentMethod,
          transactionReference,
          proofFileUrl,
          payerPartnerId: data?.partner?.id,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to submit settlement");

      setSuccess(`Payment of ₹${amountRupees} submitted for verification (Ref: ${transactionReference}).`);
      setAmountRupees("");
      setTransactionReference("");
      fetchPortalData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-8 text-xs text-gray-400">
        Loading partner financial portal...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-8 text-xs text-red-400">
        {error}
      </div>
    );
  }

  const p = data?.partner;
  const acc = p?.account;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F3F0E9] p-6 sm:p-12" id="partner-portal-view">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-[#242426] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C8FF35]">Partner Finance Portal</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F0E9] mt-1">{p?.displayName}</h1>
            <p className="text-xs text-[#B9B9B4] mt-0.5">
              Equity Share: {p?.ownershipPercentage}% • Expense Split: {p?.expenseSplitPercentage}%
            </p>
          </div>
          {p?.isPrimarySettlementPartner && (
            <span className="rounded-full bg-[#C8FF35]/10 border border-[#C8FF35]/20 px-3 py-1 text-xs font-semibold text-[#C8FF35]">
              Primary Settlement Partner
            </span>
          )}
        </div>

        {error && (
          <div id="portal-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div id="portal-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Financial Position Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4" id="partner-metrics">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
            <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">My Outstanding Dues</span>
            <p className="mt-2 text-2xl font-bold text-red-400" id="portal-total-due">
              ₹{(Number(acc?.totalDuePayablePaise || 0) / 100).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-gray-500">Payable to financing partner</span>
          </div>
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
            <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">My Receivables</span>
            <p className="mt-2 text-2xl font-bold text-[#C8FF35]" id="portal-receivable">
              ₹{(Number(acc?.totalDueReceivablePaise || 0) / 100).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-gray-500">Owed to me for paid expenses</span>
          </div>
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
            <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">Capital Contributed</span>
            <p className="mt-2 text-2xl font-bold text-[#F3F0E9]" id="portal-capital">
              ₹{(Number(acc?.totalCapitalInvestedPaise || 0) / 100).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-gray-500">Total equity investment</span>
          </div>
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
            <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">Profit Allocated</span>
            <p className="mt-2 text-2xl font-bold text-emerald-400" id="portal-profit">
              ₹{(Number(acc?.totalProfitAllocatedPaise || 0) / 100).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-gray-500">Historical closed profit share</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Outstanding Obligations & Ledger */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#C8FF35]" />
                My Expense & EMI Obligations
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-[#B9B9B4]" id="obligations-table">
                  <thead className="border-b border-[#242426] text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="pb-3">Obligation</th>
                      <th className="pb-3">Share Amount</th>
                      <th className="pb-3">Paid</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242426]">
                    {p?.expenseShares?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-[#1a1a1d] obligation-row">
                        <td className="py-3 font-medium text-[#F3F0E9]">
                          {s.expense?.title || "Expense Split"}
                          <span className="block text-[10px] text-gray-500">{s.expense?.classification}</span>
                        </td>
                        <td className="py-3 font-bold text-white">
                          ₹{(Number(s.shareAmountPaise) / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-emerald-400">
                          ₹{(Number(s.settledAmountPaise || 0) / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            s.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : s.status === "PARTIALLY_PAID"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!p?.expenseShares || p.expenseShares.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-500">No personal expense obligations found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Private Ledger Timeline */}
            <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#C8FF35]" />
                My Private Financial Ledger
              </h2>
              <div className="mt-4 space-y-3" id="portal-ledger">
                {p?.ledgerEntries?.slice(0, 5).map((l: any) => (
                  <div key={l.id} className="flex justify-between items-center border-b border-[#242426] pb-2 text-xs">
                    <div>
                      <span className="font-medium text-[#F3F0E9]">{l.type}</span>
                      <p className="text-[10px] text-gray-400">{l.description}</p>
                    </div>
                    <span className="font-bold text-[#C8FF35]">
                      ₹{(Number(l.amountPaise) / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Settlement Form */}
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#C8FF35]" />
              Clear Debt / Pay Partner
            </h2>
            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-4" id="submit-payment-form">
              <div>
                <label className="block text-[11px] font-medium text-[#B9B9B4]">Payment Amount (₹)</label>
                <input
                  id="payment-amount-input"
                  type="number"
                  step="0.01"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  placeholder="4000"
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#B9B9B4]">Payment Method</label>
                <select
                  id="payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                >
                  <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="IMPS_NEFT">Bank Transfer (IMPS / NEFT)</option>
                  <option value="CASH">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#B9B9B4]">Bank UTR / Transaction Reference</label>
                <input
                  id="payment-ref-input"
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="UPI/1234567890/QA"
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#B9B9B4]">Proof Document / Screenshot URL</label>
                <input
                  id="payment-proof-input"
                  type="text"
                  value={proofFileUrl}
                  onChange={(e) => setProofFileUrl(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>

              <button
                id="submit-payment-btn"
                type="submit"
                className="mt-4 w-full rounded-lg bg-[#C8FF35] py-2 text-xs font-semibold text-black hover:bg-[#b8eb28]"
              >
                Submit Payment for Verification
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
