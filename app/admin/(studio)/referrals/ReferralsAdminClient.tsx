"use client";

import React, { useEffect, useState } from "react";
import { Users, Search, RefreshCw, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";

export default function ReferralsAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchData = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch admin referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Referral Program Desk</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Monitor customer peer referrals, verify order qualifications, and prevent abuse.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              data?.enabled
                ? "bg-[#C8FF35]/10 text-[#C8FF35] border border-[#C8FF35]/30"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${data?.enabled ? "bg-[#C8FF35]" : "bg-red-400"}`} />
            {data?.enabled ? "Program Active" : "Program Disabled"}
          </span>
          <button
            onClick={() => fetchData(query)}
            className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Total Referrals</span>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">{data?.metrics?.totalReferrals || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Invitations clicked & registered</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Rewarded</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">{data?.metrics?.rewardedReferrals || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Converted & rewarded</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Pending</span>
          <p className="mt-2 text-2xl font-bold text-yellow-400">{data?.metrics?.pendingReferrals || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Awaiting qualifying order</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Conversion Rate</span>
          <p className="mt-2 text-2xl font-bold text-blue-400">
            {data?.metrics?.conversionRate ? `${data.metrics.conversionRate.toFixed(1)}%` : "0.0%"}
          </p>
          <span className="text-[11px] text-[#B9B9B4]">Invite-to-purchase ratio</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Referral Activity Stream</h2>
            <p className="text-xs text-[#B9B9B4]">Complete peer audit log with qualifying orders and reward statuses.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email or code..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fetchData(e.target.value);
              }}
              className="w-full rounded-lg border border-[#242426] bg-[#0B0B0C] py-2 pl-9 pr-4 text-xs text-[#F3F0E9] placeholder-gray-500 focus:border-[#C8FF35] focus:outline-none sm:w-64"
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#242426] text-gray-400">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Referrer</th>
                <th className="pb-3 font-medium">Referred Customer</th>
                <th className="pb-3 font-medium">Code</th>
                <th className="pb-3 font-medium">Qualifying Order</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Loading referrals...
                  </td>
                </tr>
              ) : !data?.referrals?.length ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No referrals recorded.
                  </td>
                </tr>
              ) : (
                data.referrals.map((ref: any) => (
                  <tr key={ref.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 text-gray-400">{new Date(ref.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5">
                      <div className="font-medium text-[#F3F0E9]">{ref.referrerUser?.email}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="font-medium text-[#F3F0E9]">{ref.referredUser?.email}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono text-xs text-[#C8FF35]">{ref.code?.code}</span>
                    </td>
                    <td className="py-3.5 text-gray-300">
                      {ref.qualifyingOrder ? (
                        <span>
                          #{ref.qualifyingOrder.orderNumber} (₹{ref.qualifyingOrder.totalAmount})
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          ref.status === "REWARDED"
                            ? "bg-[#C8FF35]/10 text-[#C8FF35] border border-[#C8FF35]/20"
                            : ref.status === "PENDING"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {ref.status}
                      </span>
                    </td>
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

