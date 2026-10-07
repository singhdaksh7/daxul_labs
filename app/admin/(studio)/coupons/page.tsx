"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader, Panel, EmptyState, Badge, inputCls, btnPrimary, btnGhost, tableCls, thCls, tdCls } from "@/components/admin/shell/ui";

type Coupon = {
  id: string; code: string; discountType: "percentage" | "fixed"; discountValue: number; minOrderValue: number;
  startDate: string | null; expiryDate: string | null; usageLimit: number | null; usedCount: number; isActive: boolean;
};
type Form = {
  id?: string; code: string; discountType: "percentage" | "fixed"; discountValue: string; minOrderValue: string;
  startDate: string; expiryDate: string; usageLimit: string; isActive: boolean;
};
const blank: Form = { code: "", discountType: "percentage", discountValue: "", minOrderValue: "0", startDate: "", expiryDate: "", usageLimit: "", isActive: true };
const day = (s: string | null) => (s ? s.slice(0, 10) : "");

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/coupons");
    if (res.ok) setCoupons((await res.json()).coupons);
    else setMsg({ ok: false, text: "Failed to load coupons" });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const payload = {
      ...(form.id ? { id: form.id } : {}),
      code: form.code,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderValue: Number(form.minOrderValue || 0),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      expiryDate: form.expiryDate ? new Date(form.expiryDate + "T23:59:59").toISOString() : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      isActive: form.isActive,
    };
    try {
      const res = await fetch("/api/admin/coupons", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: data.issues?.[0]?.message || data.error || "Save failed" });
      else { setMsg({ ok: true, text: form.id ? "Coupon updated" : "Coupon created" }); setForm(blank); await load(); }
    } finally { setBusy(false); }
  }

  async function remove(c: Coupon) {
    if (!window.confirm(c.usedCount > 0 ? `${c.code} has been used and will be disabled instead of deleted. Continue?` : `Delete ${c.code}?`)) return;
    const res = await fetch("/api/admin/coupons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: `Coupon ${data.result}` } : { ok: false, text: data.error || "Failed" });
    await load();
  }

  const lbl = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500";

  return (
    <>
      <PageHeader title="Coupons" subtitle="Discount codes applied at checkout." />
      <div className="grid gap-6 px-4 py-6 sm:px-8 xl:grid-cols-3">
        <Panel title={form.id ? "Edit coupon" : "New coupon"} className="xl:order-2">
          <form onSubmit={save} className="space-y-3">
            {msg && <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${msg.ok ? "bg-[#C8FF35]/10 text-[#C8FF35]" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>}
            <div><label className={lbl}>Code</label><input required className={`${inputCls} uppercase`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" maxLength={32} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Type</label>
                <select className={inputCls} value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as Form["discountType"] })}>
                  <option value="percentage">Percentage</option><option value="fixed">Fixed (₹)</option>
                </select></div>
              <div><label className={lbl}>Value</label><input required type="number" min="0" step="any" max={form.discountType === "percentage" ? 100 : undefined} className={inputCls} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Min order (₹)</label><input type="number" min="0" className={inputCls} value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} /></div>
              <div><label className={lbl}>Usage limit</label><input type="number" min="1" className={inputCls} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Unlimited" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Starts</label><input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><label className={lbl}>Expires</label><input type="date" className={inputCls} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={busy} type="submit">{form.id ? "Save changes" : "Create coupon"}</button>
              {form.id && <button type="button" className={btnGhost} onClick={() => { setForm(blank); setMsg(null); }}>Cancel</button>}
            </div>
          </form>
        </Panel>

        <Panel title="All coupons" className="xl:order-1 xl:col-span-2">
          {loading ? <p className="text-sm text-gray-500">Loading…</p> : coupons.length === 0 ? <EmptyState>No coupons yet.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead><tr><th className={thCls}>Code</th><th className={thCls}>Discount</th><th className={thCls}>Min</th><th className={thCls}>Window</th><th className={thCls}>Used</th><th className={thCls}>State</th><th className={thCls} /></tr></thead>
                <tbody className="divide-y divide-[#242426]">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className={`${tdCls} font-bold text-[#C8FF35]`}>{c.code}</td>
                      <td className={`${tdCls} tabular-nums`}>{c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                      <td className={`${tdCls} tabular-nums`}>₹{c.minOrderValue}</td>
                      <td className={`${tdCls} whitespace-nowrap text-xs text-gray-400`}>{day(c.startDate) || "—"} → {day(c.expiryDate) || "∞"}</td>
                      <td className={`${tdCls} tabular-nums`}>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                      <td className={tdCls}><Badge kind={c.isActive ? "paid" : "failed"}>{c.isActive ? "active" : "disabled"}</Badge></td>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <button className="mr-3 text-xs text-[#C8FF35] hover:underline" onClick={() => { setMsg(null); setForm({ id: c.id, code: c.code, discountType: c.discountType, discountValue: String(c.discountValue), minOrderValue: String(c.minOrderValue), startDate: day(c.startDate), expiryDate: day(c.expiryDate), usageLimit: c.usageLimit ? String(c.usageLimit) : "", isActive: c.isActive }); }}>Edit</button>
                        <button className="text-xs text-red-300 hover:underline" onClick={() => remove(c)}>{c.usedCount > 0 ? "Disable" : "Delete"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
