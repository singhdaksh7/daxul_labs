"use client";

import React, { useEffect, useState } from "react";

type Settings = Record<string, boolean | number | string>;

const TOGGLES: [string, string][] = [
  ["rawMaterialsEnabled", "Raw materials tracking"],
  ["bomEnabled", "Bill of materials"],
  ["purchasingEnabled", "Purchasing"],
  ["courierIntegrationEnabled", "Courier integration"],
  ["advancedCostingEnabled", "Advanced costing"],
  ["staffRbacEnabled", "Staff role-based access"],
];
const NUMBERS: [string, string][] = [
  ["kwhElectricityRate", "Electricity rate per kWh"],
  ["standardHourlyLaborRate", "Standard hourly labour rate"],
  ["poApprovalThreshold", "PO approval threshold"],
  ["targetGrossMarginPercent", "Target gross margin %"],
];

export default function OperationsSettingsClient() {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/operations")
      .then((r) => r.json())
      .then((j) => (j.settings ? setS(j.settings) : setMsg({ ok: false, text: j.error || "Failed to load" })))
      .catch(() => setMsg({ ok: false, text: "Failed to load" }));
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    const body: Settings = {};
    for (const [k] of TOGGLES) body[k] = !!s[k];
    for (const [k] of NUMBERS) body[k] = Number(s[k]) || 0;
    if (typeof s.courierProvider === "string") body.courierProvider = s.courierProvider;
    try {
      const res = await fetch("/api/admin/settings/operations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      setMsg(res.ok ? { ok: true, text: "Settings saved" } : { ok: false, text: j.error || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-[#F3F0E9]">Operations Settings</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#B9B9B4]">Feature switches and costing thresholds. Only SUPER_ADMIN can save changes.</p>
      </div>
      {msg && <p role="status" className={`rounded-lg border px-3 py-2 text-xs ${msg.ok ? "border-[#C8FF35]/30 text-[#C8FF35]" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{msg.text}</p>}
      {!s ? (
        <p className="text-xs text-[#B9B9B4]">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
            {TOGGLES.map(([k, label]) => (
              <label key={k} className="flex items-center justify-between text-sm text-[#F3F0E9]">
                {label}
                <input type="checkbox" checked={!!s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} className="h-4 w-4 accent-[#C8FF35]" />
              </label>
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
            {NUMBERS.map(([k, label]) => (
              <label key={k} className="block text-xs text-[#B9B9B4]">
                {label}
                <input type="number" min={0} step="any" value={Number(s[k] ?? 0)} onChange={(e) => setS({ ...s, [k]: e.target.value })} className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-sm text-[#F3F0E9]" />
              </label>
            ))}
            <label className="block text-xs text-[#B9B9B4]">
              Courier provider
              <input value={String(s.courierProvider ?? "")} onChange={(e) => setS({ ...s, courierProvider: e.target.value })} className="mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-sm text-[#F3F0E9]" />
            </label>
          </div>
        </div>
      )}
      <button onClick={save} disabled={!s || saving} className="rounded-lg bg-[#C8FF35] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0B0B0C] disabled:opacity-50">
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
