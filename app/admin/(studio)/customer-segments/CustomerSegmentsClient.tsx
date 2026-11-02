"use client";

import React, { useEffect, useState } from "react";
import { Users2, Plus, Search, RefreshCw, Filter, CheckCircle2 } from "lucide-react";

export default function CustomerSegmentsClient() {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customer-segments");
      if (res.ok) {
        const json = await res.json();
        setSegments(json.segments || []);
      }
    } catch (err) {
      console.error("Failed to load segments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242426] pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Behavioral Customer Segments</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Dynamic queries evaluated against real commerce purchase behavior, AOV, and re-order recency.
          </p>
        </div>
        <button
          onClick={fetchSegments}
          className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Counts
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-gray-500">
            Calculating dynamic customer segment counts...
          </div>
        ) : segments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-gray-500">
            No customer segments configured.
          </div>
        ) : (
          segments.map((seg) => (
            <div
              key={seg.id}
              className="flex flex-col justify-between rounded-xl border border-[#242426] bg-[#151515] p-5 transition hover:border-[#C8FF35]/30"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#C8FF35]">
                    {seg.slug}
                  </span>
                  <span className="rounded bg-[#242426] px-2 py-0.5 text-[10px] font-semibold text-gray-300">
                    Dynamic
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-[#F3F0E9]">{seg.name}</h3>
                <p className="mt-1 text-xs text-[#B9B9B4]">{seg.description || "Commerce behavioral segment"}</p>

                <div className="mt-4 space-y-1.5 rounded-lg bg-[#0B0B0C] p-3 text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-gray-400">Rules Applied:</span>
                  {Array.isArray(seg.rules) &&
                    seg.rules.map((r: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 font-mono text-gray-300">
                        <span className="h-1 w-1 rounded-full bg-[#C8FF35]" />
                        <span>{r.field}</span>
                        <span className="text-[#C8FF35]">{r.operator}</span>
                        <span>{String(r.value)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="mt-6 border-t border-[#242426] pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">Matching Customers</span>
                <span className="text-xl font-bold text-[#F3F0E9]">
                  {seg.matchingCustomerCount ?? 0}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

