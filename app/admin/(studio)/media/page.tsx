"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, inputCls, NoticeBar, Notice, PageHeader, readError, SecondaryButton } from "@/components/admin/content/ui";

type Asset = { id: string; type: "image" | "video"; filename: string; mimeType: string; size: number; altText: string | null; createdAt: string; url: string };
type Usage = { kind: string; id: string; label: string; field: string };

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [usages, setUsages] = useState<Usage[] | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [alt, setAlt] = useState("");

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (type) qs.set("type", type);
    const res = await fetch(`/api/admin/cms/media?${qs}`);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    setAssets((await res.json()).assets);
  }, [q, type]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setNotice(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("altText", file.name);
    const res = await fetch("/api/admin/cms/media", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    setNotice({ kind: "ok", text: "Uploaded." });
    load();
  };

  const select = (a: Asset) => {
    setSelected(a);
    setAlt(a.altText ?? "");
    setUsages(null);
  };

  const saveAlt = async () => {
    if (!selected) return;
    const res = await fetch("/api/admin/cms/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id, altText: alt }) });
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    setNotice({ kind: "ok", text: "Alt text saved." });
    load();
  };

  const copy = async (a: Asset) => {
    try {
      await navigator.clipboard.writeText(new URL(a.url, window.location.origin).toString());
      setNotice({ kind: "ok", text: "URL copied." });
    } catch {
      setNotice({ kind: "error", text: "Could not copy. Select the URL manually." });
    }
  };

  const del = async (a: Asset) => {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/cms/media?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
    if (res.status === 409) {
      const j = await res.json();
      setUsages(j.usages);
      return setNotice({ kind: "error", text: j.error });
    }
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    setSelected(null);
    setUsages(null);
    setNotice({ kind: "ok", text: "Deleted." });
    load();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Media library" subtitle="Images and videos served through the authenticated app route. Assets in use cannot be deleted." />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer inline-flex items-center px-5 py-2 rounded-xl bg-[#C8FF35] text-[#0B0B0C] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white">
            {uploading ? "Uploading..." : "Upload image / video"}
            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" onChange={upload} disabled={uploading} />
          </label>
          <input className={`${inputCls} max-w-xs`} placeholder="Search filename or alt text" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`${inputCls} max-w-[140px]`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option><option value="image">Images</option><option value="video">Videos</option>
          </select>
          <span className="text-[10px] text-gray-500 font-mono">Max 50MB. JPEG, PNG, WEBP, AVIF, GIF, MP4, WEBM.</span>
        </div>
        <div className="mt-3"><NoticeBar notice={notice} /></div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <Card>
          {assets.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No assets.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {assets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => select(a)}
                  className={`relative aspect-square rounded-xl overflow-hidden border bg-[#0B0B0C] text-left ${selected?.id === a.id ? "border-[#C8FF35]" : "border-[#242426] hover:border-white"}`}
                >
                  {a.type === "video" ? (
                    <video src={a.url} muted preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.altText ?? a.filename} className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 px-2 py-1 text-[9px] font-mono text-gray-300 truncate">{a.filename}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title={selected ? "Asset" : "Select an asset"}>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="text-[11px] font-mono text-[#B9B9B4] break-all">
                {selected.mimeType} / {(selected.size / 1024).toFixed(0)} KB<br />
                {new Date(selected.createdAt).toLocaleString()}
              </div>
              <label className="block space-y-1">
                <span className="font-mono text-[10px] uppercase text-[#B9B9B4]">Alt text</span>
                <input className={inputCls} maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={saveAlt} disabled={alt === (selected.altText ?? "")}>Save alt</SecondaryButton>
                <SecondaryButton onClick={() => copy(selected)}>Copy URL</SecondaryButton>
                <SecondaryButton onClick={() => del(selected)} className="!text-red-300">Delete</SecondaryButton>
              </div>
              <input readOnly className={`${inputCls} font-mono text-[11px]`} value={selected.url} onFocus={(e) => e.currentTarget.select()} />
              {usages && (
                <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200 space-y-1">
                  <div className="font-bold">In use by:</div>
                  {usages.map((u, i) => <div key={i}>{u.kind.replace("_", " ")}: {u.label} ({u.field})</div>)}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
