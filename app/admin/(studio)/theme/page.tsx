"use client";

import React, { useEffect, useState } from "react";
import { Card, Field, inputCls, NoticeBar, Notice, PageHeader, PrimaryButton, SecondaryButton, readError } from "@/components/admin/content/ui";

type Theme = {
  accentColor: string; carbonColor: string; boneColor: string; graphiteColor: string;
  buttonRadius: string; borderRadius: string; secondaryTextColor?: string;
};

const COLORS: [keyof Theme, string][] = [
  ["accentColor", "Accent (Electric Lime)"],
  ["carbonColor", "Carbon"],
  ["boneColor", "Bone"],
  ["graphiteColor", "Graphite"],
];
const RADII = ["none", "sm", "md", "lg", "full"];
const RADIUS_PX: Record<string, string> = { none: "0px", sm: "4px", md: "8px", lg: "16px", full: "9999px" };
const HEX = /^#[0-9a-fA-F]{6}$/;

export default function AdminThemePage() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/theme");
      if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
      setTheme((await res.json()).theme);
    })();
  }, []);

  if (!theme) return <div className="text-sm text-[#B9B9B4]">{notice ? <NoticeBar notice={notice} /> : "Loading theme..."}</div>;

  const valid = COLORS.every(([k]) => HEX.test(String(theme[k])));

  const save = async () => {
    setSaving(true);
    setNotice(null);
    const body = {
      accentColor: theme.accentColor, carbonColor: theme.carbonColor, boneColor: theme.boneColor,
      graphiteColor: theme.graphiteColor, buttonRadius: theme.buttonRadius, borderRadius: theme.borderRadius,
    };
    const res = await fetch("/api/admin/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    setTheme((await res.json()).theme);
    setNotice({ kind: "ok", text: "Theme saved." });
  };

  const reset = async () => {
    if (!confirm("Restore the DAXUL default palette and radii?")) return;
    setSaving(true);
    const res = await fetch("/api/admin/theme/reset", { method: "POST" });
    setSaving(false);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    setTheme((await res.json()).theme);
    setNotice({ kind: "ok", text: "Restored DAXUL defaults." });
  };

  const safe = (c: string, fallback: string) => (HEX.test(c) ? c : fallback);
  const btnR = RADIUS_PX[theme.buttonRadius] ?? "8px";
  const cardR = RADIUS_PX[theme.borderRadius] ?? "8px";

  return (
    <div className="space-y-4">
      <PageHeader title="Theme" subtitle="Brand colours and corner radii only. No custom CSS or scripts." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Colours">
          <div className="space-y-4">
            {COLORS.map(([k, label]) => (
              <Field key={k} label={label} hint={HEX.test(String(theme[k])) ? undefined : "Use #RRGGBB"}>
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label={label}
                    value={safe(String(theme[k]), "#000000")}
                    onChange={(e) => setTheme({ ...theme, [k]: e.target.value.toUpperCase() })}
                    className="h-9 w-12 rounded bg-transparent border border-[#242426]"
                  />
                  <input className={`${inputCls} font-mono`} maxLength={7} value={String(theme[k])} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} />
                </div>
              </Field>
            ))}
            <div className="grid grid-cols-2 gap-4">
              {(["buttonRadius", "borderRadius"] as const).map((k) => (
                <Field key={k} label={k === "buttonRadius" ? "Button radius" : "Card radius"}>
                  <select className={inputCls} value={theme[k]} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })}>
                    {RADII.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={save} disabled={saving || !valid}>{saving ? "Working..." : "Save theme"}</PrimaryButton>
              <SecondaryButton onClick={reset} disabled={saving}>Reset to DAXUL default</SecondaryButton>
              <NoticeBar notice={notice} />
            </div>
          </div>
        </Card>

        <Card title="Live preview">
          <div className="p-5 border border-white/10" style={{ background: safe(theme.carbonColor, "#0B0B0C"), borderRadius: cardR }}>
            <div className="flex gap-2 mb-4">
              {COLORS.map(([k]) => (
                <div key={k} className="h-10 flex-1 rounded border border-white/10" style={{ background: safe(String(theme[k]), "#000") }} title={String(theme[k])} />
              ))}
            </div>
            <div className="p-4 mb-4" style={{ background: safe(theme.graphiteColor, "#242426"), borderRadius: cardR, color: safe(theme.boneColor, "#F3F0E9") }}>
              <div className="font-bold">Sample product card</div>
              <div className="text-xs opacity-70 mt-1">Objects made differently.</div>
            </div>
            <button type="button" style={{ background: safe(theme.accentColor, "#C8FF35"), color: safe(theme.carbonColor, "#0B0B0C"), borderRadius: btnR }} className="px-5 py-2 text-xs font-bold uppercase tracking-wider">
              Add to cart
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
