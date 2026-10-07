"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Image as ImageIcon } from "lucide-react";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { Card, Field, Toggle, inputCls, btnPrimary, btnGhost, slugifyClient } from "./ui";

type Form = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  heroMedia: string;
  badge: string;
  featured: boolean;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
};

const empty: Form = { name: "", slug: "", description: "", image: "", heroMedia: "", badge: "", featured: false, isActive: true, seoTitle: "", seoDescription: "", ogImage: "" };
const s = (v: any) => (v === null || v === undefined ? "" : v);

export default function CollectionEditor({ collectionId }: { collectionId?: string }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(empty);
  const [loading, setLoading] = useState(!!collectionId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(!!collectionId);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; sku: string | null; collectionId: string | null; collection: { name: string } | null }[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [picker, setPicker] = useState<null | "image" | "hero" | "og">(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch("/api/admin/products?status=all")
      .then((r) => r.json())
      .then((d) => setAllProducts(d.products || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!collectionId) return;
    fetch(`/api/admin/collections?id=${collectionId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        const c = d.collection;
        setF({ id: c.id, name: c.name, slug: c.slug, description: s(c.description), image: s(c.image), heroMedia: s(c.heroMedia), badge: s(c.badge), featured: c.featured, isActive: c.isActive, seoTitle: s(c.seoTitle), seoDescription: s(c.seoDescription), ogImage: s(c.ogImage) });
        setAssigned(new Set((c.products || []).map((p: any) => p.id)));
      })
      .catch((e) => setMsg({ kind: "err", text: e.message }))
      .finally(() => setLoading(false));
  }, [collectionId]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/collections", {
        method: f.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, productIds: Array.from(assigned) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      if (!f.id) router.replace(`/admin/collections/${d.collection.id}`);
      else setMsg({ kind: "ok", text: "Saved." });
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-[#B9B9B4]">Loading collection…</div>;

  const visible = allProducts.filter((p) => !filter || `${p.name} ${p.sku ?? ""}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 pb-28 md:p-8">
      <div>
        <Link href="/admin/collections" className="text-xs text-[#B9B9B4] hover:text-[#C8FF35]">← Collections</Link>
        <h1 className="text-2xl font-semibold text-[#F3F0E9]">{f.id ? f.name || "Edit collection" : "New collection"}</h1>
      </div>
      {msg && <div className={`rounded-md border px-3 py-2 text-sm ${msg.kind === "ok" ? "border-[#C8FF35]/40 text-[#C8FF35]" : "border-red-500/40 text-red-300"}`}>{msg.text}</div>}

      <Card title="Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name *">
            <input className={inputCls} value={f.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugifyClient(e.target.value)); }} />
          </Field>
          <Field label="Slug">
            <input className={inputCls} value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugifyClient(e.target.value)); }} />
          </Field>
          <Field label="Badge"><input className={inputCls} value={f.badge} onChange={(e) => set("badge", e.target.value)} /></Field>
        </div>
        <Field label="Description"><textarea className={inputCls} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <div className="flex gap-6">
          <Toggle label="Featured" checked={f.featured} onChange={(v) => set("featured", v)} />
          <Toggle label="Active (archived when off)" checked={f.isActive} onChange={(v) => set("isActive", v)} />
        </div>
      </Card>

      <Card title="Media & SEO">
        {([["image", "Image", f.image], ["heroMedia", "Hero media (image or video)", f.heroMedia], ["ogImage", "OG image", f.ogImage]] as const).map(([key, label, val]) => (
          <Field key={key} label={label}>
            <div className="flex gap-2">
              <input className={inputCls} value={val} onChange={(e) => set(key, e.target.value)} />
              <button className={btnGhost} onClick={() => setPicker(key === "image" ? "image" : key === "heroMedia" ? "hero" : "og")}><ImageIcon size={14} /> Pick</button>
            </div>
          </Field>
        ))}
        <Field label="SEO title"><input className={inputCls} value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
        <Field label="SEO description"><textarea className={inputCls} rows={2} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
      </Card>

      <Card title={`Products (${assigned.size} assigned)`}>
        <input className={inputCls} placeholder="Filter products" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-[#0B0B0C] p-2">
          {visible.map((p) => {
            const elsewhere = p.collectionId && p.collectionId !== f.id && !assigned.has(p.id);
            return (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[#F3F0E9] hover:bg-white/5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#C8FF35]"
                  checked={assigned.has(p.id)}
                  onChange={(e) => {
                    const n = new Set(assigned);
                    if (e.target.checked) n.add(p.id);
                    else n.delete(p.id);
                    setAssigned(n);
                  }}
                />
                <span className="flex-1">{p.name}</span>
                {p.sku && <span className="text-xs text-[#B9B9B4]">{p.sku}</span>}
                {elsewhere && <span className="text-[10px] text-amber-300">in {p.collection?.name} (will move)</span>}
              </label>
            );
          })}
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0B0B0C]/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl justify-end gap-3">
          <Link href="/admin/collections" className={btnGhost}>Cancel</Link>
          <button className={btnPrimary} disabled={saving || !f.name} onClick={save}><Save size={14} /> {saving ? "Saving…" : "Save"}</button>
        </div>
      </div>

      <MediaPickerModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        currentMedia={undefined}
        onSelectMedia={(m) => {
          if (picker === "image") set("image", m.url);
          if (picker === "hero") set("heroMedia", m.url);
          if (picker === "og") set("ogImage", m.url);
          setPicker(null);
        }}
      />
    </div>
  );
}
