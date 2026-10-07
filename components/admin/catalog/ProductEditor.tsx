"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2, Save, Image as ImageIcon, Copy } from "lucide-react";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { Card, Field, Toggle, inputCls, btnPrimary, btnGhost, btnDanger, moveItem, slugifyClient } from "./ui";

type Variant = { id?: string; name: string; sku: string; priceAdjustment: number | string; stock: number | string | null; isActive: boolean };
type VGroup = { id?: string; name: string; variants: Variant[] };
type Choice = { label: string; value?: string; priceAdjustment: number | string };
type CField = {
  id?: string;
  type: string;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  fee: number | string;
  isActive: boolean;
  choices: Choice[];
};
type Costs = {
  filamentGrams: number | string;
  filamentCostPerGram: number | string;
  printHours: number | string;
  electricityPerHour: number | string;
  hardwareCost: number | string;
  ledElectronicsCost: number | string;
  packagingCost: number | string;
  otherMaterialCost: number | string;
};
type FormState = {
  id?: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  story: string;
  collectionId: string;
  price: number | string;
  compareAtPrice: number | string;
  sku: string;
  customizable: boolean;
  prepaidOnly: boolean;
  codEnabled: boolean;
  isFeatured: boolean;
  isActive: boolean;
  isArchived: boolean;
  trackInventory: boolean;
  stock: number | string;
  lowStockThreshold: number | string;
  badge: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  images: string[];
  videoUrl: string;
  materials: string;
  dimensions: string;
  careInstructions: string[];
  leadTimeText: string;
  productionTimeDays: number | string;
  estimatedDispatchDays: number | string;
  specs: { label: string; value: string }[];
  faq: { question: string; answer: string }[];
  businessCosts: Costs;
  variantGroups: VGroup[];
  customFields: CField[];
};

const emptyCosts: Costs = {
  filamentGrams: 0,
  filamentCostPerGram: 0,
  printHours: 0,
  electricityPerHour: 0,
  hardwareCost: 0,
  ledElectronicsCost: 0,
  packagingCost: 0,
  otherMaterialCost: 0,
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  subtitle: "",
  description: "",
  story: "",
  collectionId: "",
  price: "",
  compareAtPrice: "",
  sku: "",
  customizable: false,
  prepaidOnly: false,
  codEnabled: true,
  isFeatured: false,
  isActive: true,
  isArchived: false,
  trackInventory: true,
  stock: 0,
  lowStockThreshold: 3,
  badge: "",
  seoTitle: "",
  seoDescription: "",
  ogImage: "",
  images: [],
  videoUrl: "",
  materials: "",
  dimensions: "",
  careInstructions: [],
  leadTimeText: "",
  productionTimeDays: 2,
  estimatedDispatchDays: 3,
  specs: [],
  faq: [],
  businessCosts: emptyCosts,
  variantGroups: [],
  customFields: [],
};

const FIELD_TYPES = ["text", "textarea", "photo", "file", "date", "select", "radio"];
const num = (v: unknown) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v));
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function fromApi(p: any): FormState {
  const s = (v: any) => (v === null || v === undefined ? "" : v);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    subtitle: s(p.subtitle),
    description: s(p.description),
    story: s(p.story),
    collectionId: s(p.collectionId),
    price: p.price,
    compareAtPrice: s(p.compareAtPrice),
    sku: s(p.sku),
    customizable: p.customizable,
    prepaidOnly: p.prepaidOnly,
    codEnabled: p.codEnabled,
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    isArchived: p.isArchived,
    trackInventory: p.trackInventory,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    badge: s(p.badge),
    seoTitle: s(p.seoTitle),
    seoDescription: s(p.seoDescription),
    ogImage: s(p.ogImage),
    images: p.images || [],
    videoUrl: s(p.videoUrl),
    materials: s(p.materials),
    dimensions: s(p.dimensions),
    careInstructions: p.careInstructions || [],
    leadTimeText: s(p.leadTimeText),
    productionTimeDays: p.productionTimeDays,
    estimatedDispatchDays: p.estimatedDispatchDays,
    specs: Array.isArray(p.specs) ? p.specs : [],
    faq: Array.isArray(p.faq) ? p.faq : [],
    businessCosts: { ...emptyCosts, ...(p.businessCosts || {}) },
    variantGroups: (p.variantGroups || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      variants: g.variants.map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: s(v.sku),
        priceAdjustment: v.priceAdjustment,
        stock: v.stock,
        isActive: v.isActive,
      })),
    })),
    customFields: (p.customFields || []).map((f: any) => ({
      id: f.id,
      type: f.type,
      label: f.label,
      placeholder: s(f.placeholder),
      helpText: s(f.helpText),
      required: f.required,
      fee: f.fee,
      isActive: f.isActive,
      choices:
        Array.isArray(f.choices) && f.choices.length
          ? f.choices
          : (f.options || []).map((o: string) => ({ label: o, value: o, priceAdjustment: 0 })),
    })),
  };
}

