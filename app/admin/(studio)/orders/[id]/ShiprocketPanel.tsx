"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { btnGhost, btnPrimary, inr } from "@/components/admin/shell/ui";

type Shipment = {
  shipmentId: string | null;
  srOrderId: string | null;
  awb: string | null;
  courierName: string | null;
  status: string;
  labelUrl: string | null;
  pickupScheduledAt: string | null;
  events: { status: string; at: string; activity: string | null; location: string | null }[];
} | null;

type Courier = { courierId: number; courierName: string; rate: number; etd: string | null; estimatedDays: number | null; recommended: boolean };

type Props = {
  orderId: string;
  configured: boolean;
  blockedReason: string | null; // why this order cannot be shipped (unpaid, cancelled...)
  shipment: Shipment;
};

export default function ShiprocketPanel({ orderId, configured, blockedReason, shipment }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [couriers, setCouriers] = useState<Courier[] | null>(null);
  const [courierId, setCourierId] = useState<number | "">("");

  if (!configured) {
    return <p className="text-sm text-gray-400">Shiprocket not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD on the server to enable it.</p>;
  }

  async function post(path: string, body: Record<string, unknown>, okText: string): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/shiprocket/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Request failed" });
        return null;
      }
      setMsg({ ok: true, text: okText });
      router.refresh();
      return data;
    } catch {
      setMsg({ ok: false, text: "Network error" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function loadCouriers() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/shiprocket/rates?orderId=${encodeURIComponent(orderId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Could not load couriers" });
        return;
      }
      const list: Courier[] = data.couriers || [];
      setCouriers(list);
      const rec = list.find((c) => c.recommended) || list[0];
      setCourierId(rec ? rec.courierId : "");
      if (!list.length) setMsg({ ok: false, text: "No courier serves this pincode/weight" });
    } finally {
      setBusy(false);
    }
  }

  async function label() {
    const data = await post("label", {}, "Label generated");
    const url = data && typeof data.labelUrl === "string" ? data.labelUrl : null;
    if (url && /^https:\/\//.test(url)) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-3 text-sm">
      {!shipment && (
        <>
          {blockedReason ? (
            <p className="text-amber-300">{blockedReason}</p>
          ) : (
            <button disabled={busy} onClick={() => post("shipment", {}, "Shiprocket shipment created")} className={btnPrimary}>
              Create shipment
            </button>
          )}
        </>
      )}

      {shipment && (
        <dl className="space-y-1 text-gray-300">
          <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd>{shipment.status.replace(/_/g, " ")}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">SR order</dt><dd className="font-mono">{shipment.srOrderId || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">SR shipment</dt><dd className="font-mono">{shipment.shipmentId || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Courier</dt><dd>{shipment.courierName || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">AWB</dt><dd className="font-mono">{shipment.awb || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Pickup</dt><dd>{shipment.pickupScheduledAt ? new Date(shipment.pickupScheduledAt).toLocaleString("en-IN") : "—"}</dd></div>
        </dl>
      )}

      {shipment && !shipment.awb && (
        <div className="space-y-2">
          <button disabled={busy} onClick={loadCouriers} className={btnGhost}>Fetch courier options</button>
          {couriers && couriers.length > 0 && (
            <>
              <select
                value={courierId}
                onChange={(e) => setCourierId(Number(e.target.value))}
                className="w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-sm text-gray-200"
              >
                {couriers.map((c) => (
                  <option key={c.courierId} value={c.courierId}>
                    {c.courierName} — {inr(c.rate)}{c.estimatedDays ? ` — ${c.estimatedDays}d` : ""}{c.recommended ? " (recommended)" : ""}
                  </option>
                ))}
              </select>
              <button
                disabled={busy || courierId === ""}
                onClick={() => post("awb", { courierId: Number(courierId) }, "AWB assigned")}
                className={btnPrimary}
              >
                Assign AWB
              </button>
            </>
          )}
          <button disabled={busy} onClick={() => post("awb", {}, "AWB assigned (auto courier)")} className={btnGhost}>
            Assign AWB (auto-pick courier)
          </button>
        </div>
      )}

      {shipment && shipment.awb && (
        <div className="flex flex-wrap gap-2">
          {!shipment.pickupScheduledAt && (
            <button disabled={busy} onClick={() => post("pickup", {}, "Pickup scheduled")} className={btnPrimary}>Schedule pickup</button>
          )}
          <button disabled={busy} onClick={label} className={btnGhost}>Download label</button>
          <button disabled={busy} onClick={() => post("refresh", {}, "Tracking refreshed")} className={btnGhost}>Refresh tracking</button>
        </div>
      )}

      {shipment && shipment.status === "MANIFEST_GENERATED" && (
        <button
          disabled={busy}
          onClick={() => { if (confirm("Cancel this Shiprocket shipment?")) post("cancel", {}, "Shipment cancelled"); }}
          className="text-xs text-red-400 hover:underline"
        >
          Cancel shipment
        </button>
      )}

      {shipment && shipment.events.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-auto border-t border-[#242426] pt-2 text-xs text-gray-400">
          {[...shipment.events].reverse().map((e, i) => (
            <li key={i}>
              <span className="text-gray-200">{e.status.replace(/_/g, " ")}</span>{" "}
              <span>{new Date(e.at).toLocaleString("en-IN")}</span>
              {e.location ? ` · ${e.location}` : ""}
            </li>
          ))}
        </ul>
      )}

      {msg && <p className={msg.ok ? "text-emerald-400" : "text-red-400"}>{msg.text}</p>}
    </div>
  );
}
