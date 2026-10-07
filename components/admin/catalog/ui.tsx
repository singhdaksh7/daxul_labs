"use client";

import React from "react";

export const inputCls =
  "w-full rounded-md border border-white/10 bg-[#0B0B0C] px-3 py-2 text-sm text-[#F3F0E9] placeholder:text-[#B9B9B4]/50 focus:border-[#C8FF35] focus:outline-none";
export const btnPrimary =
  "inline-flex items-center gap-2 rounded-md bg-[#C8FF35] px-4 py-2 text-sm font-semibold text-[#0B0B0C] hover:opacity-90 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#242426] px-3 py-1.5 text-xs text-[#F3F0E9] hover:border-[#C8FF35]/60 disabled:opacity-40";
export const btnDanger =
  "inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-40";

export function Card({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#151515] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#C8FF35]">{title}</h2>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[#B9B9B4]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#B9B9B4]/60">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#F3F0E9]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#C8FF35]" />
      {label}
    </label>
  );
}

export function slugifyClient(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}
