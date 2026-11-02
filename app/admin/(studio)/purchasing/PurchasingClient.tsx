"use client";

import React, { useState } from "react";
import { api, useApi, PageHeader, Card, Stat, Badge, Table, ErrorBox, Loading, Field, inputCls, btnPrimary, btnGhost, fmtDate, inr } from "@/components/admin/ops/ui";

type Line = { materialItemId: string; orderedQuantity: string; unitCost: string };
const emptyLine = (): Line => ({ materialItemId: "", orderedQuantity: "1", unitCost: "0" });

function poTone(s: string): "muted" | "lime" | "warn" | "bad" | "info" {
  if (s === "RECEIVED") return "lime";
  if (s === "PARTIALLY_RECEIVED") return "warn";
  if (s === "CANCELLED") return "bad";
  if (s === "SENT") return "info";
  return "muted";
}

export default function PurchasingClient() {
  const po = useApi<any>("/api/admin/purchasing/orders");
  const materials = useApi<any>("/api/admin/materials");
  const [panel, setPanel] = useState<"none" | "supplier" | "po">("none");
  const [sup, setSup] = useState({ name: "", contactName: "", email: "", phone: "", gstin: "" });
  const [poForm, setPoForm] = useState({ supplierId: "", notes: "" });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [receiving, setReceiving] = useState<string | null>(null);

  const suppliers: any[] = po.data?.suppliers || [];
  const orders: any[] = po.data?.purchaseOrders || [];
  const mats: any[] = materials.data?.materials || [];
  const openPos = orders.filter((o) => ["DRAFT", "SENT", "PARTIALLY_RECEIVED"].includes(o.status));

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    setErr(null);
    try {
      await fn();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api("/api/admin/purchasing/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: sup.name,
          contactName: sup.contactName || undefined,
          email: sup.email || undefined,
          phone: sup.phone || undefined,
          gstin: sup.gstin || undefined,
        }),
      });
      setSup({ name: "", contactName: "", email: "", phone: "", gstin: "" });
      setPanel("none");
      po.reload();
    });
  };

  const savePo = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api("/api/admin/purchasing/orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          notes: poForm.notes || null,
          items: lines.map((l) => ({ materialItemId: l.materialItemId, orderedQuantity: Number(l.orderedQuantity), unitCost: Number(l.unitCost) })),
        }),
      });
      setPoForm({ supplierId: "", notes: "" });
      setLines([emptyLine()]);
      setPanel("none");
      po.reload();
    });
  };

  const receiveAll = async (order: any) => {
    const remaining = (order.items || []).filter((i: any) => i.orderedQuantity - i.receivedQuantity > 0);
    if (!remaining.length) return;
    if (!window.confirm(`Receive all outstanding items on ${order.poNumber}?`)) return;
    setReceiving(order.id);
    setErr(null);
    try {
      await api("/api/admin/purchasing/receive", {
        method: "POST",
        body: JSON.stringify({
          purchaseOrderId: order.id,
          items: remaining.map((i: any) => ({
            purchaseOrderItemId: i.id,
            materialItemId: i.materialItemId,
            receivedQuantity: i.orderedQuantity - i.receivedQuantity,
          })),
        }),
      });
      po.reload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setReceiving(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Suppliers & Purchase Orders" subtitle="Manage suppliers, raise purchase orders and receive goods into stock." onRefresh={() => { po.reload(); materials.reload(); }}>
        <button onClick={() => setPanel(panel === "supplier" ? "none" : "supplier")} className={btnGhost}>
          New supplier
        </button>
        <button onClick={() => setPanel(panel === "po" ? "none" : "po")} className={btnPrimary}>
          New purchase order
        </button>
      </PageHeader>

      {po.error && <ErrorBox message={po.error} onRetry={po.reload} />}
      {err && <ErrorBox message={err} />}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Suppliers" value={suppliers.length} tone="lime" />
        <Stat label="Open POs" value={openPos.length} tone="warn" />
        <Stat label="Total POs" value={orders.length} />
      </div>

      {panel === "supplier" && (
        <Card title="New supplier">
          <form onSubmit={saveSupplier} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Name">
              <input required minLength={2} className={inputCls} value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} />
            </Field>
            <Field label="Contact">
              <input className={inputCls} value={sup.contactName} onChange={(e) => setSup({ ...sup, contactName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} value={sup.email} onChange={(e) => setSup({ ...sup, email: e.target.value })} />
            </Field>
            <Field label="GSTIN">
              <input className={inputCls} value={sup.gstin} onChange={(e) => setSup({ ...sup, gstin: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <button disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save supplier"}</button>
            </div>
          </form>
        </Card>
      )}

      {panel === "po" && (
        <Card title="New purchase order">
          <form onSubmit={savePo} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Supplier">
                <select required className={inputCls} value={poForm.supplierId} onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}>
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <input className={inputCls} value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} />
              </Field>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <select required className={inputCls + " col-span-2 sm:col-span-1"} value={l.materialItemId} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, materialItemId: e.target.value } : x)))}>
                  <option value="">Material...</option>
                  {mats.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                  ))}
                </select>
                <input required type="number" min="0.0001" step="any" placeholder="Qty" className={inputCls} value={l.orderedQuantity} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, orderedQuantity: e.target.value } : x)))} />
                <input required type="number" min="0" step="any" placeholder="Unit cost" className={inputCls} value={l.unitCost} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, unitCost: e.target.value } : x)))} />
                <button type="button" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className={btnGhost}>Remove</button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className={btnGhost}>Add line</button>
              <button disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Create PO"}</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Purchase orders">
        {po.loading && !po.data ? (
          <Loading />
        ) : (
          <Table head={["PO", "Supplier", "Status", "Items", "Total", "Created", ""]} empty="No purchase orders yet.">
            {orders.map((o) => (
              <tr key={o.id} className="align-top hover:bg-[#1a1a1d]">
                <td className="py-3 pr-4 font-medium text-[#F3F0E9]">{o.poNumber}</td>
                <td className="py-3 pr-4">{o.supplier?.name}</td>
                <td className="py-3 pr-4"><Badge tone={poTone(o.status)}>{o.status.replace(/_/g, " ")}</Badge></td>
                <td className="py-3 pr-4">
                  {(o.items || []).map((i: any) => (
                    <div key={i.id}>{i.materialItem?.name}: {i.receivedQuantity}/{i.orderedQuantity}</div>
                  ))}
                </td>
                <td className="py-3 pr-4">{inr(o.totalAmount)}</td>
                <td className="py-3 pr-4">{fmtDate(o.createdAt)}</td>
                <td className="py-3 text-right">
                  {["DRAFT", "SENT", "PARTIALLY_RECEIVED"].includes(o.status) && (
                    <button disabled={receiving === o.id} onClick={() => receiveAll(o)} className={btnGhost}>
                      {receiving === o.id ? "Receiving..." : "Receive all"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Suppliers">
        <Table head={["Name", "Contact", "Phone", "Email", "Terms", "Lead time"]} empty="No suppliers yet.">
          {suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-[#1a1a1d]">
              <td className="py-3 pr-4 font-medium text-[#F3F0E9]">{s.name}</td>
              <td className="py-3 pr-4">{s.contactName || "-"}</td>
              <td className="py-3 pr-4">{s.phone || "-"}</td>
              <td className="py-3 pr-4">{s.email || "-"}</td>
              <td className="py-3 pr-4">{s.paymentTerms || "-"}</td>
              <td className="py-3 pr-4">{s.leadTimeDays} days</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
