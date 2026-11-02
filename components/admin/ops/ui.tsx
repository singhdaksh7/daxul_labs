"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

export function useApi<T = any>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(url));
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function PageHeader({
  title,
  subtitle,
  onRefresh,
  children,
}: {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9] sm:text-2xl">{title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#B9B9B4]">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3.5 py-2 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

export function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
      {(title || right) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "lime" | "warn" | "bad" }) {
  const color = tone === "lime" ? "text-[#C8FF35]" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-[#F3F0E9]";
  return (
    <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">{label}</span>
      <p className={`mt-2 text-2xl font-bold leading-tight ${color}`}>{value}</p>
      {hint && <span className="mt-1 block text-[11px] text-[#B9B9B4]">{hint}</span>}
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "lime" | "warn" | "bad" | "info" }) {
  const cls =
    tone === "lime"
      ? "border-[#C8FF35]/40 text-[#C8FF35]"
      : tone === "warn"
        ? "border-yellow-500/40 text-yellow-400"
        : tone === "bad"
          ? "border-red-500/40 text-red-400"
          : tone === "info"
            ? "border-sky-500/40 text-sky-400"
            : "border-[#242426] text-[#B9B9B4]";
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${cls}`}>{children}</span>;
}

export function Table({ head, children, empty, colSpan }: { head: string[]; children: React.ReactNode; empty?: string; colSpan?: number }) {
  const hasRows = React.Children.count(children) > 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs text-[#B9B9B4]">
        <thead className="border-b border-[#242426] text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="pb-3 pr-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#242426]">
          {children}
          {!hasRows && (
            <tr>
              <td colSpan={colSpan || head.length} className="py-10 text-center text-gray-500">
                {empty || "Nothing here yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs leading-relaxed text-red-300">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg border border-red-500/40 px-3 py-1.5 hover:bg-red-500/10">
          Retry
        </button>
      )}
    </div>
  );
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return <div className="py-10 text-center text-xs text-[#B9B9B4]">{label}</div>;
}

export const inputCls =
  "w-full rounded-lg border border-[#242426] bg-[#0f0f10] px-3 py-2.5 text-xs text-[#F3F0E9] placeholder:text-gray-600 focus:border-[#C8FF35] focus:outline-none";
export const btnPrimary =
  "rounded-lg bg-[#C8FF35] px-4 py-2.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50";
export const btnGhost =
  "rounded-lg border border-[#242426] bg-[#151515] px-3.5 py-2 text-xs text-[#B9B9B4] hover:text-[#F3F0E9] disabled:opacity-50";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">{label}</span>
      {children}
    </label>
  );
}

export function fmtDate(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "-" : dt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function inr(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "-";
}
