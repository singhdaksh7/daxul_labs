"use client";

import React from "react";

export const inputCls =
  "w-full bg-[#0B0B0C] border border-[#242426] rounded-xl px-3 py-2 text-sm text-[#F3F0E9] focus:outline-none focus:border-[#C8FF35] placeholder:text-gray-600";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider text-[#F3F0E9]">{title}</h1>
        {subtitle && <p className="text-xs text-[#B9B9B4] mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-[#151515] border border-[#242426] rounded-2xl p-5 ${className}`}>
      {title && <h2 className="font-mono text-[11px] uppercase tracking-widest text-[#C8FF35] mb-4">{title}</h2>}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[#B9B9B4]">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-gray-500">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#F3F0E9] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#C8FF35] w-4 h-4" />
      {label}
    </label>
  );
}

export function PrimaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`px-5 py-2 rounded-xl bg-[#C8FF35] text-[#0B0B0C] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-xl bg-[#242426] text-[#F3F0E9] font-mono text-xs uppercase tracking-wider hover:bg-[#333] disabled:opacity-50 transition-colors ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export type Notice = { kind: "ok" | "error"; text: string } | null;

export function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className={`text-xs font-mono rounded-xl px-3 py-2 ${notice.kind === "ok" ? "bg-[#C8FF35]/10 text-[#C8FF35]" : "bg-red-500/10 text-red-300"}`}
    >
      {notice.text}
    </div>
  );
}

/** Formats API validation failures ({ error, issues }) into one line. */
export async function readError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    if (Array.isArray(j.issues) && j.issues.length) {
      return j.issues.map((i: { path: string; message: string }) => `${i.path || "body"}: ${i.message}`).join("; ");
    }
    return j.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}
