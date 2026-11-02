"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LITHOPHANE_STAGES } from "@/lib/lithophane";

export default function LithophaneStage({ itemId, stage }: { itemId: string; stage: string }) {
  const router = useRouter();
  const [value, setValue] = useState(stage || "new_order");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async (next: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/lithophane/order-items/${itemId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Could not update stage");
      setValue(next);
      setMsg("Stage updated");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="lithophane-stage">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500" htmlFor={`stage-${itemId}`}>Workflow stage</label>
      <select
        id={`stage-${itemId}`}
        data-testid="lithophane-stage-select"
        value={value}
        disabled={busy}
        onChange={(e) => void save(e.target.value)}
        className="rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
      >
        {LITHOPHANE_STAGES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
      {msg && <span className="text-[11px] text-[#C8FF35]" role="status">{msg}</span>}
    </div>
  );
}
