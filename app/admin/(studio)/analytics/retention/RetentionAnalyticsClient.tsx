"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Users, RefreshCw, Repeat, DollarSign, Award, CreditCard, Coins, Calendar } from "lucide-react";

export default function RetentionAnalyticsClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/retention");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch retention analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const kpis = data?.kpis || {};
  const ledger = data?.ledgerMetrics || {};
  const cohorts = data?.cohorts || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Retention & Cohort Analytics</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Evaluated on real commerce orders, repeat velocity, and customer lifetime value.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Repeat Purchase Rate</span>
            <Repeat className="h-4 w-4 text-[#C8FF35]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">{kpis.repeatPurchaseRate ?? 0}%</p>
          <span className="text-[11px] text-[#B9B9B4]">{kpis.repeatCustomersCount ?? 0} repeat customers</span>
        </div>

        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Average LTV</span>
            <DollarSign className="h-4 w-4 text-[#F3F0E9]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">₹{kpis.averageLTV?.toLocaleString() ?? 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">{kpis.averageOrdersPerCustomer ?? 0} orders / buyer</span>
        </div>

        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Days to 2nd Order</span>
            <Calendar className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-400">{kpis.averageDaysToSecondOrder ?? 0} days</p>
          <span className="text-[11px] text-[#B9B9B4]">Average re-order interval</span>
        </div>

        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Repeat Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">₹{kpis.revenueFromRepeatCustomers?.toLocaleString() ?? 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Out of ₹{kpis.totalPaidRevenue?.toLocaleString() ?? 0} total</span>
        </div>
      </div>

      {/* Program Ledger Liabilities */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Loyalty Points Balance</span>
            <Award className="h-4 w-4 text-[#C8FF35]" />
          </div>
          <p className="mt-2 text-xl font-bold text-[#F3F0E9]">
            {ledger.loyaltyPointsOutstanding?.toLocaleString() ?? 0} pts
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            Earned: {ledger.loyaltyPointsEarned?.toLocaleString() ?? 0} | Redeemed: {ledger.loyaltyPointsRedeemed?.toLocaleString() ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Gift Card Outstanding</span>
            <CreditCard className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-xl font-bold text-[#F3F0E9]">
            ₹{ledger.giftCardOutstandingLiability?.toLocaleString() ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            Total sales: ₹{ledger.giftCardSales?.toLocaleString() ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Store Credit Liability</span>
            <Coins className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="mt-2 text-xl font-bold text-[#F3F0E9]">
            ₹{ledger.storeCreditOutstandingLiability?.toLocaleString() ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            Referral Conv. Rate: {ledger.referralConversionRate ?? 0}%
          </p>
        </div>
      </div>

      {/* Cohort Retention Table */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Monthly Customer Cohorts</h2>
        <p className="mt-0.5 text-xs text-[#B9B9B4]">Tracking customer repeat order progression across 30, 60, and 90-day cycles.</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#242426] text-gray-400">
                <th className="pb-3 font-medium">Cohort</th>
                <th className="pb-3 font-medium">Acquired</th>
                <th className="pb-3 font-medium">Month 0</th>
                <th className="pb-3 font-medium">Month 1</th>
                <th className="pb-3 font-medium">Month 2</th>
                <th className="pb-3 font-medium">Month 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]/60">
              {cohorts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No cohort history recorded yet.
                  </td>
                </tr>
              ) : (
                cohorts.map((c: any) => (
                  <tr key={c.cohort} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono font-medium text-[#F3F0E9]">{c.cohort}</td>
                    <td className="py-3 text-gray-300">{c.cohortSize} customers</td>
                    <td className="py-3 text-gray-400">100%</td>
                    <td className="py-3 font-semibold text-[#C8FF35]">{c.month1Rate.toFixed(1)}%</td>
                    <td className="py-3 font-semibold text-blue-400">{c.month2Rate.toFixed(1)}%</td>
                    <td className="py-3 font-semibold text-purple-400">{c.month3Rate.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

