"use client";

import React, { useEffect, useState } from "react";
import { Boxes, Plus, AlertTriangle, ShieldCheck, RefreshCw, Disc } from "lucide-react";

export default function MaterialsAdminClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/materials");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch materials:", err);
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
          <h1 className="text-xl font-bold tracking-tight text-[#F3F0E9]">Materials & Filament Spool Ledger</h1>
          <p className="mt-1 text-xs text-[#B9B9B4]">
            Manage workshop inventory, spool weights, real-time consumption, and unit costs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-lg border border-[#242426] bg-[#151515] px-3 py-1.5 text-xs text-[#B9B9B4] hover:text-[#F3F0E9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Raw Materials</span>
          <p className="mt-2 text-2xl font-bold text-[#F3F0E9]">{data?.metrics?.totalMaterials || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">SKUs tracked in inventory</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Filament Spools</span>
          <p className="mt-2 text-2xl font-bold text-[#C8FF35]">{data?.metrics?.totalSpools || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">Active & sealed workshop spools</span>
        </div>
        <div className="rounded-xl border border-[#242426] bg-[#151515] p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B9B4]">Low Stock Items</span>
          <p className="mt-2 text-2xl font-bold text-yellow-400">{data?.metrics?.lowStockCount || 0}</p>
          <span className="text-[11px] text-[#B9B9B4]">At or below reorder threshold</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#242426] bg-[#151515] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3F0E9]">Materials Inventory</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-[#B9B9B4]">
            <thead className="border-b border-[#242426] text-[10px] uppercase text-gray-500">
              <tr>
                <th className="pb-3">Name / SKU</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Available</th>
                <th className="pb-3">Reserved</th>
                <th className="pb-3">Unit Cost</th>
                <th className="pb-3">Reorder Point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]">
              {data?.materials?.map((m: any) => (
                <tr key={m.id} className="hover:bg-[#1a1a1d]">
                  <td className="py-3 font-medium text-[#F3F0E9]">
                    {m.name} <span className="ml-1 text-[10px] text-gray-500">({m.sku})</span>
                  </td>
                  <td className="py-3">{m.category}</td>
                  <td className="py-3 text-[#F3F0E9]">{m.currentQuantity} {m.unit}</td>
                  <td className="py-3">{m.reservedQuantity} {m.unit}</td>
                  <td className="py-3">₹{m.unitCost}</td>
                  <td className="py-3">{m.reorderPoint} {m.unit}</td>
                </tr>
              ))}
              {(!data?.materials || data?.materials.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No raw materials registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

