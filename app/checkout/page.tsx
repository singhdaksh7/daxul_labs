"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/storeContext";
import { useSiteSettings } from "@/lib/siteContext";
import { formatMoney } from "@/lib/cartPricing";
import { useQuote } from "@/lib/useQuote";
import { CreditCard, Truck, ShieldCheck, CheckCircle2, Lock, Printer } from "lucide-react";

/* Minimal typing for Razorpay's hosted checkout script. */
interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

interface OrderResult {
  orderId?: string;
  orderNumber: string;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  shippingMethod?: "STANDARD" | "EXPRESS";
  codFee?: number;
  razorpayOrderId?: string | null;
  amount?: number;
  currency?: string;
  keyId?: string;
}

type Phase = "form" | "submitting" | "awaiting_payment" | "confirmed";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.dataset.razorpay = "1";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const { cart, clearCart, couponCode, setCouponCode, isHydrated } = useCart();
  const settings = useSiteSettings();
  const money = (n: number) => formatMoney(settings.currencySymbol, n);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [couponInput, setCouponInput] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod">("prepaid");
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [paidMethod, setPaidMethod] = useState<"prepaid" | "cod">("prepaid");
  const [confirmedName, setConfirmedName] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");

  const [shippingMethod, setShippingMethod] = useState<"STANDARD" | "EXPRESS" | null>(null);

  // Server quote (debounced): the source of truth for every number on this page.
  const { quote, loading: quoteLoading, error: quoteError } = useQuote({
    cart,
    couponCode,
    paymentMethod,
    shippingMethod,
    pincode,
    enabled: isHydrated && phase === "form",
  });

  const subtotal = cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  // COD is blocked for prepaid-only / customizable products (per site settings) or when disabled globally.
  const codBlockedReason = useMemo(() => {
    if (quote) return quote.cod.eligible ? null : quote.cod.reason ?? "Cash on Delivery is not available for this order.";
    if (!settings.globalCodEnabled) return "Cash on Delivery is currently unavailable.";
    if (cart.some((i) => i.prepaidOnly || !i.codEnabled)) return "Disabled for prepaid-only items in your cart.";
    if (settings.customProductsPrepaidOnly && cart.some((i) => i.customizable))
      return "Disabled for customized items in your cart.";
    return null;
  }, [quote, cart, settings.globalCodEnabled, settings.customProductsPrepaidOnly]);
  const isCodAllowed = codBlockedReason === null;

  useEffect(() => {
    if (!isCodAllowed && paymentMethod === "cod") setPaymentMethod("prepaid");
  }, [isCodAllowed, paymentMethod]);

  // Shipping options: server list when available, else enabled flags from public settings.
  const shippingOptions: { method: "STANDARD" | "EXPRESS"; fee: number }[] = quote
    ? quote.shipping.options.map((o) => ({ method: o.method, fee: o.fee }))
    : [
        ...(settings.standardShippingEnabled ? [{ method: "STANDARD" as const, fee: subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee }] : []),
        ...(settings.expressShippingEnabled ? [{ method: "EXPRESS" as const, fee: settings.expressShippingFee }] : []),
      ];
  const selectedMethod = shippingMethod ?? quote?.shipping.method ?? shippingOptions[0]?.method ?? null;

  useEffect(() => {
    // Keep the selection valid if an admin disabled a method.
    if (quote && shippingMethod && !quote.shipping.options.some((o) => o.method === shippingMethod)) {
      setShippingMethod(null);
    }
  }, [quote, shippingMethod]);

  const estShipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
  const estCodFee = paymentMethod === "cod" && settings.codFeeEnabled ? settings.codFee : 0;
  const estTotal = subtotal + estShipping + estCodFee;
  const shownSubtotal = quote ? quote.subtotal : subtotal;
  const shownDiscount = quote ? quote.discountAmount : 0;
  const shownShipping = quote ? quote.shipping.fee : estShipping;
  const shownCodFee = quote ? quote.codFee : estCodFee;
  const shownTotal = quote ? quote.total : estTotal;
  const couponQuote = quote?.coupon ?? null;
  const blockingIssue = quote && !quote.ok ? quote.issues[0]?.message ?? "Please review your cart." : null;

  const finalizePayment = async (o: OrderResult, resp: RazorpayHandlerResponse) => {
    try {
      const res = await fetch("/api/razorpay/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: resp.razorpay_order_id,
          razorpayPaymentId: resp.razorpay_payment_id,
          razorpaySignature: resp.razorpay_signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Payment verification failed");
      setOrder(o);
      setPhase("confirmed");
      clearCart();
    } catch (e) {
      setOrder(o);
      setPhase("awaiting_payment");
      setError(
        `${e instanceof Error ? e.message : "Payment verification failed"}. If money was debited, please contact us with order ${o.orderNumber}.`
      );
    }
  };

  const openRazorpay = async (o: OrderResult) => {
    setError(null);
    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay || !o.razorpayOrderId || !o.keyId) {
      setPhase("awaiting_payment");
      setError("Could not load the secure payment window. Please try again.");
      return;
    }
    const rzp = new window.Razorpay({
      key: o.keyId,
      amount: o.amount,
      currency: o.currency || "INR",
      name: settings.brandName,
      description: `Order ${o.orderNumber}`,
      order_id: o.razorpayOrderId,
      prefill: { name, email, contact: phone },
      theme: { color: "#C8FF35" },
      handler: (resp: RazorpayHandlerResponse) => {
        void finalizePayment(o, resp);
      },
      modal: {
        ondismiss: () => {
          setPhase("awaiting_payment");
          setError("Payment was not completed. You can retry below; your order is held pending payment.");
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      setError(r?.error?.description || "Payment failed. Please try again.");
    });
    rzp.open();
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || phase === "submitting") return;
    setError(null);
    setPhase("submitting");

    const payload = {
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variantSelections: i.variantSelections.map((v) => ({ groupId: v.groupId, variantId: v.variantId })),
        customizations: i.customizations,
      })),
      couponCode: couponCode || undefined,
      paymentMethod,
      shippingMethod: selectedMethod ?? undefined,
      // Only a settled quote is used as a consistency check; the server total always wins.
      expectedTotal: quote && !quoteLoading && quote.ok ? quote.total : undefined,
      customer: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: "India",
      },
    };

    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "We could not place your order. Please review your cart and try again.");
      }
      const o: OrderResult = {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        totalAmount: Number(data.totalAmount),
        subtotal: data.subtotal,
        discountAmount: data.discountAmount,
        shippingFee: data.shippingFee,
        shippingMethod: data.shippingMethod,
        codFee: data.codFee,
        razorpayOrderId: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        keyId: data.keyId,
      };
      setConfirmedName(name.trim());
      setConfirmedEmail(email.trim());
      setPaidMethod(paymentMethod);
      setOrder(o);

      if (paymentMethod === "cod" || !o.razorpayOrderId) {
        setPhase("confirmed");
        clearCart();
      } else {
        setPhase("awaiting_payment");
        await openRazorpay(o);
      }
    } catch (err) {
      setPhase("form");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      setCouponCode(couponInput);
      setCouponInput("");
    }
  };

  const inputCls =
    "w-full bg-daxul-black border border-daxul-graphite focus:border-daxul-lime daxul-btn p-3 text-white focus:outline-none";

  return (
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />

      <section className="bg-daxul-dark border-b border-daxul-graphite py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-daxul-lime">ENCRYPTED CHECKOUT</span>
          <h1 className="text-3xl font-extrabold uppercase">Complete Your Order</h1>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {phase === "confirmed" && order ? (
          <div className="bg-daxul-dark border border-daxul-lime p-8 sm:p-12 daxul-card-lg max-w-2xl mx-auto text-center space-y-6 shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-daxul-lime mx-auto" />
            <div className="space-y-2">
              <span className="text-xs font-mono text-daxul-lime uppercase tracking-widest block">ORDER CONFIRMED</span>
              <h2 className="text-3xl font-extrabold uppercase text-white">Order #{order.orderNumber} Placed!</h2>
              <p className="text-xs text-gray-400">
                Thank you, {confirmedName}. We will email updates to{" "}
                <strong className="text-white">{confirmedEmail}</strong>. Keep your order number and the email or
                phone you used to track progress.
              </p>
            </div>

            <div className="bg-daxul-black p-6 rounded-2xl border border-daxul-graphite text-left text-xs space-y-2">
              {order.subtotal !== undefined && (
                <div className="flex justify-between text-gray-300">
                  <span>Items</span>
                  <span>{money(order.subtotal)}</span>
                </div>
              )}
              {!!order.discountAmount && (
                <div className="flex justify-between text-daxul-lime">
                  <span>Discount</span>
                  <span>-{money(order.discountAmount)}</span>
                </div>
              )}
              {order.shippingFee !== undefined && (
                <div className="flex justify-between text-gray-300">
                  <span>Shipping</span>
                  <span>{order.shippingFee === 0 ? "FREE" : money(order.shippingFee)}</span>
                </div>
              )}
              {!!order.codFee && (
                <div className="flex justify-between text-gray-300">
                  <span>COD handling</span>
                  <span>{money(order.codFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white uppercase pt-2 border-t border-daxul-graphite">
                <span>Total</span>
                <span className="text-daxul-lime">{money(order.totalAmount)}</span>
              </div>
              <div className="text-gray-400">
                Payment: {paidMethod === "cod" ? "Cash on Delivery (pay on arrival)" : "Prepaid (paid online)"}
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-2 flex-wrap">
              <button
                onClick={() => window.print()}
                className="bg-daxul-graphite hover:bg-gray-700 text-white px-6 py-3 daxul-btn-pill text-xs font-bold uppercase flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <Link
                href="/track"
                className="bg-daxul-lime text-daxul-black px-8 py-3 daxul-btn-pill text-xs font-extrabold uppercase hover:bg-white transition-colors"
              >
                Track Order →
              </Link>
            </div>
          </div>
        ) : phase === "awaiting_payment" && order ? (
          <div className="bg-daxul-dark border border-daxul-graphite p-8 sm:p-12 daxul-card-lg max-w-2xl mx-auto text-center space-y-5">
            <h2 className="text-2xl font-extrabold uppercase">Complete Your Payment</h2>
            <p className="text-xs text-gray-400">
              Order <strong className="text-white">#{order.orderNumber}</strong> for{" "}
              <strong className="text-daxul-lime">{money(order.totalAmount)}</strong> is waiting for payment.
            </p>
            {error && (
              <div role="alert" className="text-xs bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl">
                {error}
              </div>
            )}
            <button
              onClick={() => openRazorpay(order)}
              className="bg-daxul-lime text-daxul-black px-8 py-3 daxul-btn text-xs font-extrabold uppercase tracking-widest hover:bg-white transition-colors"
            >
              Pay {money(order.totalAmount)} Now
            </button>
          </div>
        ) : isHydrated && cart.length === 0 ? (
          <div className="text-center py-20 bg-daxul-dark border border-daxul-graphite daxul-card space-y-4 max-w-md mx-auto">
            <p className="text-base font-bold uppercase text-gray-300">Your Checkout Cart is Empty</p>
            <Link
              href="/shop"
              className="bg-daxul-lime text-daxul-black px-8 py-3 rounded-full text-xs font-bold uppercase inline-block"
            >
              Explore Store
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Address & Payment */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-daxul-dark border border-daxul-graphite p-6 daxul-card space-y-4">
                <h3 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-daxul-graphite pb-3">
                  <Truck className="w-4 h-4 text-daxul-lime" />
                  <span>1. Delivery Address</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Full Name *</label>
                    <input type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} uppercase`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Email Address *</label>
                    <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-gray-400 font-bold uppercase">Street Address / Apartment *</label>
                    <input type="text" required autoComplete="street-address" value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">City *</label>
                    <input type="text" required autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className={`${inputCls} uppercase`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">State *</label>
                    <input type="text" required autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} className={`${inputCls} uppercase`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">PIN Code *</label>
                    <input type="text" required inputMode="numeric" autoComplete="postal-code" value={pincode} onChange={(e) => setPincode(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Phone Number *</label>
                    <input type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              {shippingOptions.length > 0 && (
                <div className="bg-daxul-dark border border-daxul-graphite p-6 daxul-card space-y-4">
                  <h3 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-daxul-graphite pb-3">
                    <Truck className="w-4 h-4 text-daxul-lime" />
                    <span>2. Shipping Method</span>
                  </h3>
                  <div className="space-y-3">
                    {shippingOptions.map((o) => (
                      <label
                        key={o.method}
                        className={`flex items-center justify-between p-4 daxul-btn border cursor-pointer transition-all ${
                          selectedMethod === o.method ? "bg-daxul-black border-daxul-lime" : "bg-daxul-dark border-daxul-graphite"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            checked={selectedMethod === o.method}
                            onChange={() => setShippingMethod(o.method)}
                            className="accent-daxul-lime"
                          />
                          <div className="text-xs font-bold text-white uppercase">{o.method === "EXPRESS" ? "Express Shipping" : "Standard Shipping"}</div>
                        </div>
                        <span className="text-xs font-mono font-bold text-daxul-lime">{o.fee === 0 ? "FREE" : money(o.fee)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-daxul-dark border border-daxul-graphite p-6 daxul-card space-y-4">
                <h3 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-daxul-graphite pb-3">
                  <CreditCard className="w-4 h-4 text-daxul-lime" />
                  <span>3. Payment Option</span>
                </h3>

                <div className="space-y-3">
                  <label
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "prepaid" ? "bg-daxul-black border-daxul-lime" : "bg-daxul-dark border-daxul-graphite"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "prepaid"}
                        onChange={() => setPaymentMethod("prepaid")}
                        className="accent-daxul-lime"
                      />
                      <div>
                        <div className="text-xs font-bold text-white uppercase">Prepaid Payment (UPI / Cards / NetBanking)</div>
                        <div className="text-[11px] text-gray-400">Instant slicing priority & fastest dispatch</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-daxul-lime font-bold">RECOMMENDED</span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      !isCodAllowed
                        ? "opacity-40 cursor-not-allowed border-daxul-graphite"
                        : paymentMethod === "cod"
                        ? "bg-daxul-black border-daxul-lime cursor-pointer"
                        : "bg-daxul-dark border-daxul-graphite cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        disabled={!isCodAllowed}
                        checked={paymentMethod === "cod"}
                        onChange={() => isCodAllowed && setPaymentMethod("cod")}
                        className="accent-daxul-lime"
                      />
                      <div>
                        <div className="text-xs font-bold text-white uppercase">Cash on Delivery (COD)</div>
                        {!isCodAllowed ? (
                          <div className="text-[10px] text-amber-300">{codBlockedReason}</div>
                        ) : (
                          <div className="text-[11px] text-gray-400">
                            {(quote ? quote.cod.fee : settings.codFeeEnabled ? settings.codFee : 0) > 0
                              ? `+${money(quote ? quote.cod.fee : settings.codFee)} COD handling fee`
                              : "Pay when your order arrives"}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-daxul-dark border border-daxul-graphite p-6 daxul-card space-y-6 sticky top-28">
                <h3 className="text-base font-extrabold uppercase text-white border-b border-daxul-graphite pb-3">
                  Order Summary ({cart.reduce((a, i) => a + i.quantity, 0)} Objects)
                </h3>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 items-center text-xs">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg bg-daxul-black" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-daxul-black" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white line-clamp-1 uppercase">{item.name}</div>
                        <div className="text-gray-400 truncate">
                          Qty: {item.quantity}
                          {item.variantSelections.length > 0 &&
                            ` • ${item.variantSelections.map((v) => v.variantName).join(", ")}`}
                        </div>
                      </div>
                      <div className="font-extrabold text-white">{money(item.unitPrice * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                {/* Promo code (validated by the server when the order is placed) */}
                <div className="space-y-2">
                  {couponCode ? (
                    <div
                      className={`flex justify-between items-center text-xs p-2 rounded-lg border ${
                        couponQuote && !couponQuote.valid
                          ? "bg-red-500/10 border-red-500/30 text-red-300"
                          : "bg-daxul-lime/10 border-daxul-lime/30 text-daxul-lime"
                      }`}
                    >
                      <span>
                        {!couponQuote
                          ? `Checking code ${couponCode}...`
                          : couponQuote.valid
                            ? `Code ${couponQuote.code} applied: -${money(couponQuote.discountAmount)}`
                            : couponQuote.message}
                      </span>
                      <button type="button" onClick={() => setCouponCode("")} className="underline text-gray-400 hover:text-white text-[10px]">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="PROMO CODE"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleApplyCoupon(e);
                        }}
                        className="flex-1 bg-daxul-black border border-daxul-graphite rounded-xl px-3 py-2 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none focus:border-daxul-lime"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-daxul-graphite hover:bg-daxul-lime hover:text-daxul-black px-4 py-2 daxul-btn text-xs font-bold uppercase transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs text-gray-300 pt-4 border-t border-daxul-graphite">
                  <div className="flex justify-between">
                    <span>{quote ? "Items Subtotal" : "Items Subtotal (est.)"}</span>
                    <span>{money(shownSubtotal)}</span>
                  </div>
                  {shownDiscount > 0 && (
                    <div className="flex justify-between text-daxul-lime">
                      <span>Discount</span>
                      <span>-{money(shownDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{quote ? "Shipping" : "Shipping (est.)"}</span>
                    <span>{shownShipping === 0 ? <span className="text-daxul-lime">FREE</span> : money(shownShipping)}</span>
                  </div>
                  {shownCodFee > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>COD Handling Fee</span>
                      <span>+{money(shownCodFee)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between text-base font-black text-white pt-3 border-t border-daxul-graphite ${quoteLoading ? "opacity-60" : ""}`}>
                    <span>{quote ? "Total" : "Estimated Total"}</span>
                    <span className="text-daxul-lime">{money(shownTotal)}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {quote
                      ? "Totals are calculated securely by our server and re-checked when you place the order."
                      : quoteError
                        ? "Could not reach the pricing service; the final total is calculated by our server when you place the order."
                        : "Calculating your total..."}
                  </p>
                  {blockingIssue && (
                    <div role="alert" className="text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-300 p-2 rounded-lg">
                      {blockingIssue}
                    </div>
                  )}
                </div>

                {error && phase === "form" && (
                  <div role="alert" className="text-xs bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={phase === "submitting" || cart.length === 0 || quoteLoading || !!blockingIssue}
                  className="w-full bg-daxul-lime text-daxul-black py-4 daxul-btn text-xs font-extrabold uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-daxul-lime/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>{phase === "submitting" ? "Placing Order..." : `Place Order (${money(shownTotal)})`}</span>
                </button>

                <div className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-daxul-lime" />
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
