"use client";

import React, { useEffect, useState } from "react";
import { Coins, Plus, Search, RefreshCw, ShieldAlert, User } from "lucide-react";

export default function StoreCreditAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState<number>(500);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/store-credit${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load store credit:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/store-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: Number(amount),
          reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to issue credit");
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
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Store Credit Ledger</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Customer store credit balances, goodwill concessions, refund credit allocations, and ledger auditing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              data?.enabled
                ? "bg-[#C8FF35]/10 text-[#C8FF35] border border-[#C8FF35]/30"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${data?.enabled ? "bg-[#C8FF35]" : "bg-red-400"}`} />
            {data?.enabled ? "Credit Active" : "Credit Disabled"}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Active Store Credit Liability</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">
            ₹{data?.metrics?.totalLiability?.toLocaleString() || "0"}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Current customer redeemable balance</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Lifetime Credited</span>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">
            ₹{data?.metrics?.totalCredited?.toLocaleString() || "0"}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Cumulative credits issued</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Lifetime Debited</span>
          <p className="mt-2 text-2xl font-bold text-blue-400">
            ₹{data?.metrics?.totalDebited?.toLocaleString() || "0"}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Redeemed at checkout</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Customer Accounts</h2>
            <p className="text-xs text-[#B9B9B4]">Active accounts eligible for checkout redemption or admin adjustment.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by customer email..."
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
                <th className="pb-3 font-medium">Available Balance</th>
                <th className="pb-3 font-medium">Lifetime Credited</th>
                <th className="pb-3 font-medium">Lifetime Debited</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Loading accounts...
                  </td>
                </tr>
              ) : !data?.accounts?.length ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No store credit accounts found.
                  </td>
                </tr>
              ) : (
                data.accounts.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5">
                      <div className="font-medium text-[#F3F0E9]">{acc.user?.name || "Customer"}</div>
                      <div className="text-[11px] text-gray-400">{acc.user?.email}</div>
                    </td>
                    <td className="py-3.5 font-semibold text-[#C8FF35]">₹{acc.availableBalance}</td>
                    <td className="py-3.5 text-gray-300">₹{acc.lifetimeCredited}</td>
                    <td className="py-3.5 text-gray-300">₹{acc.lifetimeDebited}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(acc.user);
                          setModalOpen(true);
                        }}
                        className="rounded border border-[#242426] bg-[#0B0B0C] px-2.5 py-1 text-[11px] font-medium text-[#F3F0E9] hover:border-[#C8FF35] hover:text-[#C8FF35]"
                      >
                        Grant Credit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#242426] bg-[#151515] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#F3F0E9]">Grant Goodwill Store Credit</h3>
            <p className="mt-1 text-xs text-gray-400">
              Issuing store credit to <span className="text-[#C8FF35]">{selectedUser?.email}</span>. An audit entry with your admin identity and reason will be saved.
            </p>

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleIssue} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Credit Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
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
                  placeholder="e.g. Goodwill credit for courier shipment delay"
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
                  {submitting ? "Processing..." : "Issue Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

