"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUp, ArrowDown, Archive, ArchiveRestore } from "lucide-react";
import { btnGhost, btnPrimary } from "@/components/admin/catalog/ui";

type C = { id: string; name: string; slug: string; image: string; badge: string | null; featured: boolean; isActive: boolean; _count: { products: number } };

export default function AdminCollectionsPage() {
  const [rows, setRows] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/collections");
    const d = await res.json();
    if (!res.ok) setMsg(d.error || "Failed to load");
    else setRows(d.collections);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: string) => {
    setMsg(null);
    const res = await fetch("/api/admin/collections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!res.ok) setMsg((await res.json()).error || "Action failed");
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#F3F0E9]">Collections</h1>
        <Link href="/admin/collections/new" className={btnPrimary}><Plus size={14} /> New collection</Link>
      </div>
      {msg && <div className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-300">{msg}</div>}
      <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-[#151515]">
        {loading && <p className="p-6 text-center text-sm text-[#B9B9B4]">Loading…</p>}
        {!loading && rows.length === 0 && <p className="p-6 text-center text-sm text-[#B9B9B4]">No collections yet.</p>}
        {rows.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.image ? <img src={c.image} alt="" className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-[#242426]" />}
            <Link href={`/admin/collections/${c.id}`} className="flex-1 text-[#F3F0E9] hover:text-[#C8FF35]">
              <div>{c.name}{c.featured && <span className="ml-2 text-[10px] text-[#C8FF35]">FEATURED</span>}</div>
              <div className="text-xs text-[#B9B9B4]">/{c.slug} · {c._count.products} products · {c.isActive ? "Active" : "Archived"}</div>
            </Link>
            <button className={btnGhost} disabled={i === 0} onClick={() => act(c.id, "move_up")}><ArrowUp size={12} /></button>
            <button className={btnGhost} disabled={i === rows.length - 1} onClick={() => act(c.id, "move_down")}><ArrowDown size={12} /></button>
            <button className={btnGhost} onClick={() => act(c.id, c.isActive ? "archive" : "unarchive")}>{c.isActive ? <Archive size={12} /> : <ArchiveRestore size={12} />}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
