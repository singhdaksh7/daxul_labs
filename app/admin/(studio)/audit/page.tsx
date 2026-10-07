"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, inputCls, NoticeBar, Notice, PageHeader, PrimaryButton, SecondaryButton, readError } from "@/components/admin/content/ui";

type Entry = {
  id: string; source: "audit" | "cms"; admin: string; action: string; entityType: string;
  entityId: string | null; timestamp: string; details: unknown;
};

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({ admin: "", entityType: "", action: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async (p: number, f: typeof filters) => {
    setLoading(true);
    setNotice(null);
    const qs = new URLSearchParams({ page: String(p), pageSize: "25" });
    for (const [k, v] of Object.entries(f)) if (v) qs.set(k, v);
    const res = await fetch(`/api/admin/audit?${qs}`);
    setLoading(false);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    const j = await res.json();
    setEntries(j.entries);
    setTotalPages(j.totalPages);
    setTotal(j.total);
    setEntityTypes(j.entityTypes);
  }, []);

  useEffect(() => {
    load(1, filters);
    // initial load only; filters apply via the Apply button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const apply = () => {
    setPage(1);
    load(1, filters);
  };
  const go = (p: number) => {
    setPage(p);
    load(p, filters);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Audit logs" subtitle="Read-only. Central admin actions and CMS edits, newest first. Sensitive keys are masked." />
      <Card>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input className={inputCls} placeholder="Admin email" value={filters.admin} onChange={(e) => setFilters({ ...filters, admin: e.target.value })} />
          <select className={inputCls} value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}>
            <option value="">All entities</option>
            {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className={inputCls} placeholder="Action contains..." value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
          <input className={inputCls} type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input className={inputCls} type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <PrimaryButton onClick={apply} disabled={loading}>Apply filters</PrimaryButton>
          <NoticeBar notice={notice} />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase text-[#B9B9B4]">
                <th className="py-2 pr-4">When</th><th className="pr-4">Admin</th><th className="pr-4">Action</th><th className="pr-4">Entity</th><th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-[#242426] align-top text-[#F3F0E9]">
                  <td className="py-2 pr-4 whitespace-nowrap text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="pr-4 text-xs">{e.admin}</td>
                  <td className="pr-4 font-mono text-xs text-[#C8FF35]">{e.action}</td>
                  <td className="pr-4 text-xs">{e.entityType}{e.entityId ? <span className="text-gray-500"> / {e.entityId}</span> : null}</td>
                  <td className="text-xs">
                    {e.details ? (
                      <details>
                        <summary className="cursor-pointer text-[#B9B9B4]">metadata</summary>
                        <pre className="mt-1 max-w-md overflow-auto rounded bg-[#0B0B0C] p-2 text-[11px]">{JSON.stringify(e.details, null, 2)}</pre>
                      </details>
                    ) : <span className="text-gray-600">none</span>}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && !loading && <tr><td colSpan={5} className="py-6 text-center text-xs text-gray-500">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-[#B9B9B4]">
          <span>{total.toLocaleString()} entries</span>
          <div className="flex items-center gap-2">
            <SecondaryButton disabled={page <= 1 || loading} onClick={() => go(page - 1)}>Prev</SecondaryButton>
            <span>Page {page} / {totalPages}</span>
            <SecondaryButton disabled={page >= totalPages || loading} onClick={() => go(page + 1)}>Next</SecondaryButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
