"use client";

import React, { useEffect, useState } from "react";
import { Card, Field, inputCls, NoticeBar, Notice, PageHeader, PrimaryButton, readError, Toggle } from "@/components/admin/content/ui";

type S = Record<string, any>;
type Integrations = { razorpayConfigured: boolean; storageProvider: string; s3Configured: boolean };

const TEXT = (key: string, label: string, hint?: string, type = "text") => ({ key, label, hint, type });

const GROUPS: { title: string; fields: ReturnType<typeof TEXT>[] }[] = [
  {
    title: "Brand",
    fields: [
      TEXT("brandName", "Brand name"),
      TEXT("brandTagline", "Tagline"),
      TEXT("brandDescription", "Description"),
      TEXT("footerText", "Footer text"),
      TEXT("announcementBarText", "Announcement bar text"),
    ],
  },
  {
    title: "Contact & business",
    fields: [
      TEXT("contactEmail", "Support email", undefined, "email"),
      TEXT("contactPhone", "Phone"),
      TEXT("whatsAppNumber", "WhatsApp number", "e.g. +919876543210"),
      TEXT("businessAddress", "Business address"),
      TEXT("supportHours", "Support hours"),
    ],
  },
  {
    title: "Currency & orders",
    fields: [
      TEXT("currencySymbol", "Currency symbol"),
      TEXT("currencyCode", "Currency code", "3-letter ISO, e.g. INR"),
      TEXT("orderPrefix", "Order number prefix", "2-8 letters/digits"),
      TEXT("gstNumber", "GSTIN", "15 characters"),
    ],
  },
  {
    title: "Shipping, COD & stock hold (INR)",
    fields: [
      TEXT("standardShippingFee", "Standard shipping fee", undefined, "number"),
      TEXT("expressShippingFee", "Express shipping fee", undefined, "number"),
      TEXT("freeShippingThreshold", "Free shipping threshold", undefined, "number"),
      TEXT("codFee", "COD fee", undefined, "number"),
      TEXT("reservationMinutes", "Unpaid prepaid order stock hold (minutes)", "10 to 10080. After this, unpaid prepaid orders are cancelled and stock is released. COD orders are never expired.", "number"),
    ],
  },
  {
    title: "Social (https only)",
    fields: [
      TEXT("instagramUrl", "Instagram URL"),
      TEXT("instagramHandle", "Instagram handle"),
      TEXT("whatsAppUrl", "WhatsApp URL"),
      TEXT("youtubeUrl", "YouTube URL"),
      TEXT("facebookUrl", "Facebook URL"),
    ],
  },
];

const TOGGLES: [string, string][] = [
  ["announcementBarEnabled", "Show announcement bar"],
  ["standardShippingEnabled", "Standard shipping enabled"],
  ["expressShippingEnabled", "Express shipping enabled"],
  ["globalCodEnabled", "Cash on delivery enabled"],
  ["codFeeEnabled", "Charge COD fee"],
  ["customProductsPrepaidOnly", "Custom products are prepaid only"],
  ["gstEnabled", "GST enabled"],
];

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-[#242426] last:border-0">
      <span className="text-[#B9B9B4]">{label}</span>
      <span className={`font-mono text-xs ${ok ? "text-[#C8FF35]" : "text-gray-500"}`}>{ok ? "configured" : "not configured"}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [s, setS] = useState<S | null>(null);
  const [integ, setInteg] = useState<Integrations | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
      const j = await res.json();
      setS(Object.fromEntries(Object.entries(j.settings).map(([k, v]) => [k, v ?? ""])));
      setInteg(j.integrations);
    })();
  }, []);

  const save = async () => {
    if (!s) return;
    setNotice(null);
    if (!s.standardShippingEnabled && !s.expressShippingEnabled) {
      setSaving(false);
      return setNotice({ kind: "error", text: "At least one shipping method must be enabled." });
    }
    setSaving(true);
    const body: S = { ...s };
    for (const g of GROUPS) for (const f of g.fields) if (f.type === "number") body[f.key] = Number(body[f.key]);
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    const j = await res.json();
    setS(Object.fromEntries(Object.entries(j.settings).map(([k, v]) => [k, v ?? ""])));
    setNotice({ kind: "ok", text: j.changedKeys.length ? `Saved: ${j.changedKeys.join(", ")}` : "No changes." });
  };

  if (!s) return <div className="text-sm text-[#B9B9B4]">{notice ? <NoticeBar notice={notice} /> : "Loading settings..."}</div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Store settings" subtitle="Changes apply to the storefront and checkout. Every save is written to the audit log." />

      <Card title="Secrets and integrations">
        <p className="text-xs text-[#B9B9B4] mb-3">
          Razorpay keys, R2/S3 credentials and database URLs are environment variables on the server only. They cannot be viewed or edited here.
        </p>
        {integ && (
          <div className="max-w-md">
            <Status ok={integ.razorpayConfigured} label="Razorpay payments" />
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-[#242426]">
              <span className="text-[#B9B9B4]">Storage provider</span>
              <span className="font-mono text-xs text-[#F3F0E9]">{integ.storageProvider}</span>
            </div>
            <Status ok={integ.s3Configured} label="S3 / R2 credentials" />
          </div>
        )}
      </Card>

      {GROUPS.map((g) => (
        <Card key={g.title} title={g.title}>
          <div className="grid sm:grid-cols-2 gap-4">
            {g.fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <input
                  className={inputCls}
                  type={f.type === "number" ? "number" : "text"}
                  min={f.type === "number" ? 0 : undefined}
                  step={f.type === "number" ? (f.key === "reservationMinutes" ? 1 : "any") : undefined}
                  value={s[f.key] ?? ""}
                  onChange={(e) => setS({ ...s, [f.key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        </Card>
      ))}

      <Card title="Switches">
        <div className="grid sm:grid-cols-2 gap-3">
          {TOGGLES.map(([k, label]) => (
            <Toggle key={k} label={label} checked={Boolean(s[k])} onChange={(v) => setS({ ...s, [k]: v })} />
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3 sticky bottom-0 bg-[#0B0B0C]/90 backdrop-blur py-3">
        <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving..." : "Save settings"}</PrimaryButton>
        <NoticeBar notice={notice} />
      </div>
    </div>
  );
}
