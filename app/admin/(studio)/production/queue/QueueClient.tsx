"use client";

import React, { useState } from "react";
import { api, useApi, PageHeader, Card, Stat, Badge, Table, ErrorBox, Loading, Field, inputCls, btnPrimary, btnGhost, fmtDate } from "@/components/admin/ops/ui";

const PRIORITY: Record<number, string> = { 1: "Critical", 2: "Standard", 3: "Low" };

function statusTone(s: string): "muted" | "lime" | "warn" | "bad" | "info" {
  if (s === "AVAILABLE" || s === "DONE") return "lime";
  if (s === "PRINTING" || s === "QUEUED") return "info";
  if (s === "MAINTENANCE" || s === "QC" || s === "FINISHING") return "warn";
  if (s === "OFFLINE" || s === "ERROR" || s === "FAILED") return "bad";
  return "muted";
}

export default function QueueClient() {
  const queue = useApi<any>("/api/admin/production/queue");
  const printers = useApi<any>("/api/admin/production/printers");
  const [form, setForm] = useState({ name: "", model: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const reloadAll = () => {
    queue.reload();
    printers.reload();
  };

  const addPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api("/api/admin/production/printers", {
        method: "POST",
        body: JSON.stringify({ name: form.name, model: form.model, location: form.location || undefined, status: "AVAILABLE" }),
      });
      setForm({ name: "", model: "", location: "" });
      setShowForm(false);
      printers.reload();
      queue.reload();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removePrinter = async (id: string, name: string) => {
    if (!window.confirm(`Remove printer "${name}"?`)) return;
    try {
      await api(`/api/admin/production/printers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      reloadAll();
    } catch (err: any) {
      window.alert(err.message);
    }
  };

  const cap = queue.data?.capacity;
  const tickets: any[] = queue.data?.tickets || [];
  const shown = tickets.filter((t) => (statusFilter === "ACTIVE" ? !["DONE"].includes(t.status) : statusFilter === "ALL" ? true : t.status === statusFilter));
  const fleet: any[] = printers.data?.printers || [];

  return (
    <div className="space-y-8">
      <PageHeader title="Print Queue & Fleet" subtitle="Live printer fleet, workload and the production job queue." onRefresh={reloadAll}>
        <button onClick={() => setShowForm((v) => !v)} className={btnPrimary}>
          {showForm ? "Close" : "Add printer"}
        </button>
      </PageHeader>

      {queue.error && <ErrorBox message={queue.error} onRetry={queue.reload} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Printers" value={cap?.printers?.total ?? 0} hint={`${cap?.printers?.available ?? 0} available`} tone="lime" />
        <Stat label="Utilization" value={`${cap?.printers?.utilizationPercent ?? 0}%`} hint={`${cap?.printers?.busy ?? 0} printing, ${cap?.printers?.maintenance ?? 0} in maintenance`} />
        <Stat label="Queued Jobs" value={cap?.workload?.queuedJobsCount ?? 0} hint={`${cap?.workload?.totalQueuedHours ?? 0} print hours`} tone="warn" />
        <Stat label="Capacity 24h" value={`${cap?.workload?.capacityNext24Hours ?? 0}h`} hint={`${cap?.workload?.capacityNext7Days ?? 0}h over 7 days`} />
      </div>

      {showForm && (
        <Card title="Add printer">
          <form onSubmit={addPrinter} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Name">
              <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Printer 1" />
            </Field>
            <Field label="Model">
              <input required className={inputCls} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Bambu Lab P1S" />
            </Field>
            <Field label="Location">
              <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Workshop" />
            </Field>
            <div className="flex items-end">
              <button disabled={saving} className={btnPrimary}>
                {saving ? "Saving..." : "Save printer"}
              </button>
            </div>
          </form>
          {formError && <p className="mt-3 text-xs text-red-400">{formError}</p>}
        </Card>
      )}

      <Card title="Printer fleet">
        {printers.loading && !printers.data ? (
          <Loading />
        ) : printers.error ? (
          <ErrorBox message={printers.error} onRetry={printers.reload} />
        ) : (
          <Table head={["Printer", "Model", "Status", "Location", "Current job", ""]} empty="No printers registered yet. Add your first printer above.">
            {fleet.map((p) => (
              <tr key={p.id} className="hover:bg-[#1a1a1d]">
                <td className="py-3 pr-4 font-medium text-[#F3F0E9]">{p.name}</td>
                <td className="py-3 pr-4">{p.model}</td>
                <td className="py-3 pr-4">
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </td>
                <td className="py-3 pr-4">{p.location || "-"}</td>
                <td className="py-3 pr-4">{p.tickets?.length ? p.tickets.map((t: any) => t.ticketNumber).join(", ") : "-"}</td>
                <td className="py-3 text-right">
                  <button onClick={() => removePrinter(p.id, p.name)} className={btnGhost}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title="Job queue"
        right={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls + " !w-auto"}>
            {["ACTIVE", "ALL", "QUEUED", "PRINTING", "FAILED", "REPRINT", "FINISHING", "QC", "DONE"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      >
        {queue.loading && !queue.data ? (
          <Loading />
        ) : (
          <Table head={["Ticket", "Order", "Material", "Status", "Priority", "Printer", "Est.", "Created"]} empty="No job tickets in this view.">
            {shown.map((t) => (
              <tr key={t.id} className="hover:bg-[#1a1a1d]">
                <td className="py-3 pr-4 font-medium text-[#F3F0E9]">{t.ticketNumber}</td>
                <td className="py-3 pr-4">
                  {t.order?.orderNumber || "-"}
                  <div className="text-[10px] text-gray-500">{t.order?.customerName}</div>
                </td>
                <td className="py-3 pr-4">{[t.material, t.color].filter(Boolean).join(" / ") || "-"}</td>
                <td className="py-3 pr-4">
                  <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                </td>
                <td className="py-3 pr-4">{PRIORITY[t.priority] || t.priority}</td>
                <td className="py-3 pr-4">{t.printer?.name || "Unassigned"}</td>
                <td className="py-3 pr-4">{t.estimatedDurationMinutes ? `${t.estimatedDurationMinutes}m` : "-"}</td>
                <td className="py-3 pr-4">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
