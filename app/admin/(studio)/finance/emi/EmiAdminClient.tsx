"use client";

import React, { useEffect, useState } from "react";
import { Clock, Plus, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

export default function EmiAdminClient() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("THREE_D_PRINTER");
  const [classification, setClassification] = useState("CAPITAL_EXPENSE");
  const [financedByPartnerId, setFinancedByPartnerId] = useState("");
  const [totalCostRupees, setTotalCostRupees] = useState("");
  const [downPaymentRupees, setDownPaymentRupees] = useState("");
  const [totalTenureMonths, setTotalTenureMonths] = useState("6");
  const [monthlyInstallmentRupees, setMonthlyInstallmentRupees] = useState("");
  const [firstEmiDate, setFirstEmiDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [emiRes, partRes] = await Promise.all([
        fetch("/api/admin/finance/emi"),
        fetch("/api/admin/finance/partners"),
      ]);
      if (emiRes.ok) {
        const d = await emiRes.json();
        setSchedules(d.schedules || []);
      }
      if (partRes.ok) {
        const pd = await partRes.json();
        const activeList = pd.partners || [];
        setPartners(activeList);
        if (activeList.length > 0) {
          const primary = activeList.find((p: any) => p.isPrimarySettlementPartner) || activeList[0];
          setFinancedByPartnerId(primary.id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = React.useMemo(() => {
    const now = Date.now();
    let upcoming = 0, overdue = 0, paid = 0, sharesPending = 0;
    for (const sch of schedules) {
      for (const i of sch.installments || []) {
        if (i.status === "PAID") {
          paid++;
          for (const o of i.partnerObligations || []) if (o.status !== "PAID") sharesPending++;
        } else if (new Date(i.dueDate).getTime() < now) overdue++;
        else upcoming++;
      }
    }
    return { upcoming, overdue, paid, sharesPending };
  }, [schedules]);

  const handleCreateEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/finance/emi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          paidByPartnerId: financedByPartnerId,
          purchasePriceRupees: parseFloat(totalCostRupees),
          downPaymentRupees: parseFloat(downPaymentRupees) || 0,
          totalEmiCount: parseInt(totalTenureMonths, 10),
          frequency: "MONTHLY",
          firstEmiDate: firstEmiDate ? new Date(firstEmiDate).toISOString() : new Date().toISOString(),
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create EMI schedule");

      setSuccess(`EMI Schedule "${d.expense?.title ?? title}" created with ${d.installments?.length ?? 0} installments.`);
      setTitle("");
      setTotalCostRupees("");
      setDownPaymentRupees("");
      setMonthlyInstallmentRupees("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8" id="emi-view">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">EMI Schedules & Equipment Financing</h1>
        <p className="mt-1 text-xs text-[#B9B9B4]">
          Track down payments, monthly installments, interest overheads, and multi-partner debt obligations.
        </p>
      </div>

      {error && (
        <div id="emi-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="emi-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* EMI Status Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" id="emi-metrics">
        {[
          { label: "Upcoming", value: stats.upcoming, cls: "text-gray-200" },
          { label: "Overdue", value: stats.overdue, cls: "text-red-400" },
          { label: "Paid to lender", value: stats.paid, cls: "text-[#C8FF35]" },
          { label: "Partner shares pending", value: stats.sharesPending, cls: "text-yellow-400" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[#242426] bg-[#151515] p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">{m.label}</span>
            <p className={`mt-2 text-2xl font-bold ${m.cls}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Schedules Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C8FF35]" />
              Active EMI Schedules ({schedules.length})
            </h2>
            <div className="mt-5 space-y-6" id="emi-schedules-list">
              {schedules.map((sch) => (
                <ScheduleCard key={sch.id} sch={sch} onChanged={fetchData} onError={setError} />
              ))}
              {schedules.length === 0 && !loading && (
                <p className="py-6 text-center text-xs text-gray-500">No EMI schedules logged yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Create EMI Schedule Form */}
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#C8FF35]" />
            New Equipment Financing / EMI
          </h2>
          <form onSubmit={handleCreateEmi} className="mt-4 space-y-4" id="emi-form">
            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Equipment Title</label>
              <input
                id="emi-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. QA 3D Printer"
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-[#B9B9B4]">Purchase Price (₹)</label>
                <input
                  id="emi-price-input"
                  type="number"
                  step="0.01"
                  value={totalCostRupees}
                  onChange={(e) => setTotalCostRupees(e.target.value)}
                  placeholder="90000"
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#B9B9B4]">Down Payment (₹)</label>
                <input
                  id="emi-downpayment-input"
                  type="number"
                  step="0.01"
                  value={downPaymentRupees}
                  onChange={(e) => setDownPaymentRupees(e.target.value)}
                  placeholder="30000"
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-[#B9B9B4]">Tenure (Months)</label>
                <input
                  id="emi-tenure-input"
                  type="number"
                  value={totalTenureMonths}
                  onChange={(e) => setTotalTenureMonths(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#B9B9B4]">Monthly EMI (₹) <span className="text-gray-500">- auto-calculated, optional</span></label>
                <input
                  id="emi-monthly-input"
                  type="number"
                  step="0.01"
                  value={monthlyInstallmentRupees}
                  onChange={(e) => setMonthlyInstallmentRupees(e.target.value)}
                  placeholder="calculated automatically"
                  className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[#B9B9B4]">First EMI Due Date</label>
              <input
                id="emi-first-date"
                type="date"
                value={firstEmiDate}
                onChange={(e) => setFirstEmiDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-2 py-1.5 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Financed / Paid By</label>
              <select
                id="emi-partner-select"
                value={financedByPartnerId}
                onChange={(e) => setFinancedByPartnerId(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} {p.isPrimarySettlementPartner ? "(Primary Settlement)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="submit-emi-btn"
              type="submit"
              className="mt-4 w-full rounded-lg bg-[#C8FF35] py-2 text-xs font-semibold text-black hover:bg-[#b8eb28]"
            >
              Generate EMI Schedule & Split
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const rupees = (paise: string | number | bigint | null | undefined) =>
  `₹${(Number(paise ?? 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const todayIso = () => new Date().toISOString().slice(0, 10);

function Badge({ tone, children }: { tone: "green" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
  const map = {
    green: "bg-[#C8FF35]/10 text-[#C8FF35] border-[#C8FF35]/30",
    yellow: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    red: "bg-red-500/10 text-red-300 border-red-500/30",
    gray: "bg-[#242426] text-gray-300 border-[#2f2f32]",
  } as const;
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[tone]}`}>{children}</span>;
}

function ScheduleCard({ sch, onChanged, onError }: { sch: any; onChanged: () => void; onError: (m: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [paidDates, setPaidDates] = useState<Record<string, string>>({});
  const installments: any[] = sch.installments || [];
  const paidCount = installments.filter((i) => i.status === "PAID").length;
  const total = installments.length || 1;
  const payerName = sch.expense?.paidByPartner?.displayName;
  const nextDue = installments.find((i) => i.status !== "PAID");

  const cancelEmi = () => {
    const reason = window.prompt("Why are you cancelling this EMI? (e.g. entered by mistake). Anything it already posted to the partner accounts is reversed.");
    if (!reason || reason.trim().length < 3) return;
    call("cancel", `/api/admin/finance/expenses/${sch.expenseId}`, { method: "DELETE", body: JSON.stringify({ reason: reason.trim() }) });
  };

  const call = async (key: string, url: string, init: RequestInit) => {
    setBusy(key);
    onError(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Action failed");
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#242426] bg-[#0B0B0C] p-5 text-xs emi-schedule-card sm:p-6" data-schedule-id={sch.id}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-[#F3F0E9]">{sch.expense?.title}</h3>
          <p className="text-[12px] text-gray-400">
            Paid by <span className="text-[#C8FF35]">{payerName}</span> • {sch.totalEmiCount} months • first due {fmtDate(sch.firstEmiDate)}
          </p>
        </div>
        <span className="text-lg font-bold text-[#F3F0E9]">{rupees(sch.purchasePricePaise)}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[#242426] pt-5 text-[12px]">
        <div className="space-y-1"><span className="text-gray-500">Down payment</span><p className="font-medium text-[#F3F0E9]">{rupees(sch.downPaymentPaise)}</p></div>
        <div className="space-y-1"><span className="text-gray-500">Financed</span><p className="font-medium text-[#F3F0E9]">{rupees(sch.financedAmountPaise)}</p></div>
        <div className="space-y-1"><span className="text-gray-500">Monthly EMI</span><p className="font-medium text-[#C8FF35]">{rupees(Math.round(Number(sch.financedAmountPaise) / Math.max(1, Number(sch.totalEmiCount))))}</p></div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>{paidCount} of {installments.length} installments paid to lender</span>
          {nextDue && <span>Next due {fmtDate(nextDue.dueDate)}</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#242426]"><div className="h-full bg-[#C8FF35]" style={{ width: `${(paidCount / total) * 100}%` }} /></div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-[12px] font-semibold text-[#C8FF35] hover:underline">
          {open ? "Hide installments" : "Show installments & partner payments"}
        </button>
        <button type="button" onClick={cancelEmi} disabled={busy === "cancel"} className="cancel-emi-btn rounded-lg border border-red-500/40 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
          {busy === "cancel" ? "Cancelling…" : "Cancel EMI"}
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-4">
          {installments.map((inst) => {
            const isPaid = inst.status === "PAID";
            const overdue = !isPaid && new Date(inst.dueDate).getTime() < Date.now();
            const obligations: any[] = inst.partnerObligations || [];
            return (
              <div key={inst.id} className="space-y-4 rounded-lg border border-[#242426] bg-[#151515] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold text-[#F3F0E9]">Installment {inst.installmentNumber} • {rupees(inst.amountPaise)}</p>
                    <p className="text-[11px] text-gray-400">Due {fmtDate(inst.dueDate)}{isPaid && inst.paidAt ? ` • paid ${fmtDate(inst.paidAt)}` : ""}</p>
                  </div>
                  {isPaid ? <Badge tone="green">Paid to lender</Badge> : overdue ? <Badge tone="red">Overdue</Badge> : <Badge tone="gray">Upcoming</Badge>}
                </div>

                {!isPaid && (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="space-y-1 text-[11px] text-gray-400">Date paid
                      <input type="date" max={todayIso()} value={paidDates[inst.id] ?? todayIso()} onChange={(e) => setPaidDates({ ...paidDates, [inst.id]: e.target.value })} className="block rounded-lg border border-[#242426] bg-[#0B0B0C] px-2.5 py-1.5 text-xs text-[#F3F0E9]" />
                    </label>
                    <button
                      type="button"
                      disabled={busy === inst.id}
                      onClick={() => call(inst.id, `/api/admin/finance/emi/installments/${inst.id}`, { method: "PATCH", body: JSON.stringify({ action: "MARK_PAID", paidAt: new Date(paidDates[inst.id] ?? todayIso()).toISOString() }) })}
                      className="rounded-lg bg-[#C8FF35] px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#b8eb28] disabled:opacity-50"
                    >{busy === inst.id ? "Saving…" : "Mark as paid"}</button>
                  </div>
                )}

                <div className="space-y-2.5 border-t border-[#242426] pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Partner shares</p>
                  {obligations.map((o) => {
                    const isPayer = o.partnerId === sch.expense?.paidByPartnerId;
                    const done = o.status === "PAID";
                    return (
                      <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#0B0B0C] px-3.5 py-3">
                        <div className="space-y-0.5">
                          <p className="text-[12px] font-medium text-[#F3F0E9]">{o.partner?.displayName}{isPayer ? " (paying partner)" : ""}</p>
                          <p className="text-[11px] text-gray-400">Share {rupees(o.shareAmountPaise)}{!isPayer && Number(o.amountPaidPaise) > 0 ? ` • received ${rupees(o.amountPaidPaise)}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {isPayer ? <Badge tone="gray">Own share</Badge> : done ? <Badge tone="green">Paid to {payerName}</Badge> : isPaid ? <Badge tone="yellow">Pending payment</Badge> : <Badge tone="gray">Not due yet</Badge>}
                          {!isPayer && !done && isPaid && (
                            <button
                              type="button"
                              disabled={busy === o.id}
                              onClick={() => call(o.id, `/api/admin/finance/emi/obligations/${o.id}/receive`, { method: "POST", body: JSON.stringify({}) })}
                              className="rounded-lg border border-[#C8FF35]/40 px-3 py-1.5 text-[11px] font-semibold text-[#C8FF35] hover:bg-[#C8FF35]/10 disabled:opacity-50"
                            >{busy === o.id ? "Saving…" : "Mark received"}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
