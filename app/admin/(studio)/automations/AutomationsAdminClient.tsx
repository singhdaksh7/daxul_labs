"use client";

import React, { useEffect, useState } from "react";
import { Zap, Play, RefreshCw, Mail, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function AutomationsAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningWorker, setRunningWorker] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/automations");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load automations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunWorker = async () => {
    setRunningWorker(true);
    try {
      const res = await fetch("/api/admin/automations", { method: "POST" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to execute worker:", err);
    } finally {
      setRunningWorker(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Lifecycle Automations & Queue</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Scheduled event triggers, review invitations, winback campaigns, and asynchronous idempotent delivery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunWorker}
            disabled={runningWorker}
            className="flex items-center gap-1.5 rounded-lg bg-[#C8FF35] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#b8eb2d] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {runningWorker ? "Processing Queue..." : "Run Queue Worker Now"}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Triggers grid */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Lifecycle Triggers</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { key: "WELCOME", label: "Welcome Series", channel: "Email", desc: "Sent when customer signs up" },
            { key: "ABANDONED_CHECKOUT", label: "Cart Abandonment", channel: "Email", desc: "Recovery after 2-4 hours inactivity" },
            { key: "ORDER_FOLLOWUP", label: "Order Follow-up", channel: "Email", desc: "Delivery confirmation & care guide" },
            { key: "REVIEW_REQUEST", label: "Review Request", channel: "Email", desc: "Sent 5 days post-delivery" },
            { key: "BACK_IN_STOCK", label: "Back in Stock", channel: "Email / WA", desc: "Automated trigger on 0 -> positive stock" },
            { key: "WINBACK", label: "Win-Back Inactive", channel: "Email", desc: "Re-engage customers dormant > 60 days" },
          ].map((t) => (
            <div key={t.key} className="rounded-lg border border-[#242426] bg-[#0B0B0C] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#C8FF35]">{t.channel}</span>
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gray-400">
                  Idempotent
                </span>
              </div>
              <h4 className="mt-2 text-sm font-bold text-[#F3F0E9]">{t.label}</h4>
              <p className="mt-1 text-xs text-gray-400">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Queue Job Table */}
      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Recent Queue Jobs</h2>
        <p className="mt-0.5 text-xs text-[#B9B9B4]">Asynchronous scheduled jobs with retry status and idempotency tokens.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#242426] text-gray-400">
                <th className="pb-3 font-medium">Scheduled</th>
                <th className="pb-3 font-medium">Channel</th>
                <th className="pb-3 font-medium">Recipient</th>
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]/60">
              {!data?.recentJobs?.length ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No notification jobs currently queued.
                  </td>
                </tr>
              ) : (
                data.recentJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-gray-400">{new Date(job.scheduledFor).toLocaleString()}</td>
                    <td className="py-3 font-mono uppercase text-gray-300">{job.channel}</td>
                    <td className="py-3 text-[#F3F0E9]">{job.recipient}</td>
                    <td className="py-3 text-gray-300">{job.subject || "Lifecycle Notice"}</td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          job.status === "SENT"
                            ? "bg-[#C8FF35]/10 text-[#C8FF35]"
                            : job.status === "PENDING"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{job.attempts} / {job.maxAttempts}</td>
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

