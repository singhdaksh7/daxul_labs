"use client";

import React, { useEffect, useState } from "react";
import { Coins, Plus, TrendingDown, ArrowDownRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function CapitalAdminClient() {
  const [entries, setEntries] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [partnerId, setPartnerId] = useState("");
  const [type, setType] = useState("CAPITAL_CONTRIBUTION");
  const [amountRupees, setAmountRupees] = useState("");
  const [description, setDescription] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [capRes, partRes] = await Promise.all([
        fetch("/api/admin/finance/capital"),
        fetch("/api/admin/finance/partners"),
      ]);
      if (capRes.ok) {
        const d = await capRes.json();
        setEntries(d.entries || []);
      }
      if (partRes.ok) {
        const pd = await partRes.json();
        const activeList = pd.partners || [];
        setPartners(activeList);
        if (activeList.length > 0) {
          setPartnerId(activeList[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/finance/capital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          type,
          amountRupees: parseFloat(amountRupees),
          description: description || undefined,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to record entry");

      setSuccess(`Recorded ${type} of ₹${amountRupees} successfully.`);
      setAmountRupees("");
      setDescription("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalCapital = entries
    .filter((e) => e.type === "CAPITAL_CONTRIBUTION")
    .reduce((acc, e) => acc + Number(e.amountPaise), 0);

  const totalAdvances = entries
    .filter((e) => e.type === "PARTNER_ADVANCE")
    .reduce((acc, e) => acc + Number(e.amountPaise), 0);

  return (
    <div className="space-y-8" id="capital-view">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Capital Contributions & Partner Advances</h1>
        <p className="mt-1 text-xs text-[#B9B9B4]">
          Track equity capital investments (non-revenue) and short-term partner working capital loans/advances.
        </p>
      </div>

      {error && (
        <div id="capital-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="capital-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" id="capital-metrics">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Total Capital Invested</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]" id="total-capital-amount">
            ₹{(totalCapital / 100).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Equity contributions (NOT revenue)</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Active Partner Advances</span>
          <p className="mt-2 text-2xl font-bold text-yellow-400" id="total-advances-amount">
            ₹{(totalAdvances / 100).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Business liabilities payable to partners</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Entries Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <Coins className="h-4 w-4 text-[#C8FF35]" />
              Capital & Advance Ledger ({entries.length})
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-[#B9B9B4]" id="capital-table">
                <thead className="border-b border-[#242426] text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-3">Partner</th>
                    <th className="pb-3">Classification</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Note</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242426]">
                  {entries.map((ent) => (
                    <tr key={ent.id} className="hover:bg-[#1a1a1d] capital-row" data-entry-id={ent.id}>
                      <td className="py-3 font-medium text-[#F3F0E9]">
                        {ent.partner?.displayName}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          ent.type === "CAPITAL_CONTRIBUTION"
                            ? "bg-[#C8FF35]/10 text-[#C8FF35]"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {ent.type}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-[#F3F0E9]">
                        ₹{(Number(ent.amountPaise) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-gray-400">{ent.description || "—"}</td>
                      <td className="py-3 text-gray-500">{new Date(ent.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {entries.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        No capital entries recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#C8FF35]" />
            Record Capital / Advance
          </h2>
          <form onSubmit={handleCreateCapital} className="mt-4 space-y-4" id="capital-form">
            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Partner</label>
              <select
                id="capital-partner-select"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Entry Type</label>
              <select
                id="capital-type-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              >
                <option value="CAPITAL_CONTRIBUTION">Capital Contribution (Equity)</option>
                <option value="PARTNER_ADVANCE">Partner Advance (Liability Loan)</option>
                <option value="ADVANCE_REPAYMENT">Advance Repayment</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Amount (₹)</label>
              <input
                id="capital-amount-input"
                type="number"
                step="0.01"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="100000"
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Description / Purpose</label>
              <input
                id="capital-desc-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Initial seed capital contribution"
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <button
              id="submit-capital-btn"
              type="submit"
              className="mt-4 w-full rounded-lg bg-[#C8FF35] py-2 text-xs font-semibold text-black hover:bg-[#b8eb28]"
            >
              Post to Partner Financial Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
