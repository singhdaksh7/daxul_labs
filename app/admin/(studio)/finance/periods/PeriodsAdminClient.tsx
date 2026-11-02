"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Plus, Lock, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

export default function PeriodsAdminClient() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/periods");
      if (res.ok) {
        const d = await res.json();
        setPeriods(d.periods || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/finance/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create period");

      setSuccess(`Period "${d.period.name}" initialized.`);
      setName("");
      fetchPeriods();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLockPeriod = async (periodId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/finance/periods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to lock period");

      setSuccess(`Period locked and profits distributed.`);
      fetchPeriods();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8" id="periods-view">
      <div className="border-b border-[#242426] pb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Profit Accounting & Period Management</h1>
        <p className="mt-1 text-xs text-[#B9B9B4]">
          Formal closing periods (OPEN → REVIEW → LOCKED). Net profit snapshotting and immutable historical distribution.
        </p>
      </div>

      {error && (
        <div id="period-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="period-success" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Periods List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#C8FF35]" />
              Accounting Periods ({periods.length})
            </h2>
            <div className="mt-4 space-y-4" id="periods-list">
              {periods.map((p) => (
                <div key={p.id} className="rounded-lg border border-[#242426] bg-[#0B0B0C] p-4 text-xs period-card" data-period-id={p.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[#F3F0E9] text-sm">{p.name}</h3>
                      <p className="text-[11px] text-gray-400">
                        {new Date(p.startDate).toLocaleDateString()} to {new Date(p.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.status === "LOCKED" || p.status === "DISTRIBUTED"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#242426] pt-3 text-[11px]">
                    <div>
                      <span className="text-gray-500">Revenue:</span>
                      <p className="font-medium text-[#F3F0E9]">₹{(Number(p.grossRevenuePaise) / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Expenses:</span>
                      <p className="font-medium text-[#F3F0E9]">₹{(Number(p.totalExpensesPaise) / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Net Distributable:</span>
                      <p className="font-medium text-[#C8FF35]">₹{(Number(p.distributableProfitPaise) / 100).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {p.allocations?.length > 0 && (
                    <div className="mt-4 border-t border-[#242426] pt-3">
                      <span className="text-[10px] font-semibold uppercase text-gray-500">Partner Profit Distributions</span>
                      <div className="mt-2 space-y-1">
                        {p.allocations.map((a: any) => (
                          <div key={a.id} className="flex justify-between text-[11px] text-gray-400">
                            <span>{a.partner?.displayName} ({a.profitSplitPercentage}%):</span>
                            <span className="text-[#C8FF35] font-semibold">₹{(Number(a.allocatedAmountPaise) / 100).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.status === "OPEN" && (
                    <div className="mt-4 border-t border-[#242426] pt-3 flex justify-end">
                      <button
                        id={`lock-period-btn-${p.id}`}
                        onClick={() => handleLockPeriod(p.id)}
                        className="flex items-center gap-1.5 rounded bg-[#C8FF35] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#b8eb28]"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Lock Period & Distribute Profit
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {periods.length === 0 && !loading && (
                <p className="py-6 text-center text-xs text-gray-500">No accounting periods created yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Create Period Form */}
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#C8FF35]" />
            Initialize Accounting Period
          </h2>
          <form onSubmit={handleCreatePeriod} className="mt-4 space-y-4" id="period-form">
            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Period Name</label>
              <input
                id="period-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. November 2026 Closing"
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">Start Date</label>
              <input
                id="period-start-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#B9B9B4]">End Date</label>
              <input
                id="period-end-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#242426] bg-[#0B0B0C] px-3 py-2 text-xs text-[#F3F0E9] focus:border-[#C8FF35] focus:outline-none"
              />
            </div>

            <button
              id="submit-period-btn"
              type="submit"
              className="mt-4 w-full rounded-lg bg-[#C8FF35] py-2 text-xs font-semibold text-black hover:bg-[#b8eb28]"
            >
              Open Period
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

