"use client";

import React, { useEffect, useState } from "react";

type Preview = {
  partners: { id: string; displayName: string; email: string | null; isActive: boolean; ownershipPercentage: number }[];
  expenses: { id: string; expenseNumber: string; title: string; isEmi: boolean; totalAmountPaise: string }[];
  otherRecords: { settlements: number; capitalEntries: number; profitPeriods: number };
};

type Result = {
  cancelled: string[];
  blocked: { expense: string; reason: string }[];
  removedPartners: string[];
  deactivatedPartners: string[];
};

const inr = (paise: string) => `₹${(Number(paise) / 100).toLocaleString("en-IN")}`;

export default function CleanupClient() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/finance/cleanup");
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setPreview(j);
      setKeep((prev) => {
        const next: Record<string, boolean> = {};
        for (const p of j.partners as Preview["partners"]) next[p.id] = prev[p.id] ?? p.isActive;
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/finance/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm, keepPartnerIds: Object.keys(keep).filter((id) => keep[id]) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Clean-up failed");
      setResult(j);
      setConfirm("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clean-up failed");
    } finally {
      setBusy(false);
    }
  };

  const keptCount = Object.values(keep).filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8" id="cleanup-view">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-[#F3F0E9]">Finance Clean-up</h1>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#B9B9B4]">
          Starts the finance books fresh. Every active expense and EMI is <strong>cancelled</strong> and what it posted to the partner
          accounts is reversed, so balances go back to zero. Cancelled items stay in the audit trail. Partners you untick are removed.
          Login accounts are never touched. Only SUPER_ADMIN can use this page.
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</p>}

      {result && (
        <div role="status" className="space-y-3 rounded-xl border border-[#C8FF35]/30 bg-[#151515] p-6 text-xs text-[#F3F0E9]">
          <p className="font-semibold text-[#C8FF35]">Clean-up finished</p>
          <p>Cancelled {result.cancelled.length} expense(s)/EMI(s). Removed partners: {result.removedPartners.join(", ") || "none"}. Deactivated: {result.deactivatedPartners.join(", ") || "none"}.</p>
          {result.blocked.length > 0 && (
            <div className="space-y-1 text-yellow-300">
              <p className="font-semibold">Could not cancel ({result.blocked.length}):</p>
              {result.blocked.map((b) => <p key={b.expense}>{b.expense}: {b.reason}</p>)}
            </div>
          )}
        </div>
      )}

      {!preview && !error && <p className="text-xs text-[#B9B9B4]">Loading…</p>}

      {preview && (
        <>
          <div className="space-y-4 rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Partners: tick the ones to KEEP</h2>
            <div className="space-y-3">
              {preview.partners.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-[#0B0B0C] px-4 py-3 text-xs">
                  <span className="space-y-0.5">
                    <span className="block font-medium text-[#F3F0E9]">{p.displayName}{!p.isActive ? " (inactive)" : ""}</span>
                    <span className="block text-gray-400">{p.email} • {p.ownershipPercentage}% ownership</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={keep[p.id] ? "text-[#C8FF35]" : "text-red-300"}>{keep[p.id] ? "Keep" : "Remove"}</span>
                    <input type="checkbox" checked={!!keep[p.id]} onChange={(e) => setKeep({ ...keep, [p.id]: e.target.checked })} className="h-4 w-4 accent-[#C8FF35]" />
                  </span>
                </label>
              ))}
              {preview.partners.length === 0 && <p className="text-xs text-gray-500">No partners configured.</p>}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Will be cancelled ({preview.expenses.length})</h2>
            <div className="space-y-2">
              {preview.expenses.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0B0B0C] px-4 py-3 text-xs">
                  <span className="text-[#F3F0E9]">{e.expenseNumber} • {e.title}{e.isEmi ? " (EMI)" : ""}</span>
                  <span className="text-gray-400">{inr(e.totalAmountPaise)}</span>
                </div>
              ))}
              {preview.expenses.length === 0 && <p className="text-xs text-gray-500">Nothing active to cancel.</p>}
            </div>
            {(preview.otherRecords.settlements > 0 || preview.otherRecords.capitalEntries > 0 || preview.otherRecords.profitPeriods > 0) && (
              <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs leading-relaxed text-yellow-200">
                Not touched by this clean-up: {preview.otherRecords.settlements} settlement(s), {preview.otherRecords.capitalEntries} capital entr{preview.otherRecords.capitalEntries === 1 ? "y" : "ies"}, {preview.otherRecords.profitPeriods} profit period(s).
                Tell me if those are test data too. A settlement a partner already paid also stops its expense from being cancelled.
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-red-500/30 bg-[#151515] p-5 sm:p-6">
            <p className="text-xs text-[#B9B9B4]">Keeping <strong className="text-[#F3F0E9]">{keptCount}</strong> partner(s). Type <code className="text-[#C8FF35]">CLEAN UP</code> to confirm.</p>
            <div className="flex flex-wrap items-center gap-3">
              <input id="cleanup-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="CLEAN UP" className="w-48 rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9]" />
              <button
                id="cleanup-run"
                type="button"
                onClick={run}
                disabled={busy || confirm !== "CLEAN UP" || keptCount === 0}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
              >{busy ? "Working…" : "Run clean-up"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
