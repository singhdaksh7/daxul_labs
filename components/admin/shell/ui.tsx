import React from "react";
import Link from "next/link";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orderPipeline";

export const inr = (n: number) =>
  "₹" + (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const fmtDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#242426] px-4 py-6 sm:px-8">
      <div>
        <h1 className="text-xl font-black uppercase tracking-wider text-[#F3F0E9] sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-[#242426] bg-[#151515] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[#242426] px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-300">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-[#C8FF35]/40 bg-[#C8FF35]/5" : "border-[#242426] bg-[#151515]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-black tabular-nums ${accent ? "text-[#C8FF35]" : "text-[#F3F0E9]"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-[#242426] px-4 py-6 text-center text-sm text-gray-500">{children}</p>;
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-300",
  design_pending: "bg-amber-500/15 text-amber-300",
  design_approved: "bg-teal-500/15 text-teal-300",
  printing: "bg-purple-500/15 text-purple-300",
  finishing: "bg-fuchsia-500/15 text-fuchsia-300",
  qc: "bg-cyan-500/15 text-cyan-300",
  packed: "bg-indigo-500/15 text-indigo-300",
  shipped: "bg-sky-500/15 text-sky-300",
  delivered: "bg-[#C8FF35]/15 text-[#C8FF35]",
  cancelled: "bg-red-500/15 text-red-300",
  paid: "bg-[#C8FF35]/15 text-[#C8FF35]",
  pending: "bg-amber-500/15 text-amber-300",
  failed: "bg-red-500/15 text-red-300",
  cod: "bg-orange-500/15 text-orange-300",
  prepaid: "bg-gray-500/20 text-gray-300",
};

export function Badge({ kind, children }: { kind: string; children?: React.ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[kind] ?? "bg-gray-500/20 text-gray-300"}`}>
      {children ?? kind}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge kind={status}>{STATUS_LABELS[status as OrderStatus] ?? status}</Badge>;
}

export function Pagination({ page, total, pageSize, hrefFor }: { page: number; total: number; pageSize: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="pt-3 text-xs text-gray-500">{total} result{total === 1 ? "" : "s"}</p>;
  const btn = "rounded-md border border-[#242426] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-[#C8FF35] hover:text-[#C8FF35]";
  return (
    <div className="flex items-center justify-between pt-4 text-xs text-gray-400">
      <span>{total} results · page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className={btn} href={hrefFor(page - 1)}>Previous</Link>}
        {page < pages && <Link className={btn} href={hrefFor(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export const tableCls = "w-full text-left text-sm";
export const thCls = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500";
export const tdCls = "px-3 py-2.5 align-middle text-gray-200";
export const inputCls =
  "w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-sm text-[#F3F0E9] placeholder:text-gray-600 focus:border-[#C8FF35] focus:outline-none";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8FF35] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0B0B0C] transition-colors hover:bg-white disabled:opacity-40";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#242426] bg-[#242426]/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-200 transition-colors hover:border-[#C8FF35] hover:text-[#C8FF35] disabled:opacity-40";

// ---------- simple SVG / CSS charts (no dependencies)
export function BarChart({ data, format = (n: number) => String(n), height = 160 }: { data: { label: string; value: number }[]; format?: (n: number) => string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const w = 600;
  const bw = w / Math.max(1, n);
  const every = Math.ceil(n / 8);
  return (
    <svg viewBox={`0 0 ${w} ${height + 22}`} className="h-auto w-full" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const h = (d.value / max) * height;
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${format(d.value)}`}</title>
            <rect x={i * bw + bw * 0.15} y={height - h} width={bw * 0.7} height={Math.max(h, d.value > 0 ? 2 : 0)} rx={2} fill="#C8FF35" opacity={d.value > 0 ? 0.9 : 0.15} />
            {i % every === 0 && (
              <text x={i * bw + bw / 2} y={height + 14} textAnchor="middle" fontSize="9" fill="#9a9a95">{d.label.slice(-5)}</text>
            )}
          </g>
        );
      })}
      <line x1="0" x2={w} y1={height} y2={height} stroke="#242426" />
    </svg>
  );
}

export function HBars({ data, format = (n: number) => String(n) }: { data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="truncate text-gray-300">{d.label}</span>
            <span className="tabular-nums text-gray-400">{format(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-[#242426]">
            <div className="h-2 rounded-full bg-[#C8FF35]" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
