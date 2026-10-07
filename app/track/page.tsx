"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search } from "lucide-react";
import type { ManufacturingStatus } from "@/lib/types";
import { ORDER_STAGES, ORDER_STATUS_LABELS } from "@/lib/orderStatus";

interface TrackedOrder {
  orderNumber: string;
  status: ManufacturingStatus;
  createdAt: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: { name: string; quantity: number; selections: { label: string; value: string }[] }[];
  statusHistory: { status: ManufacturingStatus; timestamp: string }[];
}

export default function TrackOrderPage() {
  const [orderQuery, setOrderQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState<TrackedOrder | null>(null);
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
        body: JSON.stringify({ orderNumber: orderQuery.trim(), verificationInput: emailQuery.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setFoundOrder(data.order as TrackedOrder);
      } else {
        setErrorMessage(data.error || "No order found matching provided details.");
      }
    } catch {
      setErrorMessage("Failed to connect to tracking server.");
    } finally {
      setLoading(false);
    }
  };

  const cancelled = foundOrder?.status === "cancelled";
  const currentIdx = foundOrder ? ORDER_STAGES.indexOf(foundOrder.status) : -1;
  const hasTrackingUrl = !!foundOrder?.trackingUrl && /^https?:\/\//i.test(foundOrder.trackingUrl);

  return (
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />

      <section className="bg-daxul-dark border-b border-daxul-graphite py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-daxul-lime">
            LIVE PRINT FARM DISPATCH TRACKER
          </span>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">Track Order Status</h1>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Enter your order number and the email or phone you used at checkout to view live 3D printing and finishing progress.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
            <input
              type="text"
              required
              placeholder="ORDER NUMBER"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              className="bg-daxul-black border border-daxul-graphite focus:border-daxul-lime rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="EMAIL OR PHONE"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="bg-daxul-black border border-daxul-graphite focus:border-daxul-lime rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-daxul-lime text-daxul-black font-extrabold px-6 py-3 rounded-xl text-xs uppercase hover:bg-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? "Searching..." : "Track Now"}</span>
            </button>
          </form>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {searched && errorMessage && (
          <div className="text-center py-16 bg-daxul-dark border border-daxul-graphite rounded-2xl space-y-3">
            <div className="text-lg font-bold text-red-400 uppercase">Order Not Found</div>
            <p className="text-xs text-gray-400 max-w-md mx-auto">{errorMessage}</p>
          </div>
        )}

        {foundOrder && (
          <div className="bg-daxul-dark border border-daxul-lime/40 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-daxul-graphite pb-4 gap-2">
              <div>
                <span className="text-xs font-mono text-daxul-lime uppercase block">Order #{foundOrder.orderNumber}</span>
                <h3 className="text-sm text-gray-400">
                  Placed {new Date(foundOrder.createdAt).toLocaleDateString("en-IN")}
                </h3>
              </div>
              <div className="bg-daxul-lime text-daxul-black font-extrabold text-xs uppercase px-4 py-1.5 rounded-full">
                Stage: {ORDER_STATUS_LABELS[foundOrder.status] || foundOrder.status}
              </div>
            </div>

            {/* Progress */}
            {!cancelled && (
              <div className="bg-daxul-black p-6 rounded-2xl border border-daxul-graphite space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  <span>{ORDER_STAGES.length}-Stage Manufacturing Timeline</span>
                  <span className="text-daxul-lime font-mono">
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
                              ? "bg-daxul-lime animate-pulse shadow-lg shadow-daxul-lime/50"
                              : isCompleted
                              ? "bg-daxul-lime/70"
                              : "bg-daxul-graphite"
                          }`}
                        />
                        <span className={`block truncate ${isCurrent ? "text-daxul-lime font-bold" : "text-gray-400"}`}>
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
              <div className="bg-daxul-black p-4 rounded-xl border border-daxul-graphite text-xs flex flex-col sm:flex-row sm:justify-between gap-2">
                {foundOrder.courierName && (
                  <span>
                    Courier: <strong className="text-white">{foundOrder.courierName}</strong>
                  </span>
                )}
                {foundOrder.trackingNumber && (
                  <span>
                    Tracking #: <strong className="text-daxul-lime font-mono">{foundOrder.trackingNumber}</strong>
                  </span>
                )}
                {hasTrackingUrl && (
                  <a
                    href={foundOrder.trackingUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-daxul-lime underline"
                  >
                    Track with courier
                  </a>
                )}
              </div>
            )}

            {/* Timeline */}
            {foundOrder.statusHistory.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-gray-400">Status History:</div>
                <ol className="space-y-2">
                  {foundOrder.statusHistory.map((h, idx) => (
                    <li key={idx} className="flex justify-between bg-daxul-black p-3 rounded-xl text-xs">
                      <span className="font-bold text-white uppercase">{ORDER_STATUS_LABELS[h.status] || h.status}</span>
                      <span className="text-gray-400 font-mono">
                        {new Date(h.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase text-gray-400">Order Items:</div>
              {foundOrder.items.map((it, idx) => (
                <div key={idx} className="bg-daxul-black p-3 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-white uppercase">
                    {it.name} (x{it.quantity})
                  </div>
                  {it.selections.length > 0 && (
                    <div className="text-gray-400">
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
