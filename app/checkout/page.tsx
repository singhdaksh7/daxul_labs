"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import {
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Tag,
  ArrowRight,
  Printer,
} from "lucide-react";

export default function CheckoutPage() {
  const {
    cart,
    clearCart,
    addOrder,
    siteSettings,
    appliedCoupon,
    removeCoupon,
  } = useStore();

  // Address State
  const [name, setName] = useState("Vikram Malhotra");
  const [email, setEmail] = useState("vikram@example.com");
  const [phone, setPhone] = useState("+91 98111 22334");
  const [street, setStreet] = useState("402 Cyber Heights, HSR Layout Sector 1");
  const [city, setCity] = useState("Bangalore");
  const [state, setState] = useState("Karnataka");
  const [pincode, setPincode] = useState("560102");

  // Shipping & Payment selection
  const [shippingOption, setShippingOption] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod">("prepaid");
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  const subtotal = cart.reduce((acc, item) => acc + item.totalUnitPrice * item.quantity, 0);

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === "percentage") {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discount = appliedCoupon.discountValue;
    }
  }

  const isFreeShipping = subtotal >= siteSettings.freeShippingThreshold;
  const shippingFee = isFreeShipping
    ? 0
    : shippingOption === "standard"
    ? siteSettings.standardShippingFee
    : siteSettings.expressShippingFee;

  const hasPrepaidOnlyItems = cart.some((item) => item.product.prepaidOnly);
  const isCodAllowed = siteSettings.globalCodEnabled && !hasPrepaidOnlyItems;

  const codFee = paymentMethod === "cod" ? siteSettings.codFee : 0;
  const grandTotal = Math.max(0, subtotal - discount + shippingFee + codFee);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const newOrd = addOrder({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      shippingAddress: {
        street,
        city,
        state,
        pincode,
        country: "India",
      },
      items: cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        productImage: i.product.images[0],
        unitPrice: i.totalUnitPrice,
        quantity: i.quantity,
        selectedFinish: i.selectedFinish,
        selectedColor: i.selectedColor,
        selectedSize: i.selectedSize,
        customizations: i.customizations,
        customizationFee: i.customizationFee,
      })),
      totalAmount: grandTotal,
      discountAmount: discount,
      shippingFee,
      codFee,
      paymentMethod,
      paymentStatus: paymentMethod === "prepaid" ? "paid" : "pending",
    });

    setCreatedOrder(newOrd);
    clearCart();
  };

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Header */}
      <section className="bg-[#151515] border-b border-[#242426] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35]">
            ENCRYPTED CHECKOUT
          </span>
          <h1 className="text-3xl font-extrabold uppercase">Complete Your Order</h1>
        </div>
      </section>

      {/* Content */}
      <section className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {createdOrder ? (
          /* Order Confirmation Card */
          <div className="bg-[#151515] border border-[#C8FF35] p-8 sm:p-12 rounded-3xl max-w-2xl mx-auto text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <CheckCircle2 className="w-16 h-16 text-[#C8FF35] mx-auto animate-bounce" />
            <div className="space-y-2">
              <span className="text-xs font-mono text-[#C8FF35] uppercase tracking-widest block">ORDER CONFIRMED</span>
              <h2 className="text-3xl font-extrabold uppercase text-white">Order #{createdOrder.orderNumber} Placed!</h2>
              <p className="text-xs text-gray-400">
                Thank you, {createdOrder.customerName}. A confirmation email with design slicing instructions has been sent to <strong className="text-white">{createdOrder.customerEmail}</strong>.
              </p>
            </div>

            <div className="bg-[#0B0B0C] p-6 rounded-2xl border border-[#242426] text-left text-xs space-y-2">
              <div className="flex justify-between font-bold text-white uppercase pb-2 border-b border-[#242426]">
                <span>Status: {siteSettings.orderStatusLabels[createdOrder.status as keyof typeof siteSettings.orderStatusLabels]}</span>
                <span className="text-[#C8FF35]">{siteSettings.currencySymbol}{createdOrder.totalAmount}</span>
              </div>
              <div>Shipping Address: {createdOrder.shippingAddress.street}, {createdOrder.shippingAddress.city}</div>
              <div>Payment: {createdOrder.paymentMethod.toUpperCase()} ({createdOrder.paymentStatus})</div>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-[#242426] hover:bg-gray-700 text-white px-6 py-3 rounded-full text-xs font-bold uppercase flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <Link
                href="/account"
                className="bg-[#C8FF35] text-[#0B0B0C] px-8 py-3 rounded-full text-xs font-extrabold uppercase hover:bg-white transition-colors"
              >
                Track In Account →
              </Link>
            </div>
          </div>
        ) : cart.length === 0 ? (
          <div className="text-center py-20 bg-[#151515] border border-[#242426] rounded-2xl space-y-4 max-w-md mx-auto">
            <p className="text-base font-bold uppercase text-gray-300">Your Checkout Cart is Empty</p>
            <Link
              href="/shop"
              className="bg-[#C8FF35] text-[#0B0B0C] px-8 py-3 rounded-full text-xs font-bold uppercase inline-block"
            >
              Explore Store
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left 7 Cols: Address & Payment */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Shipping Address */}
              <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-[#242426] pb-3">
                  <Truck className="w-4 h-4 text-[#C8FF35]" />
                  <span>1. Delivery Address</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-white uppercase focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-gray-400 font-bold uppercase">Street Address / Apartment *</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-white uppercase focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">State *</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-white uppercase focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">PIN Code *</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-[#242426] pb-3">
                  <CreditCard className="w-4 h-4 text-[#C8FF35]" />
                  <span>2. Payment Option</span>
                </h3>

                <div className="space-y-3">
                  {/* Prepaid Option */}
                  <label
                    onClick={() => setPaymentMethod("prepaid")}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "prepaid"
                        ? "bg-[#0B0B0C] border-[#C8FF35]"
                        : "bg-[#151515] border-[#242426]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "prepaid"}
                        onChange={() => setPaymentMethod("prepaid")}
                        className="accent-[#C8FF35]"
                      />
                      <div>
                        <div className="text-xs font-bold text-white uppercase">Prepaid Payment (UPI / Cards / NetBanking)</div>
                        <div className="text-[11px] text-gray-400">Instant slicing priority & fastest dispatch</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#C8FF35] font-bold">RECOMMENDED</span>
                  </label>

                  {/* COD Option */}
                  <label
                    onClick={() => isCodAllowed && setPaymentMethod("cod")}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      !isCodAllowed
                        ? "opacity-40 cursor-not-allowed border-[#242426]"
                        : paymentMethod === "cod"
                        ? "bg-[#0B0B0C] border-[#C8FF35] cursor-pointer"
                        : "bg-[#151515] border-[#242426] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        disabled={!isCodAllowed}
                        checked={paymentMethod === "cod"}
                        onChange={() => isCodAllowed && setPaymentMethod("cod")}
                        className="accent-[#C8FF35]"
                      />
                      <div>
                        <div className="text-xs font-bold text-white uppercase">Cash on Delivery (COD)</div>
                        {!isCodAllowed ? (
                          <div className="text-[10px] text-amber-300">⚠️ Disabled for custom items in cart</div>
                        ) : (
                          <div className="text-[11px] text-gray-400">+{siteSettings.currencySymbol}{siteSettings.codFee} COD handling fee</div>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            {/* Right 5 Cols: Order Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#151515] border border-[#242426] p-6 rounded-2xl space-y-6 sticky top-28">
                <h3 className="text-base font-extrabold uppercase text-white border-b border-[#242426] pb-3">
                  Order Summary ({cart.length} Objects)
                </h3>

                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 items-center text-xs">
                      <img src={item.product.images[0]} alt={item.product.name} className="w-12 h-12 object-cover rounded-lg bg-[#0B0B0C]" />
                      <div className="flex-1">
                        <div className="font-bold text-white line-clamp-1 uppercase">{item.product.name}</div>
                        <div className="text-gray-400">Qty: {item.quantity} • {item.selectedFinish}</div>
                      </div>
                      <div className="font-extrabold text-white">
                        {siteSettings.currencySymbol}{item.totalUnitPrice * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculations */}
                <div className="space-y-2 text-xs text-gray-300 pt-4 border-t border-[#242426]">
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span>{siteSettings.currencySymbol}{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[#C8FF35]">
                      <span>Promo Discount</span>
                      <span>-{siteSettings.currencySymbol}{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping Fee</span>
                    <span>{shippingFee === 0 ? <span className="text-[#C8FF35]">FREE</span> : `${siteSettings.currencySymbol}${shippingFee}`}</span>
                  </div>
                  {codFee > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>COD Handling Fee</span>
                      <span>+{siteSettings.currencySymbol}{codFee}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-black text-white pt-3 border-t border-[#242426]">
                    <span>Total Amount</span>
                    <span className="text-[#C8FF35]">{siteSettings.currencySymbol}{grandTotal}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#C8FF35] text-[#0B0B0C] py-4 rounded-xl text-xs font-extrabold uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-[#C8FF35]/20 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Place Order ({siteSettings.currencySymbol}{grandTotal})</span>
                </button>

                <div className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF35]" />
                  <span>256-bit Encrypted Checkout • DAXUL Guarantee</span>
                </div>
              </div>
            </div>

          </form>
        )}
      </section>

      <Footer />
    </main>
  );
}
