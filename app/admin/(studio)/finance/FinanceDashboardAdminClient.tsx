"use client";

import React, { useEffect, useState } from "react";
import { LayoutDashboard, CreditCard, Clock, Users, ArrowUpRight, ArrowDownRight, RefreshCw, ShieldCheck } from "lucide-react";

export default function FinanceDashboardAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load finance dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-[#F3F0E9]">Partner Finance & Settlement Command</h1>
          <p className="mt-2 text-xs leading-relaxed text-[#B9B9B4]">
            Internal partner ledger, 3-way expense splitting, EMI obligations, and settlement verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Daksh Receivable</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">
            ₹{data?.metrics?.dakshReceivableRupees?.toLocaleString('en-IN') || 0}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Owed by partners for paid expenses</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Total Business Revenue</span>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">
            ₹{data?.metrics?.totalBusinessRevenue?.toLocaleString('en-IN') || 0}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Cumulative paid customer orders</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Business Expenses</span>
          <p className="mt-2 text-2xl font-bold text-yellow-400">
            ₹{data?.metrics?.totalBusinessExpensesRupees?.toLocaleString('en-IN') || 0}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Logged operational & capital costs</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Pending Settlements</span>
          <p className="mt-2 text-2xl font-bold text-blue-400">
            {data?.metrics?.unverifiedSettlementsCount || 0}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Awaiting Daksh / Admin verification</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#242426] bg-[#151515] p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Partner Financial Accounts (3-Way Split)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs text-[#B9B9B4]">
            <thead className="border-b border-[#242426] text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Partner</th>
                <th className="pb-3 pr-4 font-semibold">Ownership Split</th>
                <th className="pb-3 pr-4 font-semibold">Capital Invested</th>
                <th className="pb-3 pr-4 font-semibold">Expenses Paid Personally</th>
                <th className="pb-3 pr-4 font-semibold">Amount Due (Payable)</th>
                <th className="pb-3 pr-4 font-semibold">Amount Receivable</th>
                <th className="pb-3 pr-4 font-semibold">Net Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]">
              {data?.partners?.map((p: any) => (
                <tr key={p.id} className="hover:bg-[#1a1a1d]">
                  <td className="py-3.5 pr-4 font-medium text-[#F3F0E9]">
                    {p.displayName} {p.isPrimarySettlementPartner && <span className="ml-1 text-[11px] text-[#C8FF35]">(Primary Settlement)</span>}
                  </td>
                  <td className="py-3.5 pr-4">{p.ownershipPercentage?.toFixed(2)}%</td>
                  <td className="py-3.5 pr-4">₹{p.capitalContributedRupees?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 pr-4">₹{p.expensesPersonallyPaidRupees?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 pr-4 text-red-400">₹{p.amountPayableRupees?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 pr-4 text-green-400">₹{p.amountReceivableRupees?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 pr-4 font-semibold text-[#F3F0E9]">
                    ₹{p.netSettlementPositionRupees?.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

