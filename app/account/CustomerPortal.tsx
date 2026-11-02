"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/storeContext";
import {
  Package,
  Clock,
  Sparkles,
  MapPin,
  Heart,
  User as UserIcon,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  ShoppingBag,
  Award,
  Share2,
  Coins,
  Gift,
  Settings,
  Copy,
} from "lucide-react";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  selectedFinish?: string | null;
  selectedColor?: string | null;
  selectedSize?: string | null;
  customizations?: Record<string, string> | null;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  proofImageUrl?: string | null;
  designStatus: string;
  designNotes?: string | null;
  designFeedback?: string | null;
  cancellationRequested?: boolean;
  refundStatus?: string | null;
  refundedAmount?: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: OrderItem[];
  statusHistory: { status: string; timestamp: string; note?: string | null }[];
}

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
}

export default function CustomerPortal({ user }: { user: { id?: string; name?: string | null; email?: string | null } }) {
  const [activeTab, setActiveTab] = useState<
    "orders" | "custom" | "addresses" | "wishlist" | "profile" | "rewards" | "referrals" | "storeCredit" | "giftCards" | "preferences"
  >("orders");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [rewardsData, setRewardsData] = useState<any>(null);
  const [referralsData, setReferralsData] = useState<any>(null);
  const [storeCreditData, setStoreCreditData] = useState<any>(null);
  const [preferencesData, setPreferencesData] = useState<any>({
    emailTransactional: true,
    emailMarketing: true,
    whatsappTransactional: true,
    whatsappMarketing: false,
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [giftCardBalanceCheckCode, setGiftCardBalanceCheckCode] = useState("");
  const [giftCardCheckResult, setGiftCardCheckResult] = useState<any>(null);
  const [checkingGiftCard, setCheckingGiftCard] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    name: user.name || "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  const [cancelModalOrder, setCancelModalOrder] = useState<CustomerOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({});

  const { addToCart } = useCart();

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, profileRes, wishlistRes, rewardsRes, referralsRes, storeCreditRes, prefsRes] = await Promise.all([
        fetch("/api/account/orders"),
        fetch("/api/account/profile"),
        fetch("/api/account/wishlist"),
        fetch("/api/account/rewards"),
        fetch("/api/account/referrals"),
        fetch("/api/account/store-credit"),
        fetch("/api/account/preferences"),
      ]);

      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.orders || []);
      }
      if (profileRes.ok) {
        const d = await profileRes.json();
        setAddresses(d.user?.addresses || []);
      }
      if (wishlistRes.ok) {
        const d = await wishlistRes.json();
        setWishlist(d.wishlist || []);
      }
      if (rewardsRes.ok) {
        const d = await rewardsRes.json();
        setRewardsData(d);
      }
      if (referralsRes.ok) {
        const d = await referralsRes.json();
        setReferralsData(d);
      }
      if (storeCreditRes.ok) {
        const d = await storeCreditRes.json();
        setStoreCreditData(d);
      }
      if (prefsRes.ok) {
        const d = await prefsRes.json();
        if (d.preferences) setPreferencesData(d.preferences);
      }
    } catch (e) {
      console.error("Error loading account data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddr),
      });
      if (res.ok) {
        setShowAddressModal(false);
        setNewAddr({ name: user.name || "", phone: "", street: "", city: "", state: "", pincode: "", isDefault: false });
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add address");
      }
    } catch {
      alert("Network error");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await fetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch {
      alert("Error deleting address");
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch("/api/account/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
      if (res.ok) loadData();
    } catch {
      alert("Error setting default address");
    }
  };

  const handleApproveDesign = async (orderNumber: string) => {
    if (!confirm("Approve this 3D design proof for manufacturing? Once approved, 3D printing will proceed.")) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "approve_design" }),
      });
      if (res.ok) {
        alert("Design approved! Your custom order has moved to production.");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Approval failed");
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestRevisions = async (orderNumber: string) => {
    const feedback = revisionNotes[orderNumber]?.trim();
    if (!feedback) {
      alert("Please enter revision details before submitting.");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "request_design_changes", feedback }),
      });
      if (res.ok) {
        alert("Revision request submitted. Our studio will update your model proof.");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Submission failed");
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestCancel = async () => {
    if (!cancelModalOrder || !cancelReason.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/orders/${cancelModalOrder.orderNumber}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "cancel_request", reason: cancelReason }),
      });
      if (res.ok) {
        const d = await res.json();
        alert(d.message || "Cancellation processed");
        setCancelModalOrder(null);
        setCancelReason("");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Cancellation failed");
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReorder = (order: CustomerOrder) => {
    for (const item of order.items) {
      addToCart({
        productId: item.productId,
        slug: item.productId,
        name: item.productName,
        image: item.productImage,
        quantity: item.quantity,
        basePrice: item.unitPrice,
        variantSelections: [],
        customizations: item.customizations || {},
        customizationDetails: [],
        customizationFee: 0,
        unitPrice: item.unitPrice,
        prepaidOnly: false,
        codEnabled: true,
        customizable: false,
      });
    }
    alert("Items added to your cart!");
  };

  const customOrders = orders.filter((o) =>
    o.items.some((it) => it.customizations && Object.keys(it.customizations).length > 0)
  );

  return (
    <>
      <Header />

      <section className="py-12 sm:py-16 border-b border-daxul-black/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs text-[#71717A] uppercase tracking-widest block mb-1">
              Customer Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
              Welcome, {user.name || "Customer"}
            </h1>
            <p className="text-xs text-[#555550] mt-1">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#71717A] hover:text-daxul-black transition-colors self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {/* Tabs navigation */}
      <section className="border-b border-daxul-black/10 bg-[#EAE5DA]/50 sticky top-16 z-20 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex overflow-x-auto gap-8">
          <button
            onClick={() => setActiveTab("orders")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "orders"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("custom")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "custom"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom Proofs ({customOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "addresses"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Addresses ({addresses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("wishlist")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "wishlist"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Wishlist ({wishlist.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("rewards")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "rewards"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Rewards ({rewardsData?.account?.availablePoints ?? 0} pts)</span>
          </button>

          <button
            onClick={() => setActiveTab("referrals")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "referrals"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Referrals</span>
          </button>

          <button
            onClick={() => setActiveTab("storeCredit")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "storeCredit"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Store Credit (₹{storeCreditData?.account?.availableBalance ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("giftCards")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "giftCards"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Gift Cards</span>
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "preferences"
                ? "border-daxul-black text-daxul-black"
                : "border-transparent text-[#71717A] hover:text-daxul-black"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>
      </section>

      {/* Main tab content */}
      <section className="flex-1 py-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full">
        {loading ? (
          <div className="py-20 text-center text-xs text-[#71717A] font-mono uppercase tracking-widest">
            Loading your portal...
          </div>
        ) : (
          <>
            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                {orders.length === 0 ? (
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-12 text-center space-y-4">
                    <ShoppingBag className="w-8 h-8 text-[#71717A] mx-auto" />
                    <h3 className="text-base font-bold uppercase text-daxul-black">No orders yet</h3>
                    <p className="text-xs text-[#555550]">
                      Your order history, manufacturing timelines, and tax invoices will appear here.
                    </p>
                    <Link
                      href="/shop"
                      className="inline-block bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-6 py-2.5 rounded-lg"
                    >
                      Explore Objects
                    </Link>
                  </div>
                ) : (
                  orders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-white border border-daxul-black/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-daxul-black/10 pb-4 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-daxul-black">
                              Order #{o.orderNumber}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#F3F0E9] text-[#71717A]">
                              {o.paymentMethod}
                            </span>
                          </div>
                          <div className="text-xs text-[#71717A] mt-0.5">
                            Placed on {new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-bold uppercase px-3 py-1 rounded-full border border-daxul-black/15 bg-[#F3F0E9] text-daxul-black">
                            {o.status.replace("_", " ")}
                          </span>
                          <span className="text-sm font-bold font-mono text-daxul-black">
                            ₹{o.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {o.items.map((it) => (
                          <div key={it.id} className="flex gap-3 bg-[#F3F0E9]/60 p-3 rounded-lg border border-daxul-black/5">
                            {it.productImage && (
                              <img
                                src={it.productImage}
                                alt={it.productName}
                                className="w-14 h-14 object-cover rounded border border-daxul-black/10 shrink-0"
                              />
                            )}
                            <div className="text-xs space-y-0.5">
                              <div className="font-bold text-daxul-black uppercase">{it.productName}</div>
                              <div className="text-[11px] text-[#71717A]">Qty: {it.quantity} × ₹{it.unitPrice.toFixed(2)}</div>
                              {it.customizations && (
                                <div className="text-[10px] text-gray-500 pt-1">
                                  {Object.entries(it.customizations).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Courier / Shipping if shipped */}
                      {(o.courierName || o.trackingNumber) && (
                        <div className="bg-[#EAE5DA]/60 p-3.5 rounded-lg border border-daxul-black/10 text-xs flex justify-between items-center">
                          <span>
                            Shipped via <strong>{o.courierName || "Express Courier"}</strong> • AWB: <strong className="font-mono">{o.trackingNumber}</strong>
                          </span>
                          {o.trackingUrl && (
                            <a
                              href={o.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-daxul-black underline font-bold inline-flex items-center gap-1"
                            >
                              <span>Track</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between border-t border-daxul-black/10 pt-4 gap-3">
                        <div className="flex gap-3">
                          <a
                            href={`/api/orders/${o.orderNumber}/invoice`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-daxul-black border border-daxul-black/20 hover:border-daxul-black px-3 py-1.5 rounded-md transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Invoice</span>
                          </a>

                          <Link
                            href="/track"
                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-daxul-black border border-daxul-black/20 hover:border-daxul-black px-3 py-1.5 rounded-md transition-colors"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Track Fabrication</span>
                          </Link>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReorder(o)}
                            className="text-xs font-bold uppercase text-daxul-black underline"
                          >
                            Reorder
                          </button>

                          {o.status !== "delivered" && o.status !== "cancelled" && !o.cancellationRequested && (
                            <button
                              onClick={() => {
                                setCancelModalOrder(o);
                                setCancelReason("");
                              }}
                              className="text-xs font-semibold uppercase text-red-600 hover:underline"
                            >
                              Cancel Order
                            </button>
                          )}
                          {o.cancellationRequested && (
                            <span className="text-xs font-bold text-amber-600 uppercase">
                              Cancellation Under Review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CUSTOM ORDERS & PROOFS TAB */}
            {activeTab === "custom" && (
              <div className="space-y-6">
                {customOrders.length === 0 ? (
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-12 text-center space-y-4">
                    <Sparkles className="w-8 h-8 text-[#71717A] mx-auto" />
                    <h3 className="text-base font-bold uppercase text-daxul-black">No Custom Orders</h3>
                    <p className="text-xs text-[#555550]">
                      When you order a customizable 3D shadow lamp or portrait piece, your 3D digital model proofs will appear here for your approval before printing.
                    </p>
                    <Link
                      href="/customize"
                      className="inline-block bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-6 py-2.5 rounded-lg"
                    >
                      Create Custom Object
                    </Link>
                  </div>
                ) : (
                  customOrders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-white border border-daxul-black/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm"
                    >
                      <div className="flex justify-between items-start border-b border-daxul-black/10 pb-4">
                        <div>
                          <span className="font-mono text-xs font-bold text-daxul-black">
                            Custom Object — Order #{o.orderNumber}
                          </span>
                          <div className="text-xs text-[#71717A] mt-0.5">
                            Status: <strong className="uppercase text-daxul-black">{o.designStatus.replace("_", " ")}</strong>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                            o.designStatus === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.designStatus === "proof_uploaded"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-[#F3F0E9] text-[#71717A]"
                          }`}
                        >
                          {o.designStatus === "approved" ? "Approved For Print" : o.designStatus === "proof_uploaded" ? "Approval Required" : "Design In Progress"}
                        </span>
                      </div>

                      {/* Design Proof Image */}
                      {o.proofImageUrl ? (
                        <div className="space-y-4 bg-[#F3F0E9]/70 p-6 rounded-xl border border-daxul-black/10">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-daxul-black">
                            3D Model Light-Refraction Proof
                          </h4>
                          <div className="text-center">
                            <img
                              src={o.proofImageUrl}
                              alt="Model Proof"
                              className="max-h-72 mx-auto rounded-lg border border-daxul-black/15 shadow-md"
                            />
                          </div>

                          {o.designStatus !== "approved" && (
                            <div className="space-y-3 pt-2">
                              <p className="text-xs text-[#555550] text-center max-w-md mx-auto">
                                Please inspect the 3D model geometry and custom inscriptions. Once approved, fabrication will commence layer-by-layer.
                              </p>

                              <div className="flex justify-center gap-3">
                                <button
                                  disabled={submittingAction}
                                  onClick={() => handleApproveDesign(o.orderNumber)}
                                  className="bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black border border-daxul-black font-bold text-xs uppercase px-6 py-2.5 rounded-lg transition-colors"
                                >
                                  Approve 3D Design
                                </button>
                              </div>

                              <div className="max-w-md mx-auto pt-3 border-t border-daxul-black/10 space-y-2">
                                <label className="block text-[11px] font-bold uppercase text-[#71717A]">
                                  Need adjustments?
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder="Describe any adjustments needed before printing..."
                                  value={revisionNotes[o.orderNumber] || ""}
                                  onChange={(e) => setRevisionNotes({ ...revisionNotes, [o.orderNumber]: e.target.value })}
                                  className="w-full bg-white border border-daxul-black/15 rounded-lg p-2.5 text-xs text-daxul-black focus:outline-none"
                                />
                                <button
                                  disabled={submittingAction}
                                  onClick={() => handleRequestRevisions(o.orderNumber)}
                                  className="w-full bg-transparent border border-daxul-black/30 hover:border-daxul-black text-daxul-black text-xs font-bold uppercase py-2 rounded-lg transition-colors"
                                >
                                  Request Revisions
                                </button>
                              </div>
                            </div>
                          )}

                          {o.designStatus === "approved" && (
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                              <CheckCircle className="w-4 h-4" />
                              <span>You approved this design proof. In fabrication.</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[#F3F0E9] p-6 rounded-lg text-center space-y-2 border border-daxul-black/10">
                          <Clock className="w-6 h-6 text-[#71717A] mx-auto" />
                          <h4 className="text-xs font-bold uppercase text-daxul-black">
                            Design Model In Progress
                          </h4>
                          <p className="text-xs text-[#555550] max-w-sm mx-auto">
                            Our studio 3D engineers are currently preparing your customized model. You will receive an email once the preview is ready for your review.
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SAVED ADDRESSES TAB */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-daxul-black">
                    Saved Shipping Addresses
                  </h3>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black border border-daxul-black font-bold text-xs uppercase px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-12 text-center space-y-3">
                    <MapPin className="w-8 h-8 text-[#71717A] mx-auto" />
                    <p className="text-xs text-[#555550]">No saved addresses yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <div
                        key={a.id}
                        className={`bg-white border rounded-xl p-5 space-y-3 relative shadow-sm ${
                          a.isDefault ? "border-daxul-black" : "border-daxul-black/15"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-xs text-daxul-black uppercase">{a.name}</span>
                            {a.isDefault && (
                              <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-daxul-lime text-daxul-black border border-daxul-black">
                                Default
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteAddress(a.id)}
                            className="text-[#71717A] hover:text-red-600 transition-colors"
                            title="Delete Address"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-xs text-[#555550] leading-relaxed">
                          <p>{a.street}</p>
                          <p>{a.city}, {a.state} - {a.pincode}</p>
                          <p>{a.country}</p>
                          <p className="mt-1 text-daxul-black font-mono">Ph: {a.phone}</p>
                        </div>

                        {!a.isDefault && (
                          <div className="pt-2 border-t border-daxul-black/10">
                            <button
                              onClick={() => handleSetDefaultAddress(a.id)}
                              className="text-xs font-bold uppercase text-daxul-black underline"
                            >
                              Set as Default
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REWARDS TAB */}
            {activeTab === "rewards" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Available Points</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.availablePoints ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Redeemable at checkout</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Pending Points</span>
                    <p className="text-2xl font-bold font-mono text-yellow-600 mt-2">
                      {rewardsData?.account?.pendingPoints ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Unlocks after delivery</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Lifetime Earned</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.lifetimeEarned ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Gross points accumulated</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Lifetime Redeemed</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.lifetimeRedeemed ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Applied toward orders</span>
                  </div>
                </div>

                <div className="bg-[#151515] border border-white/10 rounded-xl p-6 text-white space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#C8FF35]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3F0E9]">DAXUL Member Rewards Policy</h3>
                  </div>
                  <p className="text-xs text-[#B9B9B4] leading-relaxed">
                    Earn 1 point for every ₹100 spent on eligible design objects. 1 Point = ₹1 at checkout. Redeem points directly on any order up to 20% of your cart subtotal. Points unlock 7 days post-delivery.
                  </p>
                </div>

                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black mb-4">Points Activity Ledger</h3>
                  {!rewardsData?.transactions?.length ? (
                    <p className="text-xs text-[#71717A] py-4 text-center">No rewards transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-daxul-black/5 text-xs">
                      {rewardsData.transactions.map((tx: any) => (
                        <div key={tx.id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-daxul-black block">{tx.reason}</span>
                            <span className="text-[10px] text-[#71717A]">
                              {new Date(tx.createdAt).toLocaleDateString()} • {tx.status}
                            </span>
                          </div>
                          <span className={`font-mono font-bold ${tx.type === "REDEEM" ? "text-red-600" : "text-green-600"}`}>
                            {tx.type === "REDEEM" ? `-${tx.points}` : `+${tx.points}`} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === "referrals" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-8 shadow-sm space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Peer Referral Program</span>
                  <h3 className="text-xl font-bold uppercase text-daxul-black">Share DAXUL with someone.</h3>
                  <p className="text-xs text-[#555550] max-w-xl leading-relaxed">
                    Give your friends ₹100 off their first bespoke 3D printed object, and receive 200 reward points once their qualifying order is delivered.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3 max-w-lg">
                    <div className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 rounded-lg px-4 py-2.5 font-mono text-xs flex items-center justify-between">
                      <span className="text-daxul-black truncate">{referralsData?.referralLink || "https://daxullabs.com/shop?ref=..."}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (referralsData?.referralLink) {
                          navigator.clipboard.writeText(referralsData.referralLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Friends Invited</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">{referralsData?.stats?.totalInvited ?? 0}</p>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Successful Purchases</span>
                    <p className="text-2xl font-bold font-mono text-green-600 mt-2">{referralsData?.stats?.successfulCount ?? 0}</p>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Pending Orders</span>
                    <p className="text-2xl font-bold font-mono text-yellow-600 mt-2">{referralsData?.stats?.pendingCount ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* STORE CREDIT TAB */}
            {activeTab === "storeCredit" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Available Store Credit</span>
                    <p className="text-3xl font-bold font-mono text-daxul-black mt-1">
                      ₹{storeCreditData?.account?.availableBalance ?? 0}
                    </p>
                    <span className="text-xs text-[#555550]">Can be applied directly at checkout toward any object or custom design.</span>
                  </div>
                </div>

                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black mb-4">Store Credit History</h3>
                  {!storeCreditData?.transactions?.length ? (
                    <p className="text-xs text-[#71717A] py-4 text-center">No store credit transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-daxul-black/5 text-xs">
                      {storeCreditData.transactions.map((tx: any) => (
                        <div key={tx.id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-daxul-black block">{tx.reason}</span>
                            <span className="text-[10px] text-[#71717A]">{new Date(tx.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className={`font-mono font-bold ${tx.type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                            {tx.type === "DEBIT" ? `-₹${tx.amount}` : `+₹${tx.amount}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GIFT CARDS TAB */}
            {activeTab === "giftCards" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">Check Gift Card Balance</h3>
                  <p className="text-xs text-[#555550]">Enter your 16-character digital gift card code to check remaining balance.</p>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="DXL-XXXX-XXXX-XXXX"
                      value={giftCardBalanceCheckCode}
                      onChange={(e) => setGiftCardBalanceCheckCode(e.target.value)}
                      className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                    />
                    <button
                      onClick={async () => {
                        if (!giftCardBalanceCheckCode.trim()) return;
                        setCheckingGiftCard(true);
                        setGiftCardCheckResult(null);
                        try {
                          const res = await fetch("/api/gift-cards/check", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ code: giftCardBalanceCheckCode }),
                          });
                          const json = await res.json();
                          if (res.ok) setGiftCardCheckResult(json);
                          else alert(json.error || "Card not found");
                        } catch (e) {
                          alert("Failed to check gift card");
                        } finally {
                          setCheckingGiftCard(false);
                        }
                      }}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-4 py-2 rounded-lg"
                    >
                      {checkingGiftCard ? "Checking..." : "Verify"}
                    </button>
                  </div>
                  {giftCardCheckResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900">
                      Balance: <strong>₹{giftCardCheckResult.remainingBalance}</strong> ({giftCardCheckResult.maskedCode})
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSavingPrefs(true);
                    setPrefsSuccess(false);
                    try {
                      const res = await fetch("/api/account/preferences", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(preferencesData),
                      });
                      if (res.ok) setPrefsSuccess(true);
                    } finally {
                      setSavingPrefs(false);
                    }
                  }}
                  className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm space-y-6"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">
                    Notification & Marketing Preferences
                  </h3>

                  {prefsSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                      Preferences updated successfully.
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">Email: Order & Transactional</span>
                        <span className="text-[11px] text-[#71717A]">Essential order confirmations, 3D printing proof approvals, and tracking.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.emailTransactional}
                        onChange={(e) => setPreferencesData({ ...preferencesData, emailTransactional: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">Email: Studio Releases & Marketing</span>
                        <span className="text-[11px] text-[#71717A]">Curated design object drops, limited editions, and private offers.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.emailMarketing}
                        onChange={(e) => setPreferencesData({ ...preferencesData, emailMarketing: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">WhatsApp: Order Notifications</span>
                        <span className="text-[11px] text-[#71717A]">Real-time courier tracking updates and instant design proof alerts.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.whatsappTransactional}
                        onChange={(e) => setPreferencesData({ ...preferencesData, whatsappTransactional: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">WhatsApp: Studio Marketing</span>
                        <span className="text-[11px] text-[#71717A]">Occasional design announcements on WhatsApp (opt-in only).</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.whatsappMarketing}
                        onChange={(e) => setPreferencesData({ ...preferencesData, whatsappMarketing: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPrefs}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg"
                    >
                      {savingPrefs ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeTab === "wishlist" && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-daxul-black">
                  Your Saved Items
                </h3>

                {wishlist.length === 0 ? (
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-12 text-center space-y-3">
                    <Heart className="w-8 h-8 text-[#71717A] mx-auto" />
                    <p className="text-xs text-[#555550]">Your wishlist is currently empty.</p>
                    <Link
                      href="/shop"
                      className="inline-block bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-6 py-2 rounded-lg"
                    >
                      Browse Catalog
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {wishlist.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-daxul-black/10 rounded-xl overflow-hidden p-4 space-y-3 shadow-sm flex flex-col justify-between"
                      >
                        {p.images[0] && (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-full h-44 object-cover rounded-lg border border-daxul-black/10"
                          />
                        )}
                        <div>
                          <h4 className="font-bold text-xs uppercase text-daxul-black">{p.name}</h4>
                          <p className="font-mono font-bold text-xs text-daxul-black mt-1">₹{p.price}</p>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Link
                            href={`/shop/${p.slug}`}
                            className="flex-1 bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black border border-daxul-black text-center font-bold text-xs uppercase py-2 rounded-lg transition-colors"
                          >
                            View Object
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REWARDS TAB */}
            {activeTab === "rewards" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Available Points</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.availablePoints ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Redeemable at checkout</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Pending Points</span>
                    <p className="text-2xl font-bold font-mono text-yellow-600 mt-2">
                      {rewardsData?.account?.pendingPoints ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Unlocks after delivery</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Lifetime Earned</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.lifetimeEarned ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Gross points accumulated</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Lifetime Redeemed</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.lifetimeRedeemed ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Applied toward orders</span>
                  </div>
                </div>

                <div className="bg-[#151515] border border-white/10 rounded-xl p-6 text-white space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#C8FF35]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3F0E9]">DAXUL Member Rewards Policy</h3>
                  </div>
                  <p className="text-xs text-[#B9B9B4] leading-relaxed">
                    Earn 1 point for every ₹100 spent on eligible design objects. 1 Point = ₹1 at checkout. Redeem points directly on any order up to 20% of your cart subtotal. Points unlock 7 days post-delivery.
                  </p>
                </div>

                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black mb-4">Points Activity Ledger</h3>
                  {!rewardsData?.transactions?.length ? (
                    <p className="text-xs text-[#71717A] py-4 text-center">No rewards transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-daxul-black/5 text-xs">
                      {rewardsData.transactions.map((tx: any) => (
                        <div key={tx.id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-daxul-black block">{tx.reason}</span>
                            <span className="text-[10px] text-[#71717A]">
                              {new Date(tx.createdAt).toLocaleDateString()} • {tx.status}
                            </span>
                          </div>
                          <span className={`font-mono font-bold ${tx.type === "REDEEM" ? "text-red-600" : "text-green-600"}`}>
                            {tx.type === "REDEEM" ? `-${tx.points}` : `+${tx.points}`} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === "referrals" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-8 shadow-sm space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Peer Referral Program</span>
                  <h3 className="text-xl font-bold uppercase text-daxul-black">Share DAXUL with someone.</h3>
                  <p className="text-xs text-[#555550] max-w-xl leading-relaxed">
                    Give your friends ₹100 off their first bespoke 3D printed object, and receive 200 reward points once their qualifying order is delivered.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3 max-w-lg">
                    <div className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 rounded-lg px-4 py-2.5 font-mono text-xs flex items-center justify-between">
                      <span className="text-daxul-black truncate">{referralsData?.referralLink || "https://daxullabs.com/shop?ref=..."}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (referralsData?.referralLink) {
                          navigator.clipboard.writeText(referralsData.referralLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Friends Invited</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">{referralsData?.stats?.totalInvited ?? 0}</p>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Successful Purchases</span>
                    <p className="text-2xl font-bold font-mono text-green-600 mt-2">{referralsData?.stats?.successfulCount ?? 0}</p>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Pending Orders</span>
                    <p className="text-2xl font-bold font-mono text-yellow-600 mt-2">{referralsData?.stats?.pendingCount ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* STORE CREDIT TAB */}
            {activeTab === "storeCredit" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Available Store Credit</span>
                    <p className="text-3xl font-bold font-mono text-daxul-black mt-1">
                      ₹{storeCreditData?.account?.availableBalance ?? 0}
                    </p>
                    <span className="text-xs text-[#555550]">Can be applied directly at checkout toward any object or custom design.</span>
                  </div>
                </div>

                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black mb-4">Store Credit History</h3>
                  {!storeCreditData?.transactions?.length ? (
                    <p className="text-xs text-[#71717A] py-4 text-center">No store credit transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-daxul-black/5 text-xs">
                      {storeCreditData.transactions.map((tx: any) => (
                        <div key={tx.id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-daxul-black block">{tx.reason}</span>
                            <span className="text-[10px] text-[#71717A]">{new Date(tx.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className={`font-mono font-bold ${tx.type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                            {tx.type === "DEBIT" ? `-₹${tx.amount}` : `+₹${tx.amount}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GIFT CARDS TAB */}
            {activeTab === "giftCards" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">Check Gift Card Balance</h3>
                  <p className="text-xs text-[#555550]">Enter your 16-character digital gift card code to check remaining balance.</p>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="DXL-XXXX-XXXX-XXXX"
                      value={giftCardBalanceCheckCode}
                      onChange={(e) => setGiftCardBalanceCheckCode(e.target.value)}
                      className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                    />
                    <button
                      onClick={async () => {
                        if (!giftCardBalanceCheckCode.trim()) return;
                        setCheckingGiftCard(true);
                        setGiftCardCheckResult(null);
                        try {
                          const res = await fetch("/api/gift-cards/check", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ code: giftCardBalanceCheckCode }),
                          });
                          const json = await res.json();
                          if (res.ok) setGiftCardCheckResult(json);
                          else alert(json.error || "Card not found");
                        } catch (e) {
                          alert("Failed to check gift card");
                        } finally {
                          setCheckingGiftCard(false);
                        }
                      }}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-4 py-2 rounded-lg"
                    >
                      {checkingGiftCard ? "Checking..." : "Verify"}
                    </button>
                  </div>
                  {giftCardCheckResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900">
                      Balance: <strong>₹{giftCardCheckResult.remainingBalance}</strong> ({giftCardCheckResult.maskedCode})
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSavingPrefs(true);
                    setPrefsSuccess(false);
                    try {
                      const res = await fetch("/api/account/preferences", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(preferencesData),
                      });
                      if (res.ok) setPrefsSuccess(true);
                    } finally {
                      setSavingPrefs(false);
                    }
                  }}
                  className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm space-y-6"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">
                    Notification & Marketing Preferences
                  </h3>

                  {prefsSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                      Preferences updated successfully.
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">Email: Order & Transactional</span>
                        <span className="text-[11px] text-[#71717A]">Essential order confirmations, 3D printing proof approvals, and tracking.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.emailTransactional}
                        onChange={(e) => setPreferencesData({ ...preferencesData, emailTransactional: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">Email: Studio Releases & Marketing</span>
                        <span className="text-[11px] text-[#71717A]">Curated design object drops, limited editions, and private offers.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.emailMarketing}
                        onChange={(e) => setPreferencesData({ ...preferencesData, emailMarketing: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">WhatsApp: Order Notifications</span>
                        <span className="text-[11px] text-[#71717A]">Real-time courier tracking updates and instant design proof alerts.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.whatsappTransactional}
                        onChange={(e) => setPreferencesData({ ...preferencesData, whatsappTransactional: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">WhatsApp: Studio Marketing</span>
                        <span className="text-[11px] text-[#71717A]">Occasional design announcements on WhatsApp (opt-in only).</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.whatsappMarketing}
                        onChange={(e) => setPreferencesData({ ...preferencesData, whatsappMarketing: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPrefs}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg"
                    >
                      {savingPrefs ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* REWARDS TAB */}
            {activeTab === "rewards" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Available Points</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.availablePoints ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Redeemable at checkout</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Pending Points</span>
                    <p className="text-2xl font-bold font-mono text-yellow-600 mt-2">
                      {rewardsData?.account?.pendingPoints ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Unlocks after delivery</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Lifetime Earned</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.lifetimeEarned ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Gross points accumulated</span>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Lifetime Redeemed</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">
                      {rewardsData?.account?.lifetimeRedeemed ?? 0}
                    </p>
                    <span className="text-[11px] text-[#555550]">Applied toward orders</span>
                  </div>
                </div>

                <div className="bg-[#151515] border border-white/10 rounded-xl p-6 text-white space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#C8FF35]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3F0E9]">DAXUL Member Rewards Policy</h3>
                  </div>
                  <p className="text-xs text-[#B9B9B4] leading-relaxed">
                    Earn 1 point for every ₹100 spent on eligible design objects. 1 Point = ₹1 at checkout. Redeem points directly on any order up to 20% of your cart subtotal. Points unlock 7 days post-delivery.
                  </p>
                </div>

                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black mb-4">Points Activity Ledger</h3>
                  {!rewardsData?.transactions?.length ? (
                    <p className="text-xs text-[#71717A] py-4 text-center">No rewards transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-daxul-black/5 text-xs">
                      {rewardsData.transactions.map((tx: any) => (
                        <div key={tx.id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-daxul-black block">{tx.reason}</span>
                            <span className="text-[10px] text-[#71717A]">
                              {new Date(tx.createdAt).toLocaleDateString()} • {tx.status}
                            </span>
                          </div>
                          <span className={`font-mono font-bold ${tx.type === "REDEEM" ? "text-red-600" : "text-green-600"}`}>
                            {tx.type === "REDEEM" ? `-${tx.points}` : `+${tx.points}`} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === "referrals" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-8 shadow-sm space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Peer Referral Program</span>
                  <h3 className="text-xl font-bold uppercase text-daxul-black">Share DAXUL with someone.</h3>
                  <p className="text-xs text-[#555550] max-w-xl leading-relaxed">
                    Give your friends ₹100 off their first bespoke 3D printed object, and receive 200 reward points once their qualifying order is delivered.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3 max-w-lg">
                    <div className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 rounded-lg px-4 py-2.5 font-mono text-xs flex items-center justify-between">
                      <span className="text-daxul-black truncate">{referralsData?.referralLink || "https://daxullabs.com/shop?ref=..."}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (referralsData?.referralLink) {
                          navigator.clipboard.writeText(referralsData.referralLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Friends Invited</span>
                    <p className="text-2xl font-bold font-mono text-daxul-black mt-2">{referralsData?.stats?.totalInvited ?? 0}</p>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Successful Purchases</span>
                    <p className="text-2xl font-bold font-mono text-green-600 mt-2">{referralsData?.stats?.successfulCount ?? 0}</p>
                  </div>
                  <div className="bg-white border border-daxul-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Pending Orders</span>
                    <p className="text-2xl font-bold font-mono text-yellow-600 mt-2">{referralsData?.stats?.pendingCount ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* STORE CREDIT TAB */}
            {activeTab === "storeCredit" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">Available Store Credit</span>
                    <p className="text-3xl font-bold font-mono text-daxul-black mt-1">
                      ₹{storeCreditData?.account?.availableBalance ?? 0}
                    </p>
                    <span className="text-xs text-[#555550]">Can be applied directly at checkout toward any object or custom design.</span>
                  </div>
                </div>

                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black mb-4">Store Credit History</h3>
                  {!storeCreditData?.transactions?.length ? (
                    <p className="text-xs text-[#71717A] py-4 text-center">No store credit transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-daxul-black/5 text-xs">
                      {storeCreditData.transactions.map((tx: any) => (
                        <div key={tx.id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-daxul-black block">{tx.reason}</span>
                            <span className="text-[10px] text-[#71717A]">{new Date(tx.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className={`font-mono font-bold ${tx.type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                            {tx.type === "DEBIT" ? `-₹${tx.amount}` : `+₹${tx.amount}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GIFT CARDS TAB */}
            {activeTab === "giftCards" && (
              <div className="space-y-6">
                <div className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">Check Gift Card Balance</h3>
                  <p className="text-xs text-[#555550]">Enter your 16-character digital gift card code to check remaining balance.</p>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="DXL-XXXX-XXXX-XXXX"
                      value={giftCardBalanceCheckCode}
                      onChange={(e) => setGiftCardBalanceCheckCode(e.target.value)}
                      className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                    />
                    <button
                      onClick={async () => {
                        if (!giftCardBalanceCheckCode.trim()) return;
                        setCheckingGiftCard(true);
                        setGiftCardCheckResult(null);
                        try {
                          const res = await fetch("/api/gift-cards/check", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ code: giftCardBalanceCheckCode }),
                          });
                          const json = await res.json();
                          if (res.ok) setGiftCardCheckResult(json);
                          else alert(json.error || "Card not found");
                        } catch (e) {
                          alert("Failed to check gift card");
                        } finally {
                          setCheckingGiftCard(false);
                        }
                      }}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-4 py-2 rounded-lg"
                    >
                      {checkingGiftCard ? "Checking..." : "Verify"}
                    </button>
                  </div>
                  {giftCardCheckResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900">
                      Balance: <strong>₹{giftCardCheckResult.remainingBalance}</strong> ({giftCardCheckResult.maskedCode})
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSavingPrefs(true);
                    setPrefsSuccess(false);
                    try {
                      const res = await fetch("/api/account/preferences", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(preferencesData),
                      });
                      if (res.ok) setPrefsSuccess(true);
                    } finally {
                      setSavingPrefs(false);
                    }
                  }}
                  className="bg-white border border-daxul-black/10 rounded-xl p-6 shadow-sm space-y-6"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">
                    Notification & Marketing Preferences
                  </h3>

                  {prefsSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                      Preferences updated successfully.
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">Email: Order & Transactional</span>
                        <span className="text-[11px] text-[#71717A]">Essential order confirmations, 3D printing proof approvals, and tracking.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.emailTransactional}
                        onChange={(e) => setPreferencesData({ ...preferencesData, emailTransactional: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">Email: Studio Releases & Marketing</span>
                        <span className="text-[11px] text-[#71717A]">Curated design object drops, limited editions, and private offers.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.emailMarketing}
                        onChange={(e) => setPreferencesData({ ...preferencesData, emailMarketing: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">WhatsApp: Order Notifications</span>
                        <span className="text-[11px] text-[#71717A]">Real-time courier tracking updates and instant design proof alerts.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.whatsappTransactional}
                        onChange={(e) => setPreferencesData({ ...preferencesData, whatsappTransactional: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#F3F0E9] rounded-lg cursor-pointer">
                      <div>
                        <span className="font-bold text-daxul-black block">WhatsApp: Studio Marketing</span>
                        <span className="text-[11px] text-[#71717A]">Occasional design announcements on WhatsApp (opt-in only).</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferencesData.whatsappMarketing}
                        onChange={(e) => setPreferencesData({ ...preferencesData, whatsappMarketing: e.target.checked })}
                        className="accent-daxul-black"
                      />
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPrefs}
                      className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg"
                    >
                      {savingPrefs ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </section>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-daxul-black/15 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-daxul-black/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-daxul-black">Add Shipping Address</h3>
              <button onClick={() => setShowAddressModal(false)} className="text-[#71717A] text-xs">✕</button>
            </div>

            <form onSubmit={handleAddAddress} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAddr.name}
                  onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })}
                  className="w-full bg-[#F3F0E9] border border-daxul-black/15 rounded px-3 py-2 text-xs text-daxul-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  className="w-full bg-[#F3F0E9] border border-daxul-black/15 rounded px-3 py-2 text-xs text-daxul-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddr.street}
                  onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                  className="w-full bg-[#F3F0E9] border border-daxul-black/15 rounded px-3 py-2 text-xs text-daxul-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    className="w-full bg-[#F3F0E9] border border-daxul-black/15 rounded px-3 py-2 text-xs text-daxul-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={newAddr.state}
                    onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                    className="w-full bg-[#F3F0E9] border border-daxul-black/15 rounded px-3 py-2 text-xs text-daxul-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">PIN Code (India)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={newAddr.pincode}
                  onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                  className="w-full bg-[#F3F0E9] border border-daxul-black/15 rounded px-3 py-2 text-xs text-daxul-black focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAddr.isDefault}
                  onChange={(e) => setNewAddr({ ...newAddr, isDefault: e.target.checked })}
                  className="accent-daxul-black"
                />
                <span className="text-xs text-[#555550]">Set as default shipping address</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-daxul-black/10">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 text-xs text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-daxul-lime text-daxul-black border border-daxul-black font-bold text-xs uppercase px-5 py-2 rounded-lg"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Request Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-daxul-black/15 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold uppercase text-daxul-black border-b border-daxul-black/10 pb-3">
              Request Order Cancellation (#{cancelModalOrder.orderNumber})
            </h3>
            <p className="text-xs text-[#555550] leading-relaxed">
              If your order has not entered 3D printing yet, it will be cancelled immediately. If printing is already underway, our studio operations team will review your request.
            </p>
            <textarea
              rows={3}
              required
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-[#F3F0E9] border border-daxul-black/15 rounded p-3 text-xs text-daxul-black focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-daxul-black/10">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 text-xs text-[#71717A]"
              >
                Keep Order
              </button>
              <button
                disabled={submittingAction || !cancelReason.trim()}
                onClick={handleRequestCancel}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase px-5 py-2 rounded-lg disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
