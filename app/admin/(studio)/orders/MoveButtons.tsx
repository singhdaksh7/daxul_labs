"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { nextStatus, prevStatus, STATUS_LABELS, type OrderStatus } from "@/lib/orderPipeline";

/** Compact prev/next stepper used on pipeline cards. Server validates every move. */
export default function MoveButtons({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const next = nextStatus(status);
  const prev = prevStatus(status);

  async function move(direction: "next" | "prev") {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", orderId, direction }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErr(data.error || "Failed");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "cancelled") return null;
  const cls =
    "flex flex-1 items-center justify-center gap-1 rounded-md border border-[#242426] bg-[#0B0B0C] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:border-[#C8FF35] hover:text-[#C8FF35] disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div>
      <div className="flex gap-1.5">
        <button className={cls} disabled={busy || !prev} onClick={() => move("prev")} title={prev ? STATUS_LABELS[prev] : undefined}>
          <ChevronLeft className="h-3 w-3" /> Back
        </button>
        <button className={cls} disabled={busy || !next} onClick={() => move("next")} title={next ? STATUS_LABELS[next] : undefined}>
          Next <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      {err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}
    </div>
  );
}
