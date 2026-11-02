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

      {/* EMI Status Filters / Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5" id="emi-metrics">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-4">
          <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">Upcoming</span>
          <p className="mt-1 text-lg font-bold text-gray-300">
            {schedules.reduce((acc, s) => acc + (s.installments?.filter((i: any) => i.status === "PENDING").length || 0), 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-4">
          <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">Due</span>
          <p className="mt-1 text-lg font-bold text-yellow-400">
            {schedules.reduce((acc, s) => acc + (s.installments?.filter((i: any) => i.status === "DUE").length || 0), 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-4">
          <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">Overdue</span>
          <p className="mt-1 text-lg font-bold text-red-400">0</p>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-4">
          <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">Partial</span>
          <p className="mt-1 text-lg font-bold text-blue-400">0</p>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-4">
          <span className="text-[10px] font-semibold uppercase text-[#B9B9B4]">Paid</span>
          <p className="mt-1 text-lg font-bold text-[#C8FF35]">
            {schedules.reduce((acc, s) => acc + (s.installments?.filter((i: any) => i.status === "PAID").length || 0), 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Schedules Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C8FF35]" />
              Active EMI Schedules ({schedules.length})
            </h2>
            <div className="mt-4 space-y-4" id="emi-schedules-list">
              {schedules.map((sch) => (
                <div key={sch.id} className="rounded-lg border border-[#242426] bg-[#0B0B0C] p-4 text-xs emi-schedule-card" data-schedule-id={sch.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[#F3F0E9] text-sm">{sch.expense?.title}</h3>
                      <p className="text-[11px] text-gray-400">
                        Financed by: <span className="text-[#C8FF35]">{sch.expense?.paidByPartner?.displayName}</span> • {sch.totalEmiCount} Months
                      </p>
                    </div>
                    <span className="font-bold text-base text-[#F3F0E9]">
                      ₹{(Number(sch.purchasePricePaise) / 100).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#242426] pt-3 text-[11px]">
                    <div>
                      <span className="text-gray-500">Down Payment:</span>
                      <p className="font-medium text-[#F3F0E9]">₹{(Number(sch.downPaymentPaise) / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Financed:</span>
                      <p className="font-medium text-[#F3F0E9]">₹{(Number(sch.financedAmountPaise) / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Monthly EMI:</span>
                      <p className="font-medium text-[#C8FF35]">₹{(Math.round(Number(sch.financedAmountPaise) / Math.max(1, Number(sch.totalEmiCount)) ) / 100).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Installments table snippet */}
                  <div className="mt-4 border-t border-[#242426] pt-3">
                    <span className="text-[10px] font-semibold uppercase text-gray-500">Installments ({sch.installments?.length || 0})</span>
                    <div className="mt-2 space-y-1">
                      {sch.installments?.slice(0, 3).map((inst: any) => (
                        <div key={inst.id} className="flex justify-between text-[11px] text-gray-400">
                          <span>Month {inst.installmentNumber} (Due: {new Date(inst.dueDate).toLocaleDateString()})</span>
                          <span className="text-white font-medium">₹{(Number(inst.amountPaise) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
