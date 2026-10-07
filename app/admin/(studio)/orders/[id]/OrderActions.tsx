"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { canCancel, nextStatus, prevStatus, STATUS_LABELS, type OrderStatus } from "@/lib/orderPipeline";
import { btnGhost, btnPrimary, inputCls } from "@/components/admin/shell/ui";

type Props = {
  orderId: string;
  status: OrderStatus;
  paymentStatus: "paid" | "pending" | "failed";
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
};

export default function OrderActions(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [courier, setCourier] = useState(p.courierName);
  const [tracking, setTracking] = useState(p.trackingNumber);
  const [url, setUrl] = useState(p.trackingUrl);
  const [noteField, setNoteField] = useState<"internalNotes" | "qcNotes">("internalNotes");
  const [noteText, setNoteText] = useState("");
  const [moveNote, setMoveNote] = useState("");

  const next = nextStatus(p.status);
  const prev = prevStatus(p.status);

  async function call(payload: Record<string, unknown>, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: p.orderId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const issue = Array.isArray(data.issues) && data.issues[0]?.message;
        setMsg({ ok: false, text: issue || data.error || "Request failed" });
        return false;
      }
      setMsg({ ok: true, text: okText });
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  const label = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500";

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${msg.ok ? "bg-[#C8FF35]/10 text-[#C8FF35]" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>
      )}

      {p.status !== "cancelled" && (
        <div className="space-y-2">
          <label className={label}>Status change note (optional)</label>
          <input className={inputCls} value={moveNote} onChange={(e) => setMoveNote(e.target.value)} maxLength={1000} placeholder="e.g. Proof approved by customer" />
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} disabled={busy || !prev} onClick={async () => { if (await call({ action: "move", direction: "prev", note: moveNote || undefined }, "Moved back")) setMoveNote(""); }}>
              {prev ? `Back to ${STATUS_LABELS[prev]}` : "Back"}
            </button>
            <button className={btnPrimary} disabled={busy || !next} onClick={async () => { if (await call({ action: "move", direction: "next", note: moveNote || undefined }, "Status advanced")) setMoveNote(""); }}>
              {next ? `Advance to ${STATUS_LABELS[next]}` : "Final stage"}
            </button>
            {canCancel(p.status) && (
              <button
                className="inline-flex items-center rounded-lg border border-red-500/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                disabled={busy}
                onClick={() => { if (window.confirm("Cancel this order?")) call({ action: "cancel", note: moveNote || undefined }, "Order cancelled"); }}
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className={label}>Shipping (required before SHIPPED)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier name" maxLength={100} />
          <input className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" maxLength={100} />
        </div>
        <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Tracking URL (https://...)" maxLength={500} />
        <button className={btnGhost} disabled={busy} onClick={() => call({ action: "shipping", courierName: courier, trackingNumber: tracking, trackingUrl: url }, "Shipping details saved")}>
          Save shipping
        </button>
      </div>

      <div className="space-y-2">
        <p className={label}>Add note</p>
        <select className={inputCls} value={noteField} onChange={(e) => setNoteField(e.target.value as "internalNotes" | "qcNotes")}>
          <option value="internalNotes">Internal note</option>
          <option value="qcNotes">Production / QC note</option>
        </select>
        <textarea className={inputCls} rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={2000} placeholder="Note (appended with timestamp and your email)" />
        <button
          className={btnGhost}
          disabled={busy || !noteText.trim()}
          onClick={async () => { if (await call({ action: "note", field: noteField, text: noteText }, "Note added")) setNoteText(""); }}
        >
          Add note
        </button>
      </div>

      <div className="space-y-2">
        <p className={label}>Payment status</p>
        <div className="flex gap-2">
          <select className={inputCls} defaultValue={p.paymentStatus} onChange={(e) => { if (window.confirm(`Set payment status to ${e.target.value}?`)) call({ action: "payment", paymentStatus: e.target.value }, "Payment status updated"); else e.target.value = p.paymentStatus; }}>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="failed">failed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
