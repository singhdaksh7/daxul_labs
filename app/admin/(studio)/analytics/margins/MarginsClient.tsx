"use client";

import React, { useEffect, useState } from "react";

type Snap = { id: string; totalCOGS: number; order: { orderNumber: string; totalAmount: number } };
type Data = {
  metrics: { totalRevenue: number; totalCOGS: number; totalGrossProfit: number; overallGrossMargin: number };
  orderCostSnapshots: Snap[];
};

const inr = (n: number) => `₹${(Math.round(n * 100) / 100).toLocaleString("en-IN")}`;

export default function MarginsClient() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/margins")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Failed to load");
        setD(j);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const cards = d
    ? [
        ["Revenue", inr(d.metrics.totalRevenue)],
        ["COGS", inr(d.metrics.totalCOGS)],
        ["Gross profit", inr(d.metrics.totalGrossProfit)],
        ["Gross margin", `${d.metrics.overallGrossMargin}%`],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Margin Analytics</h1>
        <p className="mt-1 text-xs text-[#B9B9B4]">Based on cost snapshots frozen at order time (latest 30).</p>
      </div>
      {err && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</p>}
      {!d && !err && <p className="text-xs text-[#B9B9B4]">Loading…</p>}
      {d && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map(([l, v]) => (
              <div key={l} className="rounded-xl border border-[#242426] bg-[#151515] p-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">{l}</span>
                <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">{v}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#242426] bg-[#151515]">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-[#B9B9B4]"><tr><th className="p-3">Order</th><th className="p-3">Revenue</th><th className="p-3">COGS</th><th className="p-3">Margin</th></tr></thead>
              <tbody className="divide-y divide-[#242426]">
                {d.orderCostSnapshots.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-xs text-[#B9B9B4]">No cost snapshots yet.</td></tr>
                ) : d.orderCostSnapshots.map((s) => {
                  const rev = s.order.totalAmount;
                  const m = rev > 0 ? Math.round(((rev - s.totalCOGS) / rev) * 1000) / 10 : 0;
                  return <tr key={s.id}><td className="p-3 font-mono text-xs text-[#F3F0E9]">{s.order.orderNumber}</td><td className="p-3">{inr(rev)}</td><td className="p-3">{inr(s.totalCOGS)}</td><td className="p-3 text-[#C8FF35]">{m}%</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
