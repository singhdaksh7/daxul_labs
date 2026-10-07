"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Archive, ArchiveRestore, Star, Trash2, Search } from "lucide-react";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/admin/catalog/ui";

type Row = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  isActive: boolean;
  isArchived: boolean;
  isFeatured: boolean;
  images: string[];
  variantCount: number;
  collection: { id: string; name: string } | null;
};

export default function AdminProductsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?status=${status}&q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load");
      setRows(d.products);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (id: string, action: string) => {
    setMsg(null);
    const res = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const d = await res.json();
    if (!res.ok) setMsg(d.error || "Action failed");
    load();
  };

  const del = async (r: Row) => {
    if (!confirm(`Permanently delete "${r.name}"? This cannot be undone.`)) return;
    setMsg(null);
    const res = await fetch(`/api/admin/products?id=${r.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) setMsg(d.error || "Delete failed");
    load();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#F3F0E9]">Products</h1>
        <Link href="/admin/products/new" className={btnPrimary}><Plus size={14} /> New product</Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-3 text-[#B9B9B4]" />
          <input className={`${inputCls} pl-9`} placeholder="Search name, SKU, slug" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="low">Low stock</option>
          <option value="all">All</option>
        </select>
      </div>
      {msg && <div className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-300">{msg}</div>}
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#151515]">
        <table className="w-full text-sm">
          <thead className="bg-[#242426] text-left text-[10px] uppercase tracking-wider text-[#B9B9B4]">
            <tr><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Collection</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="text-[#F3F0E9]">
            {loading && <tr><td colSpan={7} className="p-6 text-center text-[#B9B9B4]">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-[#B9B9B4]">No products found.</td></tr>}
            {rows.map((r) => {
              const low = r.trackInventory && r.stock <= r.lowStockThreshold;
              return (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3">
                    <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3 hover:text-[#C8FF35]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {r.images[0] ? <img src={r.images[0]} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-[#242426]" />}
                      <span>{r.name}{r.variantCount > 0 && <span className="ml-2 text-[10px] text-[#B9B9B4]">{r.variantCount} variants</span>}</span>
                    </Link>
                  </td>
                  <td className="p-3 text-[#B9B9B4]">{r.sku || "—"}</td>
                  <td className="p-3 text-[#B9B9B4]">{r.collection?.name || "—"}</td>
                  <td className="p-3">₹{r.price.toLocaleString("en-IN")}</td>
                  <td className={`p-3 ${r.trackInventory ? (r.stock <= 0 ? "text-red-300" : low ? "text-amber-300" : "") : "text-[#B9B9B4]"}`}>{r.trackInventory ? r.stock : "untracked"}</td>
                  <td className="p-3 text-xs">
                    {r.isArchived ? "Archived" : r.isActive ? "Active" : "Hidden"}{r.isFeatured && " · Featured"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button title={r.isFeatured ? "Unfeature" : "Feature"} className={btnGhost} onClick={() => act(r.id, r.isFeatured ? "unfeature" : "feature")}><Star size={12} className={r.isFeatured ? "fill-[#C8FF35] text-[#C8FF35]" : ""} /></button>
                      <button title="Duplicate" className={btnGhost} onClick={() => act(r.id, "duplicate")}><Copy size={12} /></button>
                      <button title={r.isArchived ? "Unarchive" : "Archive"} className={btnGhost} onClick={() => act(r.id, r.isArchived ? "unarchive" : "archive")}>{r.isArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}</button>
                      <button title="Delete" className={btnDanger} onClick={() => del(r)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
