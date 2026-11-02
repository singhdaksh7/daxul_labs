"use client";

import React, { useState } from "react";

const rupees = (paise: number) => `\u20b9${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const todayIso = () => new Date().toISOString().slice(0, 10);

type Recovery = { id: string; amountPaise: string; recoveredAt: string; note?: string | null };

/**
 * Cost that is repaid to the paying partner out of business revenue (not by the other partners).
 * paidOutPaise = what the payer has actually paid so far; the panel shows recovered / left to recover.
 */
export default function RecoveryPanel({
  expenseId,
  paidOutPaise,
  recoveries,
  payerName,
  onChanged,
  onError,
}: {
  expenseId: string;
  paidOutPaise: number;
  recoveries: Recovery[];
  payerName?: string | null;
  onChanged: () => void;
  onError: (m: string | null) => void;
}) {
  const recovered = recoveries.reduce((a, r) => a + Number(r.amountPaise), 0);
  const left = Math.max(0, paidOutPaise - recovered);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/admin/finance/expenses/${expenseId}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRupees: parseFloat(amount), recoveredAt: new Date(date).toISOString(), note: note || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to record recovery");
      setAmount("");
      setNote("");
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to record recovery");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="recovery-panel space-y-4 rounded-lg border border-[#C8FF35]/20 bg-[#151515] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[#C8FF35]">Recovered from business revenue</p>
        <span className="text-[11px] text-gray-400">No partner shares. {payerName ?? "The payer"} is repaid from revenue.</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-[12px]">
        <div className="space-y-1"><span className="text-gray-500">Paid out so far</span><p className="font-medium text-[#F3F0E9]">{rupees(paidOutPaise)}</p></div>
        <div className="space-y-1"><span className="text-gray-500">Recovered</span><p className="font-medium text-[#C8FF35]">{rupees(recovered)}</p></div>
        <div className="space-y-1"><span className="text-gray-500">Left to recover</span><p className="font-medium text-yellow-300">{rupees(left)}</p></div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#242426]">
        <div className="h-full bg-[#C8FF35]" style={{ width: `${paidOutPaise > 0 ? Math.min(100, (recovered / paidOutPaise) * 100) : 0}%` }} />
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-[11px] text-gray-400">Amount recovered (₹)
          <input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={left > 0 ? String(left / 100) : "0"} className="recovery-amount block w-36 rounded-lg border border-[#242426] bg-[#0B0B0C] px-2.5 py-1.5 text-xs text-[#F3F0E9]" />
        </label>
        <label className="space-y-1 text-[11px] text-gray-400">Date
          <input type="date" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} className="block rounded-lg border border-[#242426] bg-[#0B0B0C] px-2.5 py-1.5 text-xs text-[#F3F0E9]" />
        </label>
        <label className="min-w-[10rem] flex-1 space-y-1 text-[11px] text-gray-400">Note (optional)
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. October sales" className="block w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2.5 py-1.5 text-xs text-[#F3F0E9]" />
        </label>
        <button type="submit" disabled={busy || left <= 0} className="recovery-submit rounded-lg bg-[#C8FF35] px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#b8eb28] disabled:opacity-50">{busy ? "Saving\u2026" : "Record recovery"}</button>
      </form>
      {recoveries.length > 0 && (
        <div className="space-y-1.5 border-t border-[#242426] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Recovery history</p>
          {recoveries.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
              <span>{fmt(r.recoveredAt)}{r.note ? ` \u2022 ${r.note}` : ""}</span>
              <span className="text-[#F3F0E9]">{rupees(Number(r.amountPaise))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
