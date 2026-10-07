"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { Card, Field, inputCls, NoticeBar, Notice, PageHeader, PrimaryButton, SecondaryButton, readError, Toggle } from "@/components/admin/content/ui";

type Seo = { seoTitle: string; seoDescription: string; defaultOgImage: string; instagramHandle: string; searchIndexingEnabled: boolean };
type Row = { id: string; name: string; slug: string; hasTitle: boolean; hasDescription: boolean; hasOgImage: boolean };

const Dot = ({ ok }: { ok: boolean }) => (
  <span className={ok ? "text-[#C8FF35]" : "text-red-400"}>{ok ? "Yes" : "Missing"}</span>
);

function Overview({ title, rows, base }: { title: string; rows: Row[]; base: string }) {
  const incomplete = rows.filter((r) => !(r.hasTitle && r.hasDescription && r.hasOgImage)).length;
  return (
    <Card title={`${title} (${incomplete} incomplete of ${rows.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase text-[#B9B9B4]">
              <th className="py-2 pr-4">Name</th><th className="pr-4">SEO title</th><th className="pr-4">Description</th><th className="pr-4">OG image</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#242426] text-[#F3F0E9]">
                <td className="py-2 pr-4">{r.name}</td>
                <td className="pr-4"><Dot ok={r.hasTitle} /></td>
                <td className="pr-4"><Dot ok={r.hasDescription} /></td>
                <td className="pr-4"><Dot ok={r.hasOgImage} /></td>
                <td className="text-right"><Link className="text-[#C8FF35] underline text-xs" href={`${base}/${r.id}`}>Edit</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-gray-500 text-xs">Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AdminSeoPage() {
  const [seo, setSeo] = useState<Seo | null>(null);
  const [products, setProducts] = useState<Row[]>([]);
  const [collections, setCollections] = useState<Row[]>([]);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
      const j = await res.json();
      setSeo({ ...j.seo, defaultOgImage: j.seo.defaultOgImage ?? "" });
      setProducts(j.products);
      setCollections(j.collections);
    })();
  }, []);

  if (!seo) return <div className="text-sm text-[#B9B9B4]">{notice ? <NoticeBar notice={notice} /> : "Loading SEO..."}</div>;

  const save = async () => {
    setSaving(true);
    setNotice(null);
    const res = await fetch("/api/admin/seo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seo) });
    setSaving(false);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    const j = await res.json();
    setSeo({ ...j.seo, defaultOgImage: j.seo.defaultOgImage ?? "" });
    setNotice({ kind: "ok", text: "SEO settings saved." });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="SEO" subtitle="Global defaults. Individual products and collections can override these in their own editors." />
      <Card title="Global metadata">
        <div className="space-y-4 max-w-2xl">
          <Field label="Site title" hint={`${seo.seoTitle.length}/120. Aim for under 60 characters.`}>
            <input className={inputCls} maxLength={120} value={seo.seoTitle} onChange={(e) => setSeo({ ...seo, seoTitle: e.target.value })} />
          </Field>
          <Field label="Default meta description" hint={`${seo.seoDescription.length}/320. Aim for 120-160 characters.`}>
            <textarea className={`${inputCls} min-h-[90px]`} maxLength={320} value={seo.seoDescription} onChange={(e) => setSeo({ ...seo, seoDescription: e.target.value })} />
          </Field>
          <Field label="Default OG image" hint="Shown when a page is shared and has no image of its own.">
            <div className="flex gap-2 items-center">
              <input className={`${inputCls} font-mono`} value={seo.defaultOgImage} onChange={(e) => setSeo({ ...seo, defaultOgImage: e.target.value })} placeholder="/api/uploads/file/..." />
              <SecondaryButton type="button" onClick={() => setPicker(true)}>Pick</SecondaryButton>
            </div>
            {seo.defaultOgImage && /^(\/|https:)/.test(seo.defaultOgImage) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seo.defaultOgImage} alt="OG preview" className="mt-2 h-28 rounded-lg border border-[#242426] object-cover" />
            )}
          </Field>
          <Field label="Instagram handle">
            <input className={inputCls} value={seo.instagramHandle} onChange={(e) => setSeo({ ...seo, instagramHandle: e.target.value })} />
          </Field>
          <Toggle label="Allow search engines to index the site" checked={seo.searchIndexingEnabled} onChange={(v) => setSeo({ ...seo, searchIndexingEnabled: v })} />
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={save} disabled={saving || !seo.seoTitle.trim()}>{saving ? "Saving..." : "Save SEO"}</PrimaryButton>
            <NoticeBar notice={notice} />
          </div>
        </div>
      </Card>

      <Overview title="Products" rows={products} base="/admin/products" />
      <Overview title="Collections" rows={collections} base="/admin/collections" />

      <MediaPickerModal
        isOpen={picker}
        onClose={() => setPicker(false)}
        onSelectMedia={(m) => setSeo({ ...seo, defaultOgImage: m.url })}
        currentMedia={seo.defaultOgImage ? { mediaType: "image", url: seo.defaultOgImage } as any : undefined}
      />
    </div>
  );
}
