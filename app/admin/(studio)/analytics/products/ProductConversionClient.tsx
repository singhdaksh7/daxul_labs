"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, RefreshCw, ExternalLink } from "lucide-react";
import type { ProductConversionSummary } from "@/lib/funnelAnalytics";

interface ProductConversionClientProps {
  initialProducts: ProductConversionSummary[];
}

export default function ProductConversionClient({ initialProducts }: ProductConversionClientProps) {
  const [products, setProducts] = useState<ProductConversionSummary[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"views" | "addToCart" | "orders" | "revenue" | "conversionRate">("views");
  const [sortAsc, setSortAsc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/analytics/conversion");
      if (res.ok) {
        const data = await res.json();
        if (data.products) setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to refresh product conversion metrics:", err);
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = products
    .filter((p) => {
      const term = searchTerm.toLowerCase();
      return (
        p.productName.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (sortAsc) return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#121214] border border-[#242426] pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#5A5A58] focus:border-[#C8FF35] focus:outline-none"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#2D2D30] text-xs font-mono text-[#A0A09C] hover:text-white hover:border-[#C8FF35] transition-colors self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Table */}
      <div className="border border-[#242426] bg-[#121214] overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#18181A] text-[#888884] uppercase tracking-wider text-[11px] border-b border-[#242426]">
            <tr>
              <th className="py-3 px-4">Object / SKU</th>
              <th
                onClick={() => toggleSort("views")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Views</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("addToCart")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>ATC</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Checkout Starts</th>
              <th className="py-3 px-4">Units Sold</th>
              <th
                onClick={() => toggleSort("orders")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Orders</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("revenue")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Revenue</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("conversionRate")}
                className="py-3 px-4 cursor-pointer hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Conv. %</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242426]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#666664]">
                  No products matched search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.productId} className="hover:bg-[#18181B] transition-colors">
                  <td className="py-3.5 px-4 font-sans font-medium text-white">
                    <div>
                      <Link
                        href={`/shop/${p.productId}`}
                        target="_blank"
                        className="hover:text-[#C8FF35] inline-flex items-center gap-1"
                      >
                        <span>{p.productName}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </div>
                    {p.sku && <p className="text-[10px] font-mono text-[#71717A] mt-0.5">{p.sku}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-[#C8C8C4]">{p.views.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-[#C8C8C4]">{p.addToCart.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-[#C8C8C4]">{p.checkoutStarts.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-[#C8C8C4]">{p.unitsSold.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-white font-bold">{p.orders.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-[#C8FF35] font-bold">
                    ₹{p.revenue.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-bold px-2 py-0.5 text-[11px] ${
                        p.conversionRate >= 3
                          ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                          : p.conversionRate > 0
                          ? "bg-zinc-800 border border-zinc-700 text-zinc-300"
                          : "text-[#666664]"
                      }`}
                    >
                      {p.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] font-mono text-[#71717A]">
        * Conversion % is strictly calculated as: <code>(Paid Orders ÷ Deduped Product Views) × 100</code>. If product views are 0, conversion is 0%.
      </p>
    </div>
  );
}
