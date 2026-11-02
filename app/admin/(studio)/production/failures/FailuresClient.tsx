"use client";

import React, { useState } from "react";
import { api, useApi, PageHeader, Card, Stat, Badge, Table, ErrorBox, Loading, Field, inputCls, btnPrimary, fmtDate, inr } from "@/components/admin/ops/ui";

const REASONS = [
  "BED_ADHESION", "SUPPORT_FAILURE", "STRINGING", "WARPING", "LAYER_SHIFT", "NOZZLE_CLOG",
  "FILAMENT_RUNOUT", "POWER_FAILURE", "MODEL_ERROR", "GCODE_ERROR", "OPERATOR_ERROR", "OTHER",
];

export default function FailuresClient() {
  const failures = useApi<any>("/api/admin/production/failures");
  const queue = useApi<any>("/api/admin/production/queue");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ jobTicketId: "", failureReason: "BED_ADHESION", wastedGrams: "0", wastedMinutes: "0", notes: "" });

  const reload = () => {
    failures.reload();
    queue.reload();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const t = (queue.data?.tickets || []).find((x: any) => x.id === form.jobTicketId);
      await api("/api/admin/production/failures", {
        method: "POST",
        body: JSON.stringify({
          jobTicketId: form.jobTicketId,
          printerId: t?.printerId || null,
          spoolId: t?.spoolId || null,
          failureReason: form.failureReason,
          wastedGrams: Number(form.wastedGrams) || 0,
          wastedMinutes: Number(form.wastedMinutes) || 0,
          notes: form.notes || null,
        }),
      });
      setShow(false);
      setForm({ jobTicketId: "", failureReason: "BED_ADHESION", wastedGrams: "0", wastedMinutes: "0", notes: "" });
      reload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const list: any[] = failures.data?.failures || [];
  const totalGrams = list.reduce((a, f) => a + (Number(f.wastedGrams) || 0), 0);
  const totalCost = list.reduce((a, f) => a + (Number(f.wasteCost) || 0), 0);
  const totalMinutes = list.reduce((a, f) => a + (Number(f.wastedMinutes) || 0), 0);
  const tickets: any[] = (queue.data?.tickets || []).filter((t: any) => t.status !== "DONE");

  return (
    <div className="space-y-8">
      <PageHeader title="Failures & Reprints" subtitle="Log failed prints, track waste and trigger reprint tickets." onRefresh={reload}>
        <button onClick={() => setShow((v) => !v)} className={btnPrimary}>
          {show ? "Close" : "Record failure"}
        </button>
      </PageHeader>

      {failures.error && <ErrorBox message={failures.error} onRetry={failures.reload} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Recent failures" value={list.length} hint="Last 50 recorded" tone="warn" />
        <Stat label="Filament wasted" value={`${Math.round(totalGrams)}g`} />
        <Stat label="Print time lost" value={`${(totalMinutes / 60).toFixed(1)}h`} />
        <Stat label="Waste cost" value={inr(totalCost)} tone="bad" />
      </div>

      {show && (
        <Card title="Record print failure">
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Job ticket">
              <select required className={inputCls} value={form.jobTicketId} onChange={(e) => setForm({ ...form, jobTicketId: e.target.value })}>
                <option value="">Select ticket...</option>
                {tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ticketNumber} ({t.status}) {t.order?.orderNumber || ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reason">
              <select className={inputCls} value={form.failureReason} onChange={(e) => setForm({ ...form, failureReason: e.target.value })}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Wasted grams">
              <input type="number" min="0" step="any" className={inputCls} value={form.wastedGrams} onChange={(e) => setForm({ ...form, wastedGrams: e.target.value })} />
            </Field>
            <Field label="Wasted minutes">
              <input type="number" min="0" step="1" className={inputCls} value={form.wastedMinutes} onChange={(e) => setForm({ ...form, wastedMinutes: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Notes">
                <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
            <div className="flex items-end">
              <button disabled={saving || !form.jobTicketId} className={btnPrimary}>
                {saving ? "Saving..." : "Save failure"}
              </button>
            </div>
          </form>
          {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
        </Card>
      )}

      <Card title="Failure log">
        {failures.loading && !failures.data ? (
          <Loading />
        ) : (
          <Table head={["When", "Ticket", "Reason", "Printer", "Spool", "Waste", "Cost", "Notes"]} empty="No print failures recorded. Good news.">
            {list.map((f) => (
              <tr key={f.id} className="hover:bg-[#1a1a1d]">
                <td className="py-3 pr-4">{fmtDate(f.failedAt)}</td>
                <td className="py-3 pr-4 font-medium text-[#F3F0E9]">{f.jobTicket?.ticketNumber || "-"}</td>
                <td className="py-3 pr-4">
                  <Badge tone="bad">{String(f.failureReason).replace(/_/g, " ")}</Badge>
                </td>
                <td className="py-3 pr-4">{f.printer?.name || "-"}</td>
                <td className="py-3 pr-4">{f.spool ? `${f.spool.spoolNumber} ${f.spool.colorName || ""}` : "-"}</td>
                <td className="py-3 pr-4">
                  {f.wastedGrams}g / {f.wastedMinutes}m
                </td>
                <td className="py-3 pr-4">{inr(f.wasteCost)}</td>
                <td className="py-3 pr-4">{f.notes || "-"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
