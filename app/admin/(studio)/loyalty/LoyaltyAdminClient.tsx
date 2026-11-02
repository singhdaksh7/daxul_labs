"use client";

import React, { useEffect, useState } from "react";
import { Award, Plus, Minus, Search, ShieldAlert, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";

export default function LoyaltyAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<"ADMIN_CREDIT" | "ADMIN_DEBIT">("ADMIN_CREDIT");
  const [points, setPoints] = useState<number>(50);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/loyalty${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load loyalty admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          type: adjustType,
          points: Number(points),
          reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed adjustment");
      }

      setModalOpen(false);
      setReason("");
      fetchData(query);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Loyalty & Rewards Ledger</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Double-entry auditable ledger for points issuance, pending verification, reversals, and checkout redemptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              data?.metrics?.enabled
                ? "bg-[#C8FF35]/10 text-[#C8FF35] border border-[#C8FF35]/30"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${data?.metrics?.enabled ? "bg-[#C8FF35]" : "bg-red-400"}`} />
            {data?.metrics?.enabled ? "Feature Active" : "Feature Disabled"}
          </span>
          <button
            onClick={() => fetchData(query)}
            className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Total Outstanding Points</span>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">{data?.metrics?.totalOutstandingPoints?.toLocaleString() || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Customer-held available liability</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Lifetime Points Earned</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">{data?.metrics?.totalEarnedPoints?.toLocaleString() || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Gross cumulative issuance</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Lifetime Points Redeemed</span>
          <p className="mt-2 text-2xl font-bold text-blue-400">{data?.metrics?.totalRedeemedPoints?.toLocaleString() || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Applied toward checkout discounts</span>
        </div>
      </div>

      {/* Customer Accounts Ledger Table */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Customer Balances</h2>
            <p className="text-xs text-[#B9B9B4]">View point accounts and perform audited manual adjustments.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fetchData(e.target.value);
              }}
              className="w-full rounded-lg border border-[#242426] bg-[#0B0B0C] py-2 pl-9 pr-4 text-xs text-[#F3F0E9] placeholder-gray-500 focus:border-[#C8FF35] focus:outline-none sm:w-64"
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#242426] text-gray-400">
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Available</th>
                <th className="pb-3 font-medium">Pending</th>
                <th className="pb-3 font-medium">Earned</th>
                <th className="pb-3 font-medium">Redeemed</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Loading accounts...
                  </td>
                </tr>
              ) : !data?.accounts?.length ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No customer loyalty accounts found.
                  </td>
                </tr>
              ) : (
                data.accounts.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5">
                      <div className="font-medium text-[#F3F0E9]">{acc.user.name || "Customer"}</div>
                      <div className="text-[11px] text-gray-400">{acc.user.email}</div>
                    </td>
                    <td className="py-3.5 font-semibold text-[#C8FF35]">{acc.availablePoints} pts</td>
                    <td className="py-3.5 text-yellow-400">{acc.pendingPoints} pts</td>
                    <td className="py-3.5 text-gray-300">{acc.lifetimeEarned}</td>
                    <td className="py-3.5 text-gray-300">{acc.lifetimeRedeemed}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(acc.user);
                          setModalOpen(true);
                        }}
                        className="rounded border border-[#242426] bg-[#0B0B0C] px-2.5 py-1 text-[11px] font-medium text-[#F3F0E9] hover:border-[#C8FF35] hover:text-[#C8FF35]"
                      >
                        Adjust Balance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Ledger History */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Recent Ledger Entries</h2>
        <p className="mt-0.5 text-xs text-[#B9B9B4]">Live stream of audited loyalty transactions.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#242426] text-gray-400">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Points</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]/60">
              {!data?.recentTransactions?.length ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                data.recentTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-gray-400">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-[#F3F0E9]">{tx.account?.user?.email || "Unknown"}</td>
                    <td className="py-3">
                      <span className="font-mono text-[10px] uppercase text-gray-300">{tx.type}</span>
                    </td>
                    <td className="py-3 font-semibold">
                      {tx.type === "REDEEM" || tx.type === "ADMIN_DEBIT" || tx.type === "REVERSAL" ? (
                        <span className="text-red-400">-{tx.points}</span>
                      ) : (
                        <span className="text-[#C8FF35]">+{tx.points}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="rounded bg-[#242426] px-1.5 py-0.5 text-[10px] text-gray-300">{tx.status}</span>
                    </td>
                    <td className="py-3 text-gray-300">{tx.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Adjustment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#242426] bg-[#151515] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#F3F0E9]">Manual Points Adjustment</h3>
            <p className="mt-1 text-xs text-gray-400">
              Adjusting ledger balance for <span className="text-[#C8FF35]">{selectedUser?.email}</span>. An audit entry with your identity and reason will be recorded.
            </p>

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAdjust} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Action</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADMIN_CREDIT")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
                      adjustType === "ADMIN_CREDIT"
                        ? "bg-[#C8FF35] text-black"
                        : "border border-[#242426] bg-[#0B0B0C] text-gray-400"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Credit Points
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADMIN_DEBIT")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
                      adjustType === "ADMIN_DEBIT"
                        ? "bg-red-500 text-white"
                        : "border border-[#242426] bg-[#0B0B0C] text-gray-400"
                    }`}
                  >
                    <Minus className="h-3.5 w-3.5" /> Debit Points
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Points</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={points}
                  onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 0))}
                  className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Mandatory Audit Reason
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Compensation for manufacturing delay on order #DX-1029"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#242426] px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#C8FF35] px-4 py-2 text-xs font-bold text-black hover:bg-[#b8eb2d] disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Confirm Ledger Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

