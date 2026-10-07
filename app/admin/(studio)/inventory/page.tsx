"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, History, X } from "lucide-react";
import { Field, btnGhost, btnPrimary, inputCls } from "@/components/admin/catalog/ui";

type Row = {
  key: string;
  productId: string;
  variantId: string | null;
  sku: string | null;
  productName: string;
  variantName: string | null;
  stock: number;
  lowStockThreshold: number;
  status: "ok" | "low" | "out";
  tracked: boolean;
};

const REASONS = ["production_added", "damaged", "correction", "returned", "manual"];
const badge: Record<string, string> = {
  ok: "bg-[#C8FF35]/15 text-[#C8FF35]",
  low: "bg-amber-400/15 text-amber-300",
  out: "bg-red-500/15 text-red-300",
};

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [adjust, setAdjust] = useState<Row | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("production_added");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ title: string; items: any[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory?status=${status}&q=${encodeURIComponent(q)}`);
    const d = await res.json();
    if (!res.ok) setMsg({ kind: "err", text: d.error || "Failed to load" });
    else setRows(d.rows);
    setLoading(false);
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const submit = async () => {
    if (!adjust) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: adjust.productId, variantId: adjust.variantId, delta: Number(delta), reason, note }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: d.error || "Adjustment failed" });
      return;
    }
    setMsg({ kind: "ok", text: `Stock updated. New quantity: ${d.stock}` });
    setAdjust(null);
    setDelta("");
    setNote("");
    load();
  };

  const showHistory = async (r: Row) => {
    const res = await fetch(`/api/admin/inventory?productId=${r.productId}`);
    const d = await res.json();
    setHistory({ title: r.productName, items: d.history || [] });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-[#F3F0E9]">Inventory</h1>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-3 text-[#B9B9B4]" />
          <input className={`${inputCls} pl-9`} placeholder="Search SKU or product" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="ok">OK</option>
          <option value="low">Low</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      {msg && <div className={`rounded-md border px-3 py-2 text-sm ${msg.kind === "ok" ? "border-[#C8FF35]/40 text-[#C8FF35]" : "border-red-500/40 text-red-300"}`}>{msg.text}</div>}

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#151515]">
        <table className="w-full text-sm">
          <thead className="bg-[#242426] text-left text-[10px] uppercase tracking-wider text-[#B9B9B4]">
            <tr><th className="p-3">SKU</th><th className="p-3">Product</th><th className="p-3">Variant</th><th className="p-3">Available</th><th className="p-3">Low threshold</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="text-[#F3F0E9]">
            {loading && <tr><td colSpan={7} className="p-6 text-center text-[#B9B9B4]">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-[#B9B9B4]">Nothing found.</td></tr>}
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-white/5">
                <td className="p-3 text-[#B9B9B4]">{r.sku || "—"}</td>
                <td className="p-3">{r.productName}</td>
                <td className="p-3 text-[#B9B9B4]">{r.variantName || "—"}</td>
                <td className="p-3">{r.stock}{!r.tracked && <span className="ml-2 text-[10px] text-[#B9B9B4]">(not tracked)</span>}</td>
                <td className="p-3 text-[#B9B9B4]">{r.lowStockThreshold}</td>
                <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs ${badge[r.status]}`}>{r.status}</span></td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button className={btnGhost} onClick={() => { setAdjust(r); setMsg(null); }}>Adjust</button>
                    <button className={btnGhost} onClick={() => showHistory(r)}><History size={12} /> History</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-white/10 bg-[#151515] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#F3F0E9]">Adjust stock: {adjust.productName}{adjust.variantName ? ` (${adjust.variantName})` : ""}</h2>
              <button onClick={() => setAdjust(null)} className="text-[#B9B9B4]"><X size={16} /></button>
            </div>
            <p className="text-xs text-[#B9B9B4]">Current: {adjust.stock}. Use a negative number to remove stock.</p>
            <Field label="Delta"><input type="number" className={inputCls} value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+10 or -2" /></Field>
            <Field label="Reason">
              <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</select>
            </Field>
            <Field label="Note"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setAdjust(null)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !delta || Number(delta) === 0 || !Number.isInteger(Number(delta))} onClick={submit}>{busy ? "Saving…" : "Apply"}</button>
            </div>
          </div>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-[#151515]">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-sm font-semibold text-[#F3F0E9]">History: {history.title}</h2>
              <button onClick={() => setHistory(null)} className="text-[#B9B9B4]"><X size={16} /></button>
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#242426] text-left text-[10px] uppercase text-[#B9B9B4]"><tr><th className="p-2">When</th><th className="p-2">Variant</th><th className="p-2">Delta</th><th className="p-2">After</th><th className="p-2">Reason</th><th className="p-2">Note</th><th className="p-2">By</th></tr></thead>
                <tbody className="text-[#F3F0E9]">
                  {history.items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-[#B9B9B4]">No adjustments recorded.</td></tr>}
                  {history.items.map((h) => (
                    <tr key={h.id} className="border-t border-white/5">
                      <td className="p-2 text-xs">{new Date(h.createdAt).toLocaleString()}</td>
                      <td className="p-2 text-xs">{h.variant?.name || "—"}</td>
                      <td className={`p-2 ${h.delta < 0 ? "text-red-300" : "text-[#C8FF35]"}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</td>
                      <td className="p-2">{h.quantityAfter}</td>
                      <td className="p-2 text-xs">{h.reason}</td>
                      <td className="p-2 text-xs text-[#B9B9B4]">{h.note || ""}</td>
                      <td className="p-2 text-xs text-[#B9B9B4]">{h.adminEmail || "system"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