export default function ProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [slugTouched, setSlugTouched] = useState(!!productId);
  const [picker, setPicker] = useState<null | "gallery" | "video" | "og">(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch("/api/admin/collections")
      .then((r) => r.json())
      .then((d) => setCollections((d.collections || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/admin/products?id=${productId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load product");
        setF(fromApi(d.product));
      })
      .catch((e) => setMsg({ kind: "err", text: e.message }))
      .finally(() => setLoading(false));
  }, [productId]);

  // ---------- unit economics (admin-only, never stored on storefront payloads)
  const econ = useMemo(() => {
    const c = f.businessCosts;
    const cost =
      num(c.filamentGrams) * num(c.filamentCostPerGram) +
      num(c.printHours) * num(c.electricityPerHour) +
      num(c.hardwareCost) +
      num(c.ledElectronicsCost) +
      num(c.packagingCost) +
      num(c.otherMaterialCost);
    const price = num(f.price);
    const calc = (sell: number) => ({ sell, profit: sell - cost, margin: sell > 0 ? ((sell - cost) / sell) * 100 : 0 });
    return { cost, base: calc(price), variants: f.variantGroups.flatMap((g) => g.variants.filter((v) => v.name).map((v) => ({ label: `${g.name}: ${v.name}`, ...calc(price + num(v.priceAdjustment)) }))) };
  }, [f.businessCosts, f.price, f.variantGroups]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        ...f,
        id: f.id,
        slug: f.slug,
        price: num(f.price),
        compareAtPrice: f.compareAtPrice === "" ? null : num(f.compareAtPrice),
        stock: num(f.stock),
        lowStockThreshold: num(f.lowStockThreshold),
        productionTimeDays: num(f.productionTimeDays),
        estimatedDispatchDays: num(f.estimatedDispatchDays),
        collectionId: f.collectionId || null,
        careInstructions: f.careInstructions.map((c) => c.trim()).filter(Boolean),
        specs: f.specs.filter((x) => x.label.trim()),
        faq: f.faq.filter((x) => x.question.trim()),
        businessCosts: Object.fromEntries(Object.entries(f.businessCosts).map(([k, v]) => [k, num(v)])),
        variantGroups: f.variantGroups.map((g) => ({
          ...g,
          variants: g.variants.map((v) => ({
            ...v,
            priceAdjustment: num(v.priceAdjustment),
            stock: v.stock === "" || v.stock === null ? null : num(v.stock),
          })),
        })),
        customFields: f.customFields.map((cf) => ({
          ...cf,
          fee: num(cf.fee),
          choices: cf.type === "select" || cf.type === "radio" ? cf.choices.map((c) => ({ ...c, priceAdjustment: num(c.priceAdjustment) })) : [],
        })),
      };
      const res = await fetch("/api/admin/products", {
        method: f.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.[0] ? ` (${data.issues[0].path}: ${data.issues[0].message})` : "";
        throw new Error((data.error || "Save failed") + detail);
      }
      if (!f.id) {
        router.replace(`/admin/products/${data.product.id}`);
      } else {
        setF(fromApi(data.product));
        setMsg({ kind: "ok", text: "Saved." });
      }
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (!f.id) return;
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, action: "duplicate" }),
    });
    const d = await res.json();
    if (res.ok) router.push(`/admin/products/${d.product.id}`);
    else setMsg({ kind: "err", text: d.error || "Duplicate failed" });
  };

  if (loading) return <div className="p-8 text-sm text-[#B9B9B4]">Loading product…</div>;

  const updGroup = (gi: number, patch: Partial<VGroup>) =>
    set("variantGroups", f.variantGroups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const updVariant = (gi: number, vi: number, patch: Partial<Variant>) =>
    updGroup(gi, { variants: f.variantGroups[gi].variants.map((v, i) => (i === vi ? { ...v, ...patch } : v)) });
  const updField = (i: number, patch: Partial<CField>) => set("customFields", f.customFields.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const pickerCurrent =
    picker === "video" ? (f.videoUrl ? { mediaType: "video" as const, url: f.videoUrl } : undefined) : picker === "og" && f.ogImage ? { mediaType: "image" as const, url: f.ogImage } : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 pb-28 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="text-xs text-[#B9B9B4] hover:text-[#C8FF35]">← Products</Link>
          <h1 className="text-2xl font-semibold text-[#F3F0E9]">{f.id ? f.name || "Edit product" : "New product"}</h1>
        </div>
        {f.id && (
          <button className={btnGhost} onClick={duplicate}>
            <Copy size={14} /> Duplicate
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-md border px-3 py-2 text-sm ${msg.kind === "ok" ? "border-[#C8FF35]/40 text-[#C8FF35]" : "border-red-500/40 text-red-300"}`}>{msg.text}</div>
      )}

      <Card title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name *">
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugifyClient(e.target.value));
              }}
            />
          </Field>
          <Field label="Slug" hint="Unique URL key. Auto-generated from name.">
            <input
              className={inputCls}
              value={f.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugifyClient(e.target.value));
              }}
            />
          </Field>
          <Field label="Subtitle">
            <input className={inputCls} value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </Field>
          <Field label="Collection">
            <select className={inputCls} value={f.collectionId} onChange={(e) => set("collectionId", e.target.value)}>
              <option value="">— None —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Badge">
            <input className={inputCls} value={f.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. New, Bestseller" />
          </Field>
        </div>
        <Field label="Description">
          <textarea className={inputCls} rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Story">
          <textarea className={inputCls} rows={4} value={f.story} onChange={(e) => set("story", e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-6">
          <Toggle label="Active (visible in store)" checked={f.isActive} onChange={(v) => set("isActive", v)} />
          <Toggle label="Featured" checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} />
          <Toggle label="Archived" checked={f.isArchived} onChange={(v) => set("isArchived", v)} />
        </div>
      </Card>

      <Card title="Pricing & inventory">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Price (₹) *">
            <input type="number" min={0} step="0.01" className={inputCls} value={f.price} onChange={(e) => set("price", e.target.value)} />
          </Field>
          <Field label="Compare-at price (₹)">
            <input type="number" min={0} step="0.01" className={inputCls} value={f.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} />
          </Field>
          <Field label="SKU" hint="Unique">
            <input className={inputCls} value={f.sku} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Stock" hint="Changes are recorded in the inventory ledger.">
            <input type="number" min={0} className={inputCls} value={f.stock} onChange={(e) => set("stock", e.target.value)} />
          </Field>
          <Field label="Low-stock threshold">
            <input type="number" min={0} className={inputCls} value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <Toggle label="Track inventory" checked={f.trackInventory} onChange={(v) => set("trackInventory", v)} />
          <Toggle label="Customizable" checked={f.customizable} onChange={(v) => set("customizable", v)} />
          <Toggle label="Prepaid only" checked={f.prepaidOnly} onChange={(v) => set("prepaidOnly", v)} />
          <Toggle label="COD enabled" checked={f.codEnabled} onChange={(v) => set("codEnabled", v)} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Lead time text">
            <input className={inputCls} value={f.leadTimeText} onChange={(e) => set("leadTimeText", e.target.value)} placeholder="Made to order in 2–4 days" />
          </Field>
          <Field label="Production time (days)">
            <input type="number" min={0} className={inputCls} value={f.productionTimeDays} onChange={(e) => set("productionTimeDays", e.target.value)} />
          </Field>
          <Field label="Estimated dispatch (days)">
            <input type="number" min={0} className={inputCls} value={f.estimatedDispatchDays} onChange={(e) => set("estimatedDispatchDays", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card
        title="Media"
        actions={
          <button className={btnGhost} onClick={() => setPicker("gallery")}>
            <Plus size={14} /> Add image
          </button>
        }
      >
        {f.images.length === 0 && <p className="text-sm text-[#B9B9B4]">No images yet. The first image is the primary product image.</p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {f.images.map((url, i) => (
            <div key={url + i} className="rounded-md border border-white/10 bg-[#0B0B0C] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full rounded object-cover" />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-[#B9B9B4]">{i === 0 ? "Primary" : `#${i + 1}`}</span>
                <div className="flex gap-1">
                  <button className={btnGhost} onClick={() => set("images", moveItem(f.images, i, i - 1))} disabled={i === 0}><ArrowUp size={12} /></button>
                  <button className={btnGhost} onClick={() => set("images", moveItem(f.images, i, i + 1))} disabled={i === f.images.length - 1}><ArrowDown size={12} /></button>
                  <button className={btnDanger} onClick={() => set("images", f.images.filter((_, x) => x !== i))}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Video URL">
            <div className="flex gap-2">
              <input className={inputCls} value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
              <button className={btnGhost} onClick={() => setPicker("video")}><ImageIcon size={14} /> Pick</button>
            </div>
          </Field>
          <Field label="OG image">
            <div className="flex gap-2">
              <input className={inputCls} value={f.ogImage} onChange={(e) => set("ogImage", e.target.value)} />
              <button className={btnGhost} onClick={() => setPicker("og")}><ImageIcon size={14} /> Pick</button>
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title="Variants"
        actions={
          <button className={btnGhost} onClick={() => set("variantGroups", [...f.variantGroups, { name: "", variants: [{ name: "", sku: "", priceAdjustment: 0, stock: null, isActive: true }] }])}>
            <Plus size={14} /> Add group
          </button>
        }
      >
        {f.variantGroups.length === 0 && <p className="text-sm text-[#B9B9B4]">No variants. Add groups like Size, Color, Light Temperature, Base Type or Material.</p>}
        {f.variantGroups.map((g, gi) => (
          <div key={g.id ?? gi} className="rounded-md border border-white/10 bg-[#0B0B0C] p-3">
            <div className="mb-3 flex items-center gap-2">
              <input className={inputCls} placeholder="Group name (e.g. Size)" value={g.name} onChange={(e) => updGroup(gi, { name: e.target.value })} />
              <button className={btnGhost} onClick={() => set("variantGroups", moveItem(f.variantGroups, gi, gi - 1))}><ArrowUp size={12} /></button>
              <button className={btnGhost} onClick={() => set("variantGroups", moveItem(f.variantGroups, gi, gi + 1))}><ArrowDown size={12} /></button>
              <button className={btnDanger} onClick={() => set("variantGroups", f.variantGroups.filter((_, i) => i !== gi))}><Trash2 size={12} /></button>
            </div>
            <div className="space-y-2">
              <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto_auto] gap-2 text-[10px] uppercase text-[#B9B9B4] md:grid">
                <span>Name</span><span>SKU</span><span>Price +/-</span><span>Stock (blank = shared)</span><span>Active</span><span />
              </div>
              {g.variants.map((v, vi) => (
                <div key={v.id ?? vi} className="grid grid-cols-2 items-center gap-2 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto_auto]">
                  <input className={inputCls} placeholder="Name" value={v.name} onChange={(e) => updVariant(gi, vi, { name: e.target.value })} />
                  <input className={inputCls} placeholder="SKU" value={v.sku} onChange={(e) => updVariant(gi, vi, { sku: e.target.value })} />
                  <input type="number" step="0.01" className={inputCls} value={v.priceAdjustment} onChange={(e) => updVariant(gi, vi, { priceAdjustment: e.target.value })} />
                  <input type="number" min={0} className={inputCls} value={v.stock ?? ""} onChange={(e) => updVariant(gi, vi, { stock: e.target.value })} />
                  <input type="checkbox" className="h-4 w-4 accent-[#C8FF35]" checked={v.isActive} onChange={(e) => updVariant(gi, vi, { isActive: e.target.checked })} />
                  <div className="flex gap-1">
                    <button className={btnGhost} onClick={() => updGroup(gi, { variants: moveItem(g.variants, vi, vi - 1) })}><ArrowUp size={12} /></button>
                    <button className={btnGhost} onClick={() => updGroup(gi, { variants: moveItem(g.variants, vi, vi + 1) })}><ArrowDown size={12} /></button>
                    <button className={btnDanger} onClick={() => updGroup(gi, { variants: g.variants.filter((_, i) => i !== vi) })}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button className={`${btnGhost} mt-3`} onClick={() => updGroup(gi, { variants: [...g.variants, { name: "", sku: "", priceAdjustment: 0, stock: null, isActive: true }] })}>
              <Plus size={12} /> Add variant
            </button>
          </div>
        ))}
      </Card>

      <Card
        title="Customization form"
        actions={
          <button className={btnGhost} onClick={() => set("customFields", [...f.customFields, { type: "text", label: "", placeholder: "", helpText: "", required: false, fee: 0, isActive: true, choices: [] }])}>
            <Plus size={14} /> Add field
          </button>
        }
      >
        {f.customFields.length === 0 && <p className="text-sm text-[#B9B9B4]">No customer inputs. Add text, photo upload, date or choice fields (with optional fees).</p>}
        {f.customFields.map((cf, i) => (
          <div key={cf.id ?? i} className="rounded-md border border-white/10 bg-[#0B0B0C] p-3">
            <div className="grid gap-2 md:grid-cols-[1.4fr_0.8fr_0.6fr_auto]">
              <input className={inputCls} placeholder="Label" value={cf.label} onChange={(e) => updField(i, { label: e.target.value })} />
              <select className={inputCls} value={cf.type} onChange={(e) => updField(i, { type: e.target.value, choices: cf.choices.length ? cf.choices : e.target.value === "select" || e.target.value === "radio" ? [{ label: "", value: "", priceAdjustment: 0 }] : [] })}>
                {FIELD_TYPES.map((t) => (<option key={t} value={t}>{t === "photo" ? "photo (image upload)" : t}</option>))}
              </select>
              <input type="number" min={0} step="0.01" className={inputCls} placeholder="Fee ₹" value={cf.fee} onChange={(e) => updField(i, { fee: e.target.value })} />
              <div className="flex gap-1">
                <button className={btnGhost} onClick={() => set("customFields", moveItem(f.customFields, i, i - 1))}><ArrowUp size={12} /></button>
                <button className={btnGhost} onClick={() => set("customFields", moveItem(f.customFields, i, i + 1))}><ArrowDown size={12} /></button>
                <button className={btnDanger} onClick={() => set("customFields", f.customFields.filter((_, x) => x !== i))}><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <input className={inputCls} placeholder="Placeholder" value={cf.placeholder} onChange={(e) => updField(i, { placeholder: e.target.value })} />
              <input className={inputCls} placeholder="Help text" value={cf.helpText} onChange={(e) => updField(i, { helpText: e.target.value })} />
            </div>
            <div className="mt-2 flex gap-6">
              <Toggle label="Required" checked={cf.required} onChange={(v) => updField(i, { required: v })} />
              <Toggle label="Active" checked={cf.isActive} onChange={(v) => updField(i, { isActive: v })} />
            </div>
            {(cf.type === "select" || cf.type === "radio") && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] uppercase text-[#B9B9B4]">Choices (label · value · price +/-)</p>
                {cf.choices.map((c, ci) => (
                  <div key={ci} className="grid grid-cols-[1fr_1fr_0.6fr_auto] gap-2">
                    <input className={inputCls} placeholder="Label" value={c.label} onChange={(e) => updField(i, { choices: cf.choices.map((x, xi) => (xi === ci ? { ...x, label: e.target.value } : x)) })} />
                    <input className={inputCls} placeholder="Value (defaults to label)" value={c.value ?? ""} onChange={(e) => updField(i, { choices: cf.choices.map((x, xi) => (xi === ci ? { ...x, value: e.target.value } : x)) })} />
                    <input type="number" step="0.01" className={inputCls} value={c.priceAdjustment} onChange={(e) => updField(i, { choices: cf.choices.map((x, xi) => (xi === ci ? { ...x, priceAdjustment: e.target.value } : x)) })} />
                    <div className="flex gap-1">
                      <button className={btnGhost} onClick={() => updField(i, { choices: moveItem(cf.choices, ci, ci - 1) })}><ArrowUp size={12} /></button>
                      <button className={btnGhost} onClick={() => updField(i, { choices: moveItem(cf.choices, ci, ci + 1) })}><ArrowDown size={12} /></button>
                      <button className={btnDanger} onClick={() => updField(i, { choices: cf.choices.filter((_, xi) => xi !== ci) })}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                <button className={btnGhost} onClick={() => updField(i, { choices: [...cf.choices, { label: "", value: "", priceAdjustment: 0 }] })}><Plus size={12} /> Add choice</button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card title="Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Materials"><textarea className={inputCls} rows={2} value={f.materials} onChange={(e) => set("materials", e.target.value)} /></Field>
          <Field label="Dimensions"><input className={inputCls} value={f.dimensions} onChange={(e) => set("dimensions", e.target.value)} /></Field>
        </div>
        <Field label="Care instructions (one per line)">
          <textarea className={inputCls} rows={3} value={f.careInstructions.join("\n")} onChange={(e) => set("careInstructions", e.target.value.split("\n"))} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between"><span className="text-xs text-[#B9B9B4]">Specs</span>
            <button className={btnGhost} onClick={() => set("specs", [...f.specs, { label: "", value: "" }])}><Plus size={12} /> Add</button></div>
          {f.specs.map((s, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_1.4fr_auto] gap-2">
              <input className={inputCls} placeholder="Label" value={s.label} onChange={(e) => set("specs", f.specs.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))} />
              <input className={inputCls} placeholder="Value" value={s.value} onChange={(e) => set("specs", f.specs.map((x, xi) => (xi === i ? { ...x, value: e.target.value } : x)))} />
              <div className="flex gap-1">
                <button className={btnGhost} onClick={() => set("specs", moveItem(f.specs, i, i - 1))}><ArrowUp size={12} /></button>
                <button className={btnGhost} onClick={() => set("specs", moveItem(f.specs, i, i + 1))}><ArrowDown size={12} /></button>
                <button className={btnDanger} onClick={() => set("specs", f.specs.filter((_, xi) => xi !== i))}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><span className="text-xs text-[#B9B9B4]">FAQ</span>
            <button className={btnGhost} onClick={() => set("faq", [...f.faq, { question: "", answer: "" }])}><Plus size={12} /> Add</button></div>
          {f.faq.map((q, i) => (
            <div key={i} className="mb-2 grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
              <input className={inputCls} placeholder="Question" value={q.question} onChange={(e) => set("faq", f.faq.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)))} />
              <input className={inputCls} placeholder="Answer" value={q.answer} onChange={(e) => set("faq", f.faq.map((x, xi) => (xi === i ? { ...x, answer: e.target.value } : x)))} />
              <div className="flex gap-1">
                <button className={btnGhost} onClick={() => set("faq", moveItem(f.faq, i, i - 1))}><ArrowUp size={12} /></button>
                <button className={btnGhost} onClick={() => set("faq", moveItem(f.faq, i, i + 1))}><ArrowDown size={12} /></button>
                <button className={btnDanger} onClick={() => set("faq", f.faq.filter((_, xi) => xi !== i))}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="SEO">
        <Field label="SEO title"><input className={inputCls} value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
        <Field label="SEO description"><textarea className={inputCls} rows={2} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
      </Card>

      <Card title="Unit economics (internal only — never shown to customers)">
        <div className="grid gap-4 md:grid-cols-4">
          {(
            [
              ["filamentGrams", "Filament (g)"],
              ["filamentCostPerGram", "Filament ₹/g"],
              ["printHours", "Print hours"],
              ["electricityPerHour", "Electricity ₹/hr"],
              ["hardwareCost", "Hardware ₹"],
              ["ledElectronicsCost", "LED / electronics ₹"],
              ["packagingCost", "Packaging ₹"],
              ["otherMaterialCost", "Other material ₹"],
            ] as [keyof Costs, string][]
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <input type="number" min={0} step="0.01" className={inputCls} value={f.businessCosts[k]} onChange={(e) => set("businessCosts", { ...f.businessCosts, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-[#242426] text-left text-[10px] uppercase text-[#B9B9B4]">
              <tr><th className="p-2">Scenario</th><th className="p-2">Unit cost</th><th className="p-2">Selling price</th><th className="p-2">Gross profit</th><th className="p-2">Margin</th></tr>
            </thead>
            <tbody className="text-[#F3F0E9]">
              {[{ label: "Base product", ...econ.base }, ...econ.variants].map((r) => (
                <tr key={r.label} className="border-t border-white/5">
                  <td className="p-2">{r.label}</td>
                  <td className="p-2">{inr(econ.cost)}</td>
                  <td className="p-2">{inr(r.sell)}</td>
                  <td className={`p-2 ${r.profit < 0 ? "text-red-300" : ""}`}>{inr(r.profit)}</td>
                  <td className={`p-2 ${r.margin < 20 ? "text-amber-300" : "text-[#C8FF35]"}`}>{r.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0B0B0C]/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          <Link href="/admin/products" className={btnGhost}>Cancel</Link>
          <button className={btnPrimary} disabled={saving || !f.name || f.price === ""} onClick={save}>
            <Save size={14} /> {saving ? "Saving…" : f.id ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>

      <MediaPickerModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        currentMedia={pickerCurrent}
        onSelectMedia={(m) => {
          if (picker === "gallery" && m.url) set("images", [...f.images, m.url]);
          if (picker === "video") set("videoUrl", m.url);
          if (picker === "og") set("ogImage", m.url);
          setPicker(null);
        }}
      />
    </div>
  );
}
