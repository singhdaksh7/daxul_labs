"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { Search, Printer, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { ManufacturingStatus } from "@/lib/types";

const STAGES: ManufacturingStatus[] = [
  "new",
  "design_pending",
  "design_approved",
  "printing",
  "finishing",
  "qc",
  "packed",
  "shipped",
  "delivered",
];

export default function TrackOrderPage() {
  const { siteSettings } = useStore();
  const [orderQuery, setOrderQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setErrorMessage(null);
    setFoundOrder(null);

    if (!orderQuery.trim() || !emailQuery.trim()) {
      setErrorMessage("Both Order Number and matching Email or Phone are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderQuery.trim(),
          verificationInput: emailQuery.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFoundOrder(data.order);
      } else {
        setErrorMessage(data.error || "No order found matching provided details.");
      }
    } catch (err) {
      setErrorMessage("Failed to connect to tracking server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#151515] border-b border-[#242426] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35]">
            LIVE PRINT FARM DISPATCH TRACKER
          </span>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">
            Track Order Status
          </h1>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Enter your Order ID (e.g., DX-1001) and registered email or phone to view live 3D printing and finishing progress.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
            <input
              type="text"
              required
              placeholder="ORDER ID (e.g. DX-1001)"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              className="bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="EMAIL OR PHONE"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#C8FF35] text-[#0B0B0C] font-extrabold px-6 py-3 rounded-xl text-xs uppercase hover:bg-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? "Searching..." : "Track Now"}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="flex-1 py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {searched && errorMessage && (
          <div className="text-center py-16 bg-[#151515] border border-[#242426] rounded-2xl space-y-3">
            <div className="text-lg font-bold text-red-400 uppercase">Verification Failed</div>
            <p className="text-xs text-gray-400">{errorMessage}</p>
          </div>
        )}

        {foundOrder && (
          <div className="bg-[#151515] border border-[#C8FF35]/40 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#242426] pb-4 gap-2">
              <div>
                <span className="text-xs font-mono text-[#C8FF35] uppercase block">Order #{foundOrder.orderNumber}</span>
                <h3 className="text-2xl font-extrabold text-white uppercase">{foundOrder.customerName}</h3>
              </div>

              <div className="bg-[#C8FF35] text-[#0B0B0C] font-extrabold text-xs uppercase px-4 py-1.5 rounded-full">
                Stage: {siteSettings.orderStatusLabels[foundOrder.status as ManufacturingStatus] || foundOrder.status}
              </div>
            </div>

            {/* Workflow Step Bar */}
            <div className="bg-[#0B0B0C] p-6 rounded-2xl border border-[#242426] space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
                <span>9-Stage Manufacturing Timeline</span>
                <span className="text-[#C8FF35] font-mono">
                  {STAGES.indexOf(foundOrder.status) + 1} / {STAGES.length}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 text-[9px] font-mono text-center pt-2">
                {STAGES.map((stg, i) => {
                  const currentIdx = STAGES.indexOf(foundOrder.status);
                  const isCompleted = i <= currentIdx;
                  const isCurrent = i === currentIdx;

                  return (
                    <div key={stg} className="space-y-1">
                      <div
                        className={`h-2 rounded-full ${
                          isCurrent
                            ? "bg-[#C8FF35] animate-pulse shadow-lg shadow-[#C8FF35]/50"
                            : isCompleted
                            ? "bg-[#C8FF35]/70"
                            : "bg-[#242426]"
                        }`}
                      />
                      <span className={`block truncate ${isCurrent ? "text-[#C8FF35] font-bold" : "text-gray-400"}`}>
                        {siteSettings.orderStatusLabels[stg] || stg}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QC / Proof Details */}
            {foundOrder.qcNotes && (
              <div className="bg-[#0B0B0C] p-4 rounded-xl border border-[#242426] text-xs space-y-1">
                <span className="text-[#C8FF35] font-bold uppercase block">Lab Print Technician Note:</span>
                <p className="text-gray-300">{foundOrder.qcNotes}</p>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase text-gray-400">Order Items:</div>
              {foundOrder.items.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-[#0B0B0C] p-3 rounded-xl text-xs">
                  <div className="font-bold text-white uppercase">{it.productName} (x{it.quantity})</div>
                  <div className="text-[#C8FF35] font-black">{siteSettings.currencySymbol}{it.unitPrice * it.quantity}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
