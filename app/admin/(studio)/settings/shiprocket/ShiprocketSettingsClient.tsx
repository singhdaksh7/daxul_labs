"use client";

import React, { useEffect, useState } from "react";

type View = {
  values: {
    email: string;
    pickupLocation: string;
    pickupPincode: string;
    defaultWeightGrams: number | null;
    lengthCm: number | null;
    breadthCm: number | null;
    heightCm: number | null;
    enabled: boolean;
  };
  secrets: { password: { saved: boolean; masked: string }; webhookToken: { saved: boolean; masked: string } };
  envFallback: { email: boolean; password: boolean; webhookToken: boolean };
};

const inputCls = "mt-1.5 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2.5 text-sm text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none";
const labelCls = "block text-xs text-[#B9B9B4]";

export default function ShiprocketSettingsClient() {
  const [view, setView] = useState<View | null>(null);
  const [form, setForm] = useState({
    email: "", password: "", webhookToken: "", pickupLocation: "", pickupPincode: "",
    defaultWeightGrams: "", lengthCm: "", breadthCm: "", heightCm: "", enabled: true,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  const hydrate = (v: View) => {
    setView(v);
    setForm((f) => ({
      ...f,
      email: v.values.email,
      password: "",
      webhookToken: "",
      pickupLocation: v.values.pickupLocation,
      pickupPincode: v.values.pickupPincode,
      defaultWeightGrams: v.values.defaultWeightGrams?.toString() ?? "",
      lengthCm: v.values.lengthCm?.toString() ?? "",
      breadthCm: v.values.breadthCm?.toString() ?? "",
      heightCm: v.values.heightCm?.toString() ?? "",
      enabled: v.values.enabled,
    }));
  };

  useEffect(() => {
    fetch("/api/admin/integrations/shiprocket")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Failed to load");
        hydrate(j);
      })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  const num = (s: string) => (s.trim() === "" ? "" : Number(s));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("save");
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        email: form.email,
        pickupLocation: form.pickupLocation,
        pickupPincode: form.pickupPincode,
        defaultWeightGrams: num(form.defaultWeightGrams),
        lengthCm: num(form.lengthCm),
        breadthCm: num(form.breadthCm),
        heightCm: num(form.heightCm),
        enabled: form.enabled,
      };
      if (form.password) body.password = form.password;
      if (form.webhookToken) body.webhookToken = form.webhookToken;
      const res = await fetch("/api/admin/integrations/shiprocket", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.issues?.[0]?.message || j.error || "Save failed");
      hydrate(j);
      setMsg({ ok: true, text: "Saved. Changes apply immediately." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/integrations/shiprocket/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email || undefined, password: form.password || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      setMsg({ ok: !!j.ok, text: j.message || j.error || "Test failed" });
    } finally {
      setBusy(null);
    }
  };

  const secretHint = (s?: { saved: boolean; masked: string }, env?: boolean) =>
    s?.saved ? `Saved (${s.masked}). Leave blank to keep it.` : env ? "Using the server's environment value. Enter one to override." : "Not set";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-[#F3F0E9]">Shiprocket</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#B9B9B4]">
          API credentials and parcel defaults. Use the <strong>API user</strong> created in Shiprocket under Settings → API (not your normal login).
          Passwords and tokens are stored encrypted and are never shown again. Only SUPER_ADMIN can view or change this page.
        </p>
      </div>
      {msg && <p role="status" className={`rounded-lg border px-3 py-2 text-xs ${msg.ok ? "border-[#C8FF35]/30 text-[#C8FF35]" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{msg.text}</p>}
      {!view && !msg && <p className="text-xs text-[#B9B9B4]">Loading…</p>}
      {view && (
        <form onSubmit={save} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
              <h2 className="text-sm font-bold text-[#F3F0E9]">Credentials</h2>
              <label className={labelCls}>API user email
                <input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={view.envFallback.email ? "(using server environment)" : "api-user@yourdomain.com"} className={inputCls} />
              </label>
              <label className={labelCls}>API user password
                <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className={inputCls} />
                <span className="mt-1 block text-[11px] text-[#71717A]">{secretHint(view.secrets.password, view.envFallback.password)}</span>
              </label>
              <label className={labelCls}>Webhook token
                <input type="password" autoComplete="new-password" value={form.webhookToken} onChange={(e) => setForm({ ...form, webhookToken: e.target.value })} placeholder="Choose any long random string" className={inputCls} />
                <span className="mt-1 block text-[11px] text-[#71717A]">{secretHint(view.secrets.webhookToken, view.envFallback.webhookToken)}</span>
              </label>
              <label className="flex items-center justify-between text-sm text-[#F3F0E9]">
                Shiprocket enabled
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 accent-[#C8FF35]" />
              </label>
            </div>
            <div className="space-y-3 rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
              <h2 className="text-sm font-bold text-[#F3F0E9]">Pickup &amp; parcel defaults</h2>
              <label className={labelCls}>Pickup location name (must match your Shiprocket address nickname)
                <input value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} placeholder="Primary" className={inputCls} />
              </label>
              <label className={labelCls}>Pickup pincode
                <input inputMode="numeric" maxLength={6} value={form.pickupPincode} onChange={(e) => setForm({ ...form, pickupPincode: e.target.value.replace(/\D/g, "") })} placeholder="6 digits" className={inputCls} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>Weight (grams)
                  <input type="number" min={1} value={form.defaultWeightGrams} onChange={(e) => setForm({ ...form, defaultWeightGrams: e.target.value })} placeholder="500" className={inputCls} />
                </label>
                <label className={labelCls}>Length (cm)
                  <input type="number" min={1} value={form.lengthCm} onChange={(e) => setForm({ ...form, lengthCm: e.target.value })} placeholder="15" className={inputCls} />
                </label>
                <label className={labelCls}>Breadth (cm)
                  <input type="number" min={1} value={form.breadthCm} onChange={(e) => setForm({ ...form, breadthCm: e.target.value })} placeholder="15" className={inputCls} />
                </label>
                <label className={labelCls}>Height (cm)
                  <input type="number" min={1} value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} placeholder="10" className={inputCls} />
                </label>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6 text-xs text-[#B9B9B4]">
            <p className="font-semibold text-[#F3F0E9]">Webhook (live tracking)</p>
            <p className="mt-1">In Shiprocket → Settings → API → Webhooks set the URL to <code className="text-[#C8FF35]">{typeof window !== "undefined" ? window.location.origin : ""}/api/shiprocket/webhook</code> and use the webhook token above as the <code>x-api-key</code> value.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy !== null} className="rounded-lg bg-[#C8FF35] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0B0B0C] disabled:opacity-50">{busy === "save" ? "Saving…" : "Save settings"}</button>
            <button type="button" onClick={test} disabled={busy !== null} className="rounded-lg border border-[#242426] bg-[#151515] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#F3F0E9] hover:border-[#C8FF35] disabled:opacity-50">{busy === "test" ? "Testing…" : "Test connection"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
