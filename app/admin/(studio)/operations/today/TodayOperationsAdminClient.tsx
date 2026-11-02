"use client";

import React, { useEffect, useState } from "react";
import { LayoutDashboard, AlertCircle, Clock, Factory, CheckCircle2, PackageCheck } from "lucide-react";

export default function TodayOperationsAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/operations/today")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Error loading today operations:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Today's Operations Command</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Action-oriented shopfloor overview: active prints, packing bottlenecks, and operational alerts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Active Fleet</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">
            {data?.capacity?.printers?.busy || 0} / {data?.capacity?.printers?.total || 0}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">{data?.capacity?.printers?.utilizationPercent || 0}% Fleet Utilization</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Queued Print Hours</span>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">
            {data?.capacity?.workload?.totalQueuedHours || 0}h
          </p>
          <span className="text-[11px] text-[#B9B9B4]">{data?.capacity?.workload?.queuedJobsCount || 0} jobs awaiting printing</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Ready to Pack</span>
          <p className="mt-2 text-2xl font-bold text-blue-400">
            {data?.readyToPackOrders?.length || 0}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Passed QC, awaiting dispatch</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Critical Alerts</span>
          <p className="mt-2 text-2xl font-bold text-red-400">
            {data?.criticalAlertsCount || 0}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Immediate shopfloor actions</span>
        </div>
      </div>
    </div>
  );
}

