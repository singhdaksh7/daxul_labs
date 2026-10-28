"use client";

import React, { useState } from "react";
import { RefreshCw, ArrowDownRight, CheckCircle2, Eye, ShoppingCart, CreditCard } from "lucide-react";
import type { FunnelReport } from "@/lib/funnelAnalytics";

interface FunnelDashboardClientProps {
  initialReport: FunnelReport;
}

export default function FunnelDashboardClient({ initialReport }: FunnelDashboardClientProps) {
  const [report, setReport] = useState<FunnelReport>(initialReport);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/analytics/funnel");
      if (res.ok) {
        const data = await res.json();
        if (data.report) setReport(data.report);
      }
    } catch (err) {
      console.error("Failed to refresh funnel metrics:", err);
    } finally {
      setRefreshing(false);
    }
  }

  const maxCount = Math.max(...report.steps.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121214] border border-[#242426] p-4">
          <div className="flex items-center justify-between text-[#888884] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest">Product Views</span>
            <Eye className="w-4 h-4 text-[#C8FF35]" />
          </div>
          <p className="text-2xl font-mono font-bold text-white">
            {report.totalProductViews.toLocaleString()}
          </p>
          <p className="text-[10px] font-mono text-[#666664] mt-1">Deduped 1h sessions</p>
        </div>

        <div className="bg-[#121214] border border-[#242426] p-4">
          <div className="flex items-center justify-between text-[#888884] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest">Cart Intent</span>
            <ShoppingCart className="w-4 h-4 text-[#C8FF35]" />
          </div>
          <p className="text-2xl font-mono font-bold text-white">
            {report.steps.find((s) => s.step === "ADD_TO_CART")?.count.toLocaleString() || 0}
          </p>
          <p className="text-[10px] font-mono text-[#666664] mt-1">Add to Cart events</p>
        </div>

        <div className="bg-[#121214] border border-[#242426] p-4">
          <div className="flex items-center justify-between text-[#888884] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest">Completed Orders</span>
            <CheckCircle2 className="w-4 h-4 text-[#C8FF35]" />
          </div>
          <p className="text-2xl font-mono font-bold text-[#C8FF35]">
            {report.totalOrdersCompleted.toLocaleString()}
          </p>
          <p className="text-[10px] font-mono text-[#666664] mt-1">Idempotent verified orders</p>
        </div>

        <div className="bg-[#121214] border border-[#242426] p-4">
          <div className="flex items-center justify-between text-[#888884] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest">Overall Conversion</span>
            <ArrowDownRight className="w-4 h-4 text-[#C8FF35]" />
          </div>
          <p className="text-2xl font-mono font-bold text-white">
            {report.overallConversionRate}%
          </p>
          <p className="text-[10px] font-mono text-[#666664] mt-1">Purchases ÷ Product Views</p>
        </div>
      </div>

      {/* Main Funnel Visualization */}
      <div className="border border-[#242426] bg-[#121214] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono uppercase tracking-wider text-white">
              Customer Journey Progression
            </h3>
            <p className="text-xs text-[#888884] mt-0.5">
              Live funnel stages with drop-off calculation at each milestone.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#2D2D30] text-xs font-mono text-[#A0A09C] hover:text-white hover:border-[#C8FF35] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-4 pt-2">
          {report.steps.map((step, idx) => {
            const widthPct = Math.max(4, Math.round((step.count / maxCount) * 100));

            return (
              <div key={step.step} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-medium flex items-center gap-2">
                    <span className="w-5 text-[#888884]">{idx + 1}.</span>
                    <span>{step.label}</span>
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-bold">{step.count.toLocaleString()}</span>
                    {idx > 0 && (
                      <span className="text-[11px] text-red-400 font-mono">
                        -{step.dropoffRate}% drop
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-[#1A1A1D] h-7 relative flex items-center overflow-hidden border border-[#242426]">
                  <div
                    className="h-full bg-gradient-to-r from-[#242426] to-[#C8FF35]/70 transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
