"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search } from "lucide-react";

const ORDER_STAGES = [
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

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Order Placed",
  design_pending: "Design In Progress",
  design_approved: "Design Approved",
  printing: "3D Slicing & Printing",
  finishing: "Hand Finishing",
  qc: "Quality Control",
  packed: "Packed for Dispatch",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface TrackedOrder {
  orderNumber: string;
  status: string;
  createdAt: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDispatchDays?: number;
  statusHistory: { status: string; timestamp: string }[];
  items: { name: string; quantity: number; selections: { label?: string; value: string }[] }[];
}

export default function TrackOrderPage() {
  const [orderQuery, setOrderQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundOrder, setFoundOrder] = useState<TrackedOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setErrorMessage(null);
    setFoundOrder(null);
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
      if (!res.ok) {
        setErrorMessage(data.error || "Order not found. Please double check your order number and contact information.");
        return;
      }
      setFoundOrder(data.order);
    } catch {
      setErrorMessage("Could not connect to tracking server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cancelled = foundOrder?.status === "cancelled";
  const currentIdx = foundOrder ? ORDER_STAGES.indexOf(foundOrder.status) : -1;
  const hasTrackingUrl = !!foundOrder?.trackingUrl && /^https?:\/\//i.test(foundOrder.trackingUrl);

  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      <section className="py-14 sm:py-20 border-b border-daxul-black/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#71717A] block">
            Order Status
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-daxul-black">Track Your Order</h1>
          <p className="text-sm text-[#555550] max-w-lg mx-auto">
            Enter your order number and the email or phone you used at checkout to view production and delivery progress.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4">
            <input
              type="text"
              required
              placeholder="ORDER NUMBER"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              className="bg-white border border-daxul-black/15 focus:border-daxul-black rounded-lg px-4 py-3 text-xs text-daxul-black uppercase focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="EMAIL OR PHONE"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="bg-white border border-daxul-black/15 focus:border-daxul-black rounded-lg px-4 py-3 text-xs text-daxul-black uppercase focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-bold px-6 py-3 rounded-lg text-xs uppercase border border-daxul-black transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? "Searching..." : "Track Now"}</span>
            </button>
          </form>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {searched && errorMessage && (
          <div className="text-center py-16 bg-white border border-daxul-black/10 rounded-xl space-y-2">
            <div className="text-base font-bold text-red-600 uppercase">Order Not Found</div>
            <p className="text-xs text-[#71717A] max-w-md mx-auto">{errorMessage}</p>
          </div>
        )}

        {foundOrder && (
          <div className="bg-white border border-daxul-black/10 p-6 sm:p-8 rounded-xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-daxul-black/10 pb-4 gap-2">
              <div>
                <span className="text-xs font-mono text-[#71717A] uppercase block">Order #{foundOrder.orderNumber}</span>
                <h3 className="text-sm text-[#555550]">
                  Placed {new Date(foundOrder.createdAt).toLocaleDateString("en-IN")}
                </h3>
              </div>
              <div className="bg-[#EAE5DA] text-daxul-black font-bold text-xs uppercase px-4 py-1.5 rounded-full border border-daxul-black/10">
                Stage: {ORDER_STATUS_LABELS[foundOrder.status] || foundOrder.status}
              </div>
            </div>

            {/* Progress */}
            {!cancelled && (
              <div className="bg-[#F3F0E9] p-5 rounded-lg border border-daxul-black/10 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-daxul-black flex items-center justify-between">
                  <span>Manufacturing & Dispatch Progress</span>
                  <span className="font-mono text-xs text-[#71717A]">
                    {currentIdx + 1} / {ORDER_STAGES.length}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 text-[9px] font-mono text-center pt-2">
                  {ORDER_STAGES.map((stg, i) => {
                    const isCompleted = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={stg} className="space-y-1">
                        <div
                          className={`h-2 rounded-full ${
                            isCurrent
                              ? "bg-daxul-black"
                              : isCompleted
                              ? "bg-daxul-black/60"
                              : "bg-daxul-black/10"
                          }`}
                        />
                        <span className={`block truncate ${isCurrent ? "text-daxul-black font-bold" : "text-[#71717A]"}`}>
                          {ORDER_STATUS_LABELS[stg]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Courier */}
            {(foundOrder.courierName || foundOrder.trackingNumber) && (
              <div className="bg-[#F3F0E9] p-4 rounded-lg border border-daxul-black/10 text-xs flex flex-col sm:flex-row sm:justify-between gap-2">
                {foundOrder.courierName && (
                  <span>
                    Courier: <strong className="text-daxul-black">{foundOrder.courierName}</strong>
                  </span>
                )}
                {foundOrder.trackingNumber && (
                  <span>
                    Tracking #: <strong className="text-daxul-black font-mono">{foundOrder.trackingNumber}</strong>
                  </span>
                )}
                {hasTrackingUrl && (
                  <a
                    href={foundOrder.trackingUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-daxul-black underline font-semibold"
                  >
                    Track with courier
                  </a>
                )}
              </div>
            )}

            {/* Items */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase text-[#71717A]">Order Items:</div>
              {foundOrder.items.map((it, idx) => (
                <div key={idx} className="bg-[#F3F0E9] p-3 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-daxul-black uppercase">
                    {it.name} (x{it.quantity})
                  </div>
                  {it.selections.length > 0 && (
                    <div className="text-[#71717A]">
                      {it.selections.map((s) => (s.label ? `${s.label}: ${s.value}` : s.value)).join(" • ")}
                    </div>
                  )}
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
