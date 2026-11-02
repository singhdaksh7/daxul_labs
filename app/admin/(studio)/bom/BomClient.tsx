"use client";

import React, { useState } from "react";
import { api, useApi, PageHeader, Card, Table, ErrorBox, Loading, Field, Badge, inputCls, btnPrimary, btnGhost, fmtDate } from "@/components/admin/ops/ui";

const UNITS = ["GRAM", "KG", "METER", "PIECE", "ROLL", "PACK", "BOX"];
type Row = { materialItemId: string; quantity: string; unit: string; wasteAllowancePercent: string };
const emptyRow = (): Row => ({ materialItemId: "", quantity: "1", unit: "GRAM", wasteAllowancePercent: "5" });

export default function BomClient() {
  const boms = useApi<any>("/api/admin/bom");
  const materials = useApi<any>("/api/admin/materials");
  const products = useApi<any>("/api/admin/products?status=all");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mats: any[] = materials.data?.materials || [];
  const prods: any[] = products.data?.products || [];
  const list: any[] = boms.data?.boms || [];

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await api("/api/admin/bom", {
        method: "POST",
        body: JSON.stringify({
          name,
          productId,
          items: rows.map((r) => ({
            materialItemId: r.materialItemId,
            quantity: Number(r.quantity),
            unit: r.unit,
            wasteAllowancePercent: Number(r.wasteAllowancePercent) || 0,
          })),
        }),
      });
      setShow(false);
      setName("");
      setProductId("");
      setRows([emptyRow()]);
      boms.reload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Bill of Materials" subtitle="Define the raw materials each product consumes. Saving an existing BOM creates a new version." onRefresh={boms.reload}>
        <button onClick={() => setShow((v) => !v)} className={btnPrimary}>
          {show ? "Close" : "New BOM"}
        </button>
      </PageHeader>

      {boms.error && <ErrorBox message={boms.error} onRetry={boms.reload} />}

      {show && (
        <Card title="Create BOM">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="BOM name">
                <input required minLength={2} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard build" />
              </Field>
              <Field label="Product">
                <select required className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
                  <option value="">Select product...</option>
                  {prods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <select required className={inputCls + " col-span-2 sm:col-span-1"} value={r.materialItemId} onChange={(e) => setRow(i, { materialItemId: e.target.value })}>
                    <option value="">Material...</option>
                    {mats.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.sku})
                      </option>
                    ))}
                  </select>
                  <input required type="number" min="0.0001" step="any" className={inputCls} value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} placeholder="Qty" />
                  <select className={inputCls} value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })}>
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input type="number" min="0" step="any" className={inputCls} value={r.wasteAllowancePercent} onChange={(e) => setRow(i, { wasteAllowancePercent: e.target.value })} placeholder="Waste %" />
                  <button type="button" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className={btnGhost}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className={btnGhost}>
                Add material line
              </button>
              {mats.length === 0 && !materials.loading && <p className="text-xs text-yellow-400">No materials exist yet. Add some on the Materials page first.</p>}
            </div>
            <div className="flex items-center gap-3">
              <button disabled={saving} className={btnPrimary}>
                {saving ? "Saving..." : "Save BOM"}
              </button>
              {err && <span className="text-xs text-red-400">{err}</span>}
            </div>
          </form>
        </Card>
      )}

      <Card title="Bills of material">
        {boms.loading && !boms.data ? (
          <Loading />
        ) : (
          <Table head={["BOM", "Product", "Version", "Components", "Updated"]} empty="No BOMs yet. Create one to enable material reservation for product tickets.">
            {list.map((b) => {
              const v = b.versions?.[0];
              return (
                <tr key={b.id} className="align-top hover:bg-[#1a1a1d]">
                  <td className="py-3 pr-4 font-medium text-[#F3F0E9]">
                    {b.name} {!b.active && <Badge tone="warn">inactive</Badge>}
                  </td>
                  <td className="py-3 pr-4">
                    {b.product?.name || "-"}
                    {b.variant && <div className="text-[10px] text-gray-500">{b.variant.name}</div>}
                  </td>
                  <td className="py-3 pr-4">{v ? `v${v.versionNumber}` : "-"}</td>
                  <td className="py-3 pr-4">
                    {v?.items?.length ? (
                      <ul className="space-y-0.5">
                        {v.items.map((it: any) => (
                          <li key={it.id}>
                            {it.materialItem?.name}: {it.quantity} {it.unit}
                            {it.wasteAllowancePercent ? ` (+${it.wasteAllowancePercent}%)` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3 pr-4">{fmtDate(b.updatedAt)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
