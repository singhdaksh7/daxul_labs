"use client";

import React, { useState } from "react";
import { api, useApi, PageHeader, Card, Stat, Badge, Table, ErrorBox, Loading, Field, inputCls, btnPrimary, btnGhost, fmtDate, inr } from "@/components/admin/ops/ui";

function shipTone(s: string): "muted" | "lime" | "warn" | "bad" | "info" {
  if (s === "DELIVERED") return "lime";
  if (s === "IN_TRANSIT" || s === "OUT_FOR_DELIVERY" || s === "PICKED_UP") return "info";
  if (s.startsWith("RTO") || s === "EXCEPTION") return "bad";
  return "muted";
}

export default function ShipmentsClient() {
  const ships = useApi<any>("/api/admin/shipments");
  const ready = useApi<any>("/api/admin/shipments/ready");
  const [show, setShow] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [weight, setWeight] = useState("500");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const list: any[] = ships.data?.shipments || [];
  const orders: any[] = ready.data?.orders || [];
  const selected = orders.find((o) => o.id === orderId);

  const reloadAll = () => {
    ships.reload();
    ready.reload();
  };

  const dispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setErr(null);
    try {
      await api("/api/admin/shipments", {
        method: "POST",
        body: JSON.stringify({
          orderId: selected.id,
          orderNumber: selected.orderNumber,
          recipientName: selected.customerName,
          recipientPhone: selected.customerPhone,
          street: selected.street,
          city: selected.city,
          state: selected.state,
          pincode: selected.pincode,
          weightGrams: Number(weight),
          isCod: selected.paymentMethod === "cod",
          totalAmount: Number(selected.totalAmount),
        }),
      });
      setOrderId("");
      setShow(false);
      reloadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inTransit = list.filter((s) => ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(s.status)).length;
  const delivered = list.filter((s) => s.status === "DELIVERED").length;
  const problems = list.filter((s) => s.status.startsWith("RTO") || s.status === "EXCEPTION").length;

  return (
    <div className="space-y-8">
      <PageHeader title="Shipments & Dispatch" subtitle="Create courier shipments for orders and track their progress." onRefresh={reloadAll}>
        <button onClick={() => setShow((v) => !v)} className={btnPrimary}>
          {show ? "Close" : "Dispatch order"}
        </button>
      </PageHeader>

      {ships.error && <ErrorBox message={ships.error} onRetry={ships.reload} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Ready to ship" value={orders.length} hint="Orders without a shipment" tone="warn" />
        <Stat label="In transit" value={inTransit} tone="lime" />
        <Stat label="Delivered" value={delivered} />
        <Stat label="RTO / Exceptions" value={problems} tone="bad" />
      </div>

      {show && (
        <Card title="Dispatch an order">
          <form onSubmit={dispatch} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Order">
                  <select required className={inputCls} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                    <option value="">{ready.loading ? "Loading..." : orders.length ? "Select order..." : "No orders awaiting dispatch"}</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} - {o.customerName} ({o.status})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Package weight (g)">
                <input required type="number" min="1" className={inputCls} value={weight} onChange={(e) => setWeight(e.target.value)} />
              </Field>
            </div>
            {selected && (
              <p className="text-xs text-[#B9B9B4]">
                Ship to {selected.customerName}, {selected.street}, {selected.city}, {selected.state} {selected.pincode} ({selected.customerPhone}). {selected.paymentMethod === "cod" ? "Cash on delivery" : "Prepaid"} - {inr(selected.totalAmount)}.
              </p>
            )}
            <div className="flex items-center gap-3">
              <button disabled={saving || !selected} className={btnPrimary}>
                {saving ? "Dispatching..." : "Create shipment"}
              </button>
              {err && <span className="text-xs text-red-400">{err}</span>}
            </div>
          </form>
        </Card>
      )}

      <Card title="Recent shipments">
        {ships.loading && !ships.data ? (
          <Loading />
        ) : (
          <Table head={["Order", "Customer", "Courier", "AWB", "Status", "Charge", "Created", ""]} empty="No shipments yet.">
            {list.map((s) => (
              <tr key={s.id} className="hover:bg-[#1a1a1d]">
                <td className="py-3 pr-4 font-medium text-[#F3F0E9]">{s.order?.orderNumber || "-"}</td>
                <td className="py-3 pr-4">{s.order?.customerName || "-"}</td>
                <td className="py-3 pr-4">{s.courierName || s.provider}</td>
                <td className="py-3 pr-4">{s.awbNumber || "-"}</td>
                <td className="py-3 pr-4"><Badge tone={shipTone(s.status)}>{s.status.replace(/_/g, " ")}</Badge></td>
                <td className="py-3 pr-4">{inr(s.actualCharge || s.quotedCharge)}</td>
                <td className="py-3 pr-4">{fmtDate(s.createdAt)}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {s.provider === "shiprocket" && s.order?.id && (
                      <a href={`/admin/orders/${s.order.id}`} className={btnGhost}>Shiprocket actions</a>
                    )}
                    {s.labelUrl && <a href={s.labelUrl} target="_blank" rel="noreferrer" className={btnGhost}>Label</a>}
                    {s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noreferrer" className={btnGhost}>Track</a>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
