"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { canCancel, nextStatus, prevStatus, STATUS_LABELS, type OrderStatus } from "@/lib/orderPipeline";
import { btnGhost, btnPrimary, inputCls, inr } from "@/components/admin/shell/ui";

type Props = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: "paid" | "pending" | "failed";
  paymentMethod: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  cancellationRequested?: boolean;
  cancellationReason?: string | null;
  designStatus?: string | null;
  designProofUrl?: string | null;
  designFeedback?: string | null;
  totalAmount: number;
  refundedAmount?: number;
};

export default function OrderActions(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Status & Note
  const [moveNote, setMoveNote] = useState("");
  const [noteField, setNoteField] = useState<"internalNotes" | "qcNotes">("internalNotes");
  const [noteText, setNoteText] = useState("");

  // Shipping
  const [courier, setCourier] = useState(p.courierName);
  const [tracking, setTracking] = useState(p.trackingNumber);
  const [url, setUrl] = useState(p.trackingUrl);

  // Design Proof
  const [proofUrl, setProofUrl] = useState(p.designProofUrl || "");
  const [proofNotes, setProofNotes] = useState("");

  // Refund
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState("");

  // Cancellation
  const [rejectReason, setRejectReason] = useState("");

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
        <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${msg.ok ? "bg-[#C8FF35]/10 text-[#C8FF35]" : "bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </p>
      )}

      {/* Cancellation Request Alert Banner */}
      {p.cancellationRequested && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2">
          <p className="text-xs font-bold text-red-300 uppercase tracking-wide">
            Customer Requested Cancellation
          </p>
          <p className="text-xs text-gray-300">
            Reason: <span className="text-white font-medium">{p.cancellationReason || "No reason given"}</span>
          </p>
          <div className="space-y-2 pt-1">
            <input
              className={inputCls}
              placeholder="Reason if rejecting request..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-red-700 disabled:opacity-40"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Approve customer cancellation request?")) {
                    call({ action: "resolveCancellation", approved: true }, "Cancellation approved & order cancelled");
                  }
                }}
              >
                Approve & Cancel
              </button>
              <button
                className={btnGhost}
                disabled={busy}
                onClick={() => {
                  call({ action: "resolveCancellation", approved: false, reason: rejectReason }, "Cancellation request rejected");
                }}
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status progression */}
      {p.status !== "cancelled" && (
        <div className="space-y-2">
          <label className={label}>Status change note (optional)</label>
          <input
            className={inputCls}
            value={moveNote}
            onChange={(e) => setMoveNote(e.target.value)}
            maxLength={1000}
            placeholder="e.g. Proof approved by customer"
          />
          <div className="flex flex-wrap gap-2">
            <button
              className={btnGhost}
              disabled={busy || !prev}
              onClick={async () => {
                if (await call({ action: "move", direction: "prev", note: moveNote || undefined }, "Moved back")) {
                  setMoveNote("");
                }
              }}
            >
              {prev ? `Back to ${STATUS_LABELS[prev]}` : "Back"}
            </button>
            <button
              className={btnPrimary}
              disabled={busy || !next}
              onClick={async () => {
                if (await call({ action: "move", direction: "next", note: moveNote || undefined }, "Status advanced")) {
                  setMoveNote("");
                }
              }}
            >
              {next ? `Advance to ${STATUS_LABELS[next]}` : "Final stage"}
            </button>
            {canCancel(p.status) && (
              <button
                className="inline-flex items-center rounded-lg border border-red-500/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Cancel this order?")) {
                    call({ action: "cancel", note: moveNote || undefined }, "Order cancelled");
                  }
                }}
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom 3D Design Proof Studio */}
      <div className="space-y-2 rounded-lg border border-[#242426] bg-[#0B0B0C] p-3">
        <p className={label}>3D Design Proof & Customer Approval</p>
        <div className="text-xs text-gray-400">
          Current: <span className="font-mono text-[#C8FF35]">{p.designStatus || "NOT_REQUIRED"}</span>
        </div>
        {p.designFeedback && (
          <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-xs text-amber-200">
            Customer requested changes: &quot;{p.designFeedback}&quot;
          </div>
        )}
        <input
          className={inputCls}
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          placeholder="Proof Image URL or R2 render link"
        />
        <input
          className={inputCls}
          value={proofNotes}
          onChange={(e) => setProofNotes(e.target.value)}
          placeholder="Notes / instructions for customer..."
        />
        <button
          className={btnGhost}
          disabled={busy || !proofUrl.trim()}
          onClick={() => {
            call(
              {
                action: "designProof",
                designProofUrl: proofUrl,
                notes: proofNotes || undefined,
                designStatus: "AWAITING_CUSTOMER",
              },
              "Design proof sent to customer for approval"
            );
          }}
        >
          Send Proof For Customer Approval
        </button>
      </div>

      {/* Refunds (Razorpay / Manual) */}
      <div className="space-y-2 rounded-lg border border-[#242426] bg-[#0B0B0C] p-3">
        <div className="flex justify-between items-center">
          <p className={label}>Refund Management</p>
          {(p.refundedAmount ?? 0) > 0 && (
            <span className="text-[10px] font-mono text-amber-400">
              Refunded: {inr(p.refundedAmount || 0)}
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={inputCls}
            type="number"
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={`Amount (max ${p.totalAmount - (p.refundedAmount ?? 0)})`}
          />
          <input
            className={inputCls}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Reason for refund"
          />
        </div>
        <button
          className="inline-flex items-center rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
          disabled={busy || !refundAmount || Number(refundAmount) <= 0}
          onClick={() => {
            if (window.confirm(`Issue refund of ₹${refundAmount} for order ${p.orderNumber}?`)) {
              call(
                {
                  action: "refund",
                  amount: Number(refundAmount),
                  reason: refundReason || "Admin manual refund",
                },
                "Refund processed successfully"
              );
              setRefundAmount("");
              setRefundReason("");
            }
          }}
        >
          Process Refund
        </button>
      </div>

      {/* Shipping details */}
      <div className="space-y-2">
        <p className={label}>Shipping (required before SHIPPED)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={inputCls}
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="Courier name"
            maxLength={100}
          />
          <input
            className={inputCls}
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Tracking number"
            maxLength={100}
          />
        </div>
        <input
          className={inputCls}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Tracking URL (https://...)"
          maxLength={500}
        />
        <button
          className={btnGhost}
          disabled={busy}
          onClick={() =>
            call(
              {
                action: "shipping",
                courierName: courier,
                trackingNumber: tracking,
                trackingUrl: url,
              },
              "Shipping details saved"
            )
          }
        >
          Save shipping
        </button>
      </div>

      {/* Internal & QC Notes */}
      <div className="space-y-2">
        <p className={label}>Add note</p>
        <select
          className={inputCls}
          value={noteField}
          onChange={(e) => setNoteField(e.target.value as "internalNotes" | "qcNotes")}
        >
          <option value="internalNotes">Internal note</option>
          <option value="qcNotes">Production / QC note</option>
        </select>
        <textarea
          className={inputCls}
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          maxLength={2000}
          placeholder="Note (appended with timestamp and your email)"
        />
        <button
          className={btnGhost}
          disabled={busy || !noteText.trim()}
          onClick={async () => {
            if (await call({ action: "note", field: noteField, text: noteText }, "Note added")) {
              setNoteText("");
            }
          }}
        >
          Add note
        </button>
      </div>

      {/* Payment Status */}
      <div className="space-y-2">
        <p className={label}>Payment status</p>
        <div className="flex gap-2">
          <select
            className={inputCls}
            defaultValue={p.paymentStatus}
            onChange={(e) => {
              if (window.confirm(`Set payment status to ${e.target.value}?`)) {
                call({ action: "payment", paymentStatus: e.target.value }, "Payment status updated");
              } else {
                e.target.value = p.paymentStatus;
              }
            }}
          >
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="failed">failed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
