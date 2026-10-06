"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import { ManufacturingStatus } from "@/lib/types";
import {
  User,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  Printer,
  Sparkles,
  ArrowRight,
  Search,
} from "lucide-react";

const WORKFLOW_STAGES: ManufacturingStatus[] = [
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

export default function AccountPage() {
  const { orders, siteSettings } = useStore();
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "profile">("orders");
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      <section className="bg-[#151515] border-b border-[#242426] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-[#C8FF35] uppercase tracking-widest block mb-1">
              DAXUL COLLECTOR ACCOUNT
            </span>
            <h1 className="text-3xl font-extrabold uppercase">My Account & Orders</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Order By ID</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Account Dashboard Content */}
      <section className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#242426] text-xs font-bold uppercase tracking-wider space-x-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 transition-colors ${
              activeTab === "orders" ? "text-[#C8FF35] border-b-2 border-[#C8FF35]" : "text-gray-400 hover:text-white"
            }`}
          >
            Order History & Manufacturing Tracker ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`pb-3 transition-colors ${
              activeTab === "addresses" ? "text-[#C8FF35] border-b-2 border-[#C8FF35]" : "text-gray-400 hover:text-white"
            }`}
          >
            Saved Shipping Addresses
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 transition-colors ${
              activeTab === "profile" ? "text-[#C8FF35] border-b-2 border-[#C8FF35]" : "text-gray-400 hover:text-white"
            }`}
          >
            Collector Profile
          </button>
        </div>

        {/* Tab 1: Orders & Manufacturing Tracker */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="text-center py-16 bg-[#151515] border border-[#242426] rounded-2xl space-y-3">
                <Package className="w-12 h-12 text-gray-600 mx-auto" />
                <h3 className="text-base font-bold uppercase">No Orders Placed Yet</h3>
                <p className="text-xs text-gray-400">Your custom 3D prints will appear here with real-time print farm updates.</p>
                <Link
                  href="/shop"
                  className="bg-[#C8FF35] text-[#0B0B0C] px-6 py-2 rounded-full text-xs font-extrabold uppercase inline-block"
                >
                  Explore Objects
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const currentStageIdx = WORKFLOW_STAGES.indexOf(order.status);

                return (
                  <div
                    key={order.id}
                    className="bg-[#151515] border border-[#242426] rounded-2xl p-6 space-y-6 shadow-xl"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#242426] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-white">Order {order.orderNumber}</span>
                          <span className="bg-[#C8FF35]/10 text-[#C8FF35] border border-[#C8FF35]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                            {siteSettings.orderStatusLabels[order.status] || order.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">Placed on {new Date(order.createdAt).toLocaleDateString()}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-white">
                          {siteSettings.currencySymbol}{order.totalAmount}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 uppercase">
                          Payment: {order.paymentMethod.toUpperCase()} ({order.paymentStatus})
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-center bg-[#0B0B0C] p-3 rounded-xl border border-[#242426]">
                          <img src={item.productImage} alt={item.productName} className="w-14 h-14 object-cover rounded-lg bg-[#151515]" />
                          <div className="flex-1 text-xs">
                            <h4 className="font-bold text-white uppercase">{item.productName}</h4>
                            <div className="text-gray-400">Qty: {item.quantity} • Finish: {item.selectedFinish || 'Standard'}</div>
                            {Object.keys(item.customizations).length > 0 && (
                              <div className="text-[10px] text-[#C8FF35] mt-0.5">
                                Custom: {Object.values(item.customizations).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white">
                            {siteSettings.currencySymbol}{item.unitPrice * item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* MANUFACTURING WORKFLOW VISUAL PROGRESS BAR */}
                    <div className="bg-[#0B0B0C] p-5 rounded-xl border border-[#242426] space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-300">
                        <span className="flex items-center gap-1.5">
                          <Printer className="w-4 h-4 text-[#C8FF35]" />
                          <span>Manufacturing Workflow Tracker</span>
                        </span>
                        <span className="text-[#C8FF35] font-mono text-[10px]">
                          Stage {currentStageIdx + 1} of {WORKFLOW_STAGES.length}
                        </span>
                      </div>

                      {/* Step Indicator Nodes */}
                      <div className="grid grid-cols-3 sm:grid-cols-9 gap-1 text-[9px] font-mono uppercase text-center pt-2">
                        {WORKFLOW_STAGES.map((stg, i) => {
                          const isCompleted = i <= currentStageIdx;
                          const isCurrent = i === currentStageIdx;

                          return (
                            <div key={stg} className="space-y-1">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isCurrent
                                    ? "bg-[#C8FF35] shadow-lg shadow-[#C8FF35]/50 animate-pulse"
                                    : isCompleted
                                    ? "bg-[#C8FF35]/70"
                                    : "bg-[#242426]"
                                }`}
                              />
                              <span
                                className={`block truncate ${
                                  isCurrent ? "text-[#C8FF35] font-bold" : isCompleted ? "text-gray-300" : "text-gray-600"
                                }`}
                              >
                                {siteSettings.orderStatusLabels[stg] || stg}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Latest Note / Tracking info */}
                      {order.trackingNumber && (
                        <div className="text-xs bg-[#151515] p-3 rounded-lg border border-[#242426] text-gray-300 flex justify-between items-center">
                          <span>Courier: <strong>{order.courierName || 'BlueDart'}</strong></span>
                          <span>Tracking #: <strong className="text-[#C8FF35] font-mono">{order.trackingNumber}</strong></span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Addresses */}
        {activeTab === "addresses" && (
          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold uppercase text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#C8FF35]" />
              <span>Saved Shipping Address</span>
            </h3>
            <div className="bg-[#0B0B0C] p-4 rounded-xl border border-[#242426] text-xs space-y-1 text-gray-300">
              <div className="font-bold text-white text-sm">Vikram Malhotra</div>
              <div>402 Cyber Heights, HSR Layout Sector 1</div>
              <div>Bangalore, Karnataka — 560102</div>
              <div>Phone: +91 98111 22334</div>
            </div>
          </div>
        )}

        {/* Tab 3: Profile */}
        {activeTab === "profile" && (
          <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4 max-w-lg">
            <h3 className="text-base font-bold uppercase text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#C8FF35]" />
              <span>Collector Details</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Full Name</label>
                <input type="text" defaultValue="Vikram Malhotra" className="w-full bg-[#0B0B0C] border border-[#242426] p-3 rounded-xl text-white" />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Email Address</label>
                <input type="email" defaultValue="vikram@example.com" className="w-full bg-[#0B0B0C] border border-[#242426] p-3 rounded-xl text-white" />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Mobile Number</label>
                <input type="text" defaultValue="+91 98111 22334" className="w-full bg-[#0B0B0C] border border-[#242426] p-3 rounded-xl text-white" />
              </div>
            </div>
          </div>
        )}

      </section>

      <Footer />
    </main>
  );
}
