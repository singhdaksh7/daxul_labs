"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Plus, Search, RefreshCw, ShieldCheck, Clock, Ban } from "lucide-react";

export default function GiftCardsAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState<number>(1000);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<string | null>(null);

  const fetchData = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/gift-cards${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load gift cards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          recipientEmail: recipientEmail || null,
          recipientName: recipientName || null,
          personalMessage: message || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to issue card");
      setNewlyCreatedCode(json.rawCode);
      fetchData(query);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Gift Cards Liability Desk</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Hashed high-entropy gift voucher management, ledger auditability, and issuance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewlyCreatedCode(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#C8FF35] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#b8eb2d]"
          >
            <Plus className="h-3.5 w-3.5" />
            Issue Digital Gift Card
          </button>
          <button
            onClick={() => fetchData(query)}
            className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Outstanding Liability</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">
            ₹{data?.metrics?.totalRemainingLiability?.toLocaleString() || "0"}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Active redeemable value</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Total Issued</span>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">
            ₹{data?.metrics?.totalIssuedLiability?.toLocaleString() || "0"}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Cumulative gift card volume</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Active Cards</span>
          <p className="mt-2 text-2xl font-bold text-blue-400">{data?.metrics?.activeCards || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Cards with remaining balance</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Redeemed Cards</span>
          <p className="mt-2 text-2xl font-bold text-gray-400">{data?.metrics?.usedCards || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Fully depleted balances</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Issued Gift Cards</h2>
            <p className="text-xs text-[#B9B9B4]">Displaying masked secure codes. Raw codes are stored as SHA-256 hashes.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search masked code or email..."
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
                <th className="pb-3 font-medium">Masked Code</th>
                <th className="pb-3 font-medium">Recipient</th>
                <th className="pb-3 font-medium">Original</th>
                <th className="pb-3 font-medium">Remaining</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Expires</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading cards...
                  </td>
                </tr>
              ) : !data?.cards?.length ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No gift cards found.
                  </td>
                </tr>
              ) : (
                data.cards.map((card: any) => (
                  <tr key={card.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 font-mono text-xs text-[#C8FF35]">{card.maskedCode}</td>
                    <td className="py-3.5">
                      <div className="text-[#F3F0E9]">{card.recipientName || "—"}</div>
                      <div className="text-[11px] text-gray-400">{card.recipientEmail || "Direct Purchase"}</div>
                    </td>
                    <td className="py-3.5 text-gray-300">₹{card.originalAmount}</td>
                    <td className="py-3.5 font-semibold text-[#F3F0E9]">₹{card.remainingBalance}</td>
                    <td className="py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          card.status === "ACTIVE"
                            ? "bg-[#C8FF35]/10 text-[#C8FF35]"
                            : card.status === "USED"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {card.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-gray-400">
                      {card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3.5 text-gray-400">{new Date(card.createdAt).toLocaleDateString()}</td>
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
            {newlyCreatedCode ? (
              <div className="space-y-4 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-[#C8FF35]" />
                <h3 className="text-base font-bold text-[#F3F0E9]">Gift Card Successfully Generated</h3>
                <p className="text-xs text-gray-400">
                  Provide this raw redemption code to the recipient. It will NOT be shown again in full format.
                </p>
                <div className="rounded-lg border border-[#C8FF35]/30 bg-[#0B0B0C] p-4">
                  <span className="font-mono text-lg font-bold tracking-wider text-[#C8FF35] select-all">
                    {newlyCreatedCode}
                  </span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full rounded-lg bg-[#C8FF35] py-2.5 text-xs font-bold text-black hover:bg-[#b8eb2d]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssue} className="space-y-4">
                <h3 className="text-base font-bold text-[#F3F0E9]">Issue Digital Gift Card</h3>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Recipient Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Recipient Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] p-2.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
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
                    {submitting ? "Generating..." : "Issue Card"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

