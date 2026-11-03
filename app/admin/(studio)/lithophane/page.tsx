"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, Field, inputCls, NoticeBar, PageHeader, PrimaryButton, SecondaryButton, readError, Toggle, type Notice } from "@/components/admin/content/ui";

type Size = {
  id: string;
  varietyId: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number | null;
  thicknessMm: number;
  priceAdjustment: number;
  productionNotes: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};
type Variety = {
  id: string;
  key: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
  baseModel: string;
  basePrice: number;
  supportsLight: boolean;
  isActive: boolean;
  sortOrder: number;
  productionDays: number;
  optionGroups: unknown;
  defaultSizeId: string | null;
  sizes: Size[];
  arEnabled?: boolean;
  arPlacementType?: string;
  arModelSource?: string;
  arScaleMode?: string;
  arBaseOffset?: number;
  supportsArLighting?: boolean;
};
type Settings = Record<string, any>;

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

const num = (v: string) => (v === "" ? 0 : Number(v));

export default function LithophaneAdminPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await call("GET", "/api/admin/lithophane");
      setSettings(d.settings);
      setVarieties(d.varieties);
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Could not load" });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ kind: "ok", text: `${label} saved` });
      await load();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <div className="p-8 text-sm text-gray-400">{notice ? <NoticeBar notice={notice} /> : "Loading..."}</div>;

  const S = (k: string, v: unknown) => setSettings({ ...settings, [k]: v });
  const saveSettings = () =>
    run("Settings", () =>
      call("PUT", "/api/admin/lithophane", {
        defaultVarietyId: settings.defaultVarietyId || null,
        defaultOrientation: settings.defaultOrientation,
        defaultCropStrategy: settings.defaultCropStrategy,
        defaultThicknessMm: Number(settings.defaultThicknessMm),
        minThicknessMm: Number(settings.minThicknessMm),
        previewResolution: Number(settings.previewResolution),
        productionResolution: Number(settings.productionResolution),
        allowCustomDimensions: !!settings.allowCustomDimensions,
        customMinMm: Number(settings.customMinMm),
        customMaxMm: Number(settings.customMaxMm),
        customPricePer100Cm2: Number(settings.customPricePer100Cm2),
        headline: settings.headline,
        subheadline: settings.subheadline,
        uploadGuidance: settings.uploadGuidance,
        previewDisclaimer: settings.previewDisclaimer,
        leadTimeText: settings.leadTimeText,
      }),
    );

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8" data-testid="lithophane-admin">
      <PageHeader
        title="Lithophane Builder"
        subtitle="Defaults, product types, sizes and prices for /customize/lithophane. Seed values are placeholders: set your real dimensions and prices here. Existing orders keep a frozen snapshot and are never changed by edits."
      />
      <NoticeBar notice={notice} />

      <Card title="Defaults and generation">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Default product type">
            <select className={inputCls} value={settings.defaultVarietyId ?? ""} onChange={(e) => S("defaultVarietyId", e.target.value)}>
              {varieties.filter((v) => v.isActive).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Default orientation">
            <select className={inputCls} value={settings.defaultOrientation} onChange={(e) => S("defaultOrientation", e.target.value)}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </Field>
          <Field label="Crop strategy" hint="center = safe centre crop (customer can adjust)">
            <select className={inputCls} value={settings.defaultCropStrategy} onChange={(e) => S("defaultCropStrategy", e.target.value)}>
              <option value="center">Centre</option>
              <option value="smart">Smart (centre, reserved)</option>
            </select>
          </Field>
          <Field label="Default max thickness (mm)"><input type="number" step="0.1" className={inputCls} value={settings.defaultThicknessMm} onChange={(e) => S("defaultThicknessMm", num(e.target.value))} /></Field>
          <Field label="Min thickness (mm)"><input type="number" step="0.1" className={inputCls} value={settings.minThicknessMm} onChange={(e) => S("minThicknessMm", num(e.target.value))} /></Field>
          <Field label="Preview resolution (samples, long side)" hint="Browser preview only"><input type="number" className={inputCls} value={settings.previewResolution} onChange={(e) => S("previewResolution", num(e.target.value))} /></Field>
          <Field label="Production resolution (samples, long side)" hint="Used by the queued PRODUCTION generation"><input type="number" className={inputCls} value={settings.productionResolution} onChange={(e) => S("productionResolution", num(e.target.value))} /></Field>
          <Field label="Custom size minimum (mm)"><input type="number" className={inputCls} value={settings.customMinMm} onChange={(e) => S("customMinMm", num(e.target.value))} /></Field>
          <Field label="Custom size maximum (mm)"><input type="number" className={inputCls} value={settings.customMaxMm} onChange={(e) => S("customMaxMm", num(e.target.value))} /></Field>
          <Field label="Custom size price per 100 cm2 (INR)"><input type="number" className={inputCls} value={settings.customPricePer100Cm2} onChange={(e) => S("customPricePer100Cm2", num(e.target.value))} /></Field>
        </div>
        <div className="mt-4"><Toggle label="Allow customers to enter custom width and height" checked={!!settings.allowCustomDimensions} onChange={(v) => S("allowCustomDimensions", v)} /></div>
      </Card>

      <Card title="Copy">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headline"><input className={inputCls} value={settings.headline} onChange={(e) => S("headline", e.target.value)} /></Field>
          <Field label="Subheadline"><input className={inputCls} value={settings.subheadline} onChange={(e) => S("subheadline", e.target.value)} /></Field>
          <Field label="Upload guidance"><input className={inputCls} value={settings.uploadGuidance} onChange={(e) => S("uploadGuidance", e.target.value)} /></Field>
          <Field label="Lead time text"><input className={inputCls} value={settings.leadTimeText} onChange={(e) => S("leadTimeText", e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Preview disclaimer"><textarea rows={2} className={inputCls} value={settings.previewDisclaimer} onChange={(e) => S("previewDisclaimer", e.target.value)} /></Field></div>
        </div>
        <div className="mt-4"><PrimaryButton onClick={saveSettings} disabled={busy}>Save settings</PrimaryButton></div>
      </Card>

      {varieties.map((v) => (
        <VarietyEditor key={v.id} v={v} busy={busy} run={run} />
      ))}
      <NewVariety busy={busy} run={run} />
    </div>
  );
}

function VarietyEditor({ v, busy, run }: { v: Variety; busy: boolean; run: (l: string, f: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = useState({
    name: v.name,
    description: v.description,
    thumbnailUrl: v.thumbnailUrl ?? "",
    baseModel: v.baseModel,
    basePrice: v.basePrice,
    supportsLight: v.supportsLight,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
    productionDays: v.productionDays,
    defaultSizeId: v.defaultSizeId ?? "",
    arEnabled: v.arEnabled ?? true,
    arPlacementType: v.arPlacementType ?? "floor",
    arModelSource: v.arModelSource ?? "auto",
    arScaleMode: v.arScaleMode ?? "fixed",
    arBaseOffset: v.arBaseOffset ?? 0,
    supportsArLighting: v.supportsArLighting ?? true,
  });
  const [groups, setGroups] = useState(JSON.stringify(v.optionGroups ?? [], null, 2));
  const [parseErr, setParseErr] = useState<string | null>(null);

  const save = () => {
    let og: unknown;
    try {
      og = JSON.parse(groups);
    } catch {
      setParseErr("Option groups JSON is invalid");
      return;
    }
    setParseErr(null);
    void run(`${v.name}`, () =>
      call("PATCH", `/api/admin/lithophane/varieties/${v.id}`, {
        name: f.name,
        description: f.description,
        thumbnailUrl: f.thumbnailUrl || null,
        baseModel: f.baseModel,
        basePrice: Number(f.basePrice),
        supportsLight: f.supportsLight,
        isActive: f.isActive,
        sortOrder: Number(f.sortOrder),
        productionDays: Number(f.productionDays),
        defaultSizeId: f.defaultSizeId || undefined,
        optionGroups: og,
        arEnabled: f.arEnabled,
        arPlacementType: f.arPlacementType,
        arModelSource: f.arModelSource,
        arScaleMode: f.arScaleMode,
        arBaseOffset: Number(f.arBaseOffset),
        supportsArLighting: f.supportsArLighting,
      }),
    );
  };

  return (
    <Card title={`${v.name} (${v.key})`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Base price (INR)"><input type="number" className={inputCls} value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: num(e.target.value) })} /></Field>
        <Field label="Base model key" hint="photo_frame, table_stand or light_box"><input className={inputCls} value={f.baseModel} onChange={(e) => setF({ ...f, baseModel: e.target.value })} /></Field>
        <Field label="Thumbnail URL"><input className={inputCls} value={f.thumbnailUrl} onChange={(e) => setF({ ...f, thumbnailUrl: e.target.value })} /></Field>
        <Field label="Sort order"><input type="number" className={inputCls} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: num(e.target.value) })} /></Field>
        <Field label="Production days"><input type="number" className={inputCls} value={f.productionDays} onChange={(e) => setF({ ...f, productionDays: num(e.target.value) })} /></Field>
        <Field label="Default size">
          <select className={inputCls} value={f.defaultSizeId} onChange={(e) => setF({ ...f, defaultSizeId: e.target.value })}>
            {v.sizes.filter((s) => s.isActive).map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </Field>
        <div className="sm:col-span-2"><Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-5">
        <Toggle label="Active" checked={f.isActive} onChange={(x) => setF({ ...f, isActive: x })} />
        <Toggle label="Supports light preview" checked={f.supportsLight} onChange={(x) => setF({ ...f, supportsLight: x })} />
      </div>

      <div className="mt-4 rounded-xl border border-[#242426] bg-[#0E0E10] p-4">
        <h4 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-daxul-lime">AR & Tabletop Experience Controls</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="AR Placement Type" hint="Horizontal table surface">
            <select className={inputCls} value={f.arPlacementType} onChange={(e) => setF({ ...f, arPlacementType: e.target.value })}>
              <option value="floor">Floor / Tabletop (Horizontal)</option>
              <option value="table">Table</option>
            </select>
          </Field>
          <Field label="AR Scale Mode" hint="fixed = 1:1 manufacturing size">
            <select className={inputCls} value={f.arScaleMode} onChange={(e) => setF({ ...f, arScaleMode: e.target.value })}>
              <option value="fixed">Fixed (1:1 Physical Scale)</option>
              <option value="auto">Auto Scale</option>
            </select>
          </Field>
          <Field label="AR Model Source / Mode">
            <input className={inputCls} value={f.arModelSource} onChange={(e) => setF({ ...f, arModelSource: e.target.value })} />
          </Field>
          <Field label="AR Base Offset (mm)" hint="Vertical offset so bottom sits on table">
            <input type="number" step="0.5" className={inputCls} value={f.arBaseOffset} onChange={(e) => setF({ ...f, arBaseOffset: num(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-5">
          <Toggle label="AR Enabled (Show 'View on your table')" checked={f.arEnabled} onChange={(x) => setF({ ...f, arEnabled: x })} data-testid={`variety-ar-enabled-${v.key}`} />
          <Toggle label="Supports AR Lighting Preview" checked={f.supportsArLighting} onChange={(x) => setF({ ...f, supportsArLighting: x })} />
        </div>
      </div>
      <div className="mt-4">
        <Field label="Option groups (JSON)" hint='[{ key, label, type: "select"|"toggle", geometry: true|false, choices: [{ value, label, priceAdjustment }], default }]. geometry=true regenerates the preview when changed.'>
          <textarea rows={8} className={`${inputCls} font-mono text-xs`} value={groups} onChange={(e) => setGroups(e.target.value)} />
        </Field>
        {parseErr && <p className="text-xs text-red-300">{parseErr}</p>}
      </div>
      <div className="mt-3"><PrimaryButton onClick={save} disabled={busy}>Save {v.name}</PrimaryButton></div>

      <h3 className="mt-6 mb-2 font-mono text-[11px] uppercase tracking-widest text-[#C8FF35]">Sizes</h3>
      <div className="space-y-3">
        {v.sizes.map((s) => (
          <SizeEditor key={s.id} s={s} busy={busy} run={run} />
        ))}
        <NewSize varietyId={v.id} busy={busy} run={run} />
      </div>
    </Card>
  );
}

function SizeEditor({ s, busy, run }: { s: Size; busy: boolean; run: (l: string, f: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = useState({ ...s, productionNotes: s.productionNotes ?? "", depthMm: s.depthMm ?? 0 });
  return (
    <div className="rounded-xl border border-[#242426] bg-[#0B0B0C] p-3" data-testid={`size-row-${s.id}`}>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Width mm"><input type="number" className={inputCls} value={f.widthMm} onChange={(e) => setF({ ...f, widthMm: num(e.target.value) })} /></Field>
        <Field label="Height mm"><input type="number" className={inputCls} value={f.heightMm} onChange={(e) => setF({ ...f, heightMm: num(e.target.value) })} /></Field>
        <Field label="Depth mm"><input type="number" className={inputCls} value={f.depthMm} onChange={(e) => setF({ ...f, depthMm: num(e.target.value) })} /></Field>
        <Field label="Thickness mm"><input type="number" step="0.1" className={inputCls} value={f.thicknessMm} onChange={(e) => setF({ ...f, thicknessMm: num(e.target.value) })} /></Field>
        <Field label="Price adj (INR)"><input type="number" className={inputCls} value={f.priceAdjustment} onChange={(e) => setF({ ...f, priceAdjustment: num(e.target.value) })} /></Field>
      </div>
      <div className="mt-3"><Field label="Production notes (admin only)"><input className={inputCls} value={f.productionNotes} onChange={(e) => setF({ ...f, productionNotes: e.target.value })} /></Field></div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Toggle label="Active" checked={f.isActive} onChange={(x) => setF({ ...f, isActive: x })} />
        <Toggle label="Default size" checked={f.isDefault} onChange={(x) => setF({ ...f, isDefault: x })} />
        <PrimaryButton disabled={busy} onClick={() => run(s.name, () => call("PATCH", `/api/admin/lithophane/sizes/${s.id}`, {
          name: f.name, widthMm: Number(f.widthMm), heightMm: Number(f.heightMm), depthMm: Number(f.depthMm) || null, thicknessMm: Number(f.thicknessMm),
          priceAdjustment: Number(f.priceAdjustment), productionNotes: f.productionNotes || null, isActive: f.isActive, ...(f.isDefault && !s.isDefault ? { isDefault: true } : {}),
        }))}>Save size</PrimaryButton>
        {!s.isDefault && <SecondaryButton disabled={busy} onClick={() => run("Delete", () => call("DELETE", `/api/admin/lithophane/sizes/${s.id}`))}>Delete</SecondaryButton>}
      </div>
    </div>
  );
}

function NewSize({ varietyId, busy, run }: { varietyId: string; busy: boolean; run: (l: string, f: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = useState({ name: "", widthMm: 100, heightMm: 150, depthMm: 20, thicknessMm: 3, priceAdjustment: 0 });
  return (
    <div className="grid gap-3 rounded-xl border border-dashed border-[#242426] p-3 sm:grid-cols-4 lg:grid-cols-7">
      <Field label="New size name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Width"><input type="number" className={inputCls} value={f.widthMm} onChange={(e) => setF({ ...f, widthMm: num(e.target.value) })} /></Field>
      <Field label="Height"><input type="number" className={inputCls} value={f.heightMm} onChange={(e) => setF({ ...f, heightMm: num(e.target.value) })} /></Field>
      <Field label="Depth"><input type="number" className={inputCls} value={f.depthMm} onChange={(e) => setF({ ...f, depthMm: num(e.target.value) })} /></Field>
      <Field label="Thickness"><input type="number" step="0.1" className={inputCls} value={f.thicknessMm} onChange={(e) => setF({ ...f, thicknessMm: num(e.target.value) })} /></Field>
      <Field label="Price adj"><input type="number" className={inputCls} value={f.priceAdjustment} onChange={(e) => setF({ ...f, priceAdjustment: num(e.target.value) })} /></Field>
      <div className="flex items-end"><SecondaryButton disabled={busy || !f.name.trim()} onClick={() => run("Size", () => call("POST", "/api/admin/lithophane/sizes", { varietyId, ...f }))}>Add size</SecondaryButton></div>
    </div>
  );
}

function NewVariety({ busy, run }: { busy: boolean; run: (l: string, f: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = useState({ key: "", name: "", basePrice: 0, baseModel: "photo_frame" });
  return (
    <Card title="Add product type">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Key (a-z, 0-9, _)"><input className={inputCls} value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></Field>
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Base model"><input className={inputCls} value={f.baseModel} onChange={(e) => setF({ ...f, baseModel: e.target.value })} /></Field>
        <Field label="Base price"><input type="number" className={inputCls} value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: num(e.target.value) })} /></Field>
      </div>
      <div className="mt-3"><SecondaryButton disabled={busy || !f.key || !f.name} onClick={() => run("Product type", () => call("POST", "/api/admin/lithophane/varieties", f))}>Add product type (then add sizes)</SecondaryButton></div>
    </Card>
  );
}
