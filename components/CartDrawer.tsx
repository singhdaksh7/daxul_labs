"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/storeContext";
import { useSiteSettings } from "@/lib/siteContext";
import { formatMoney } from "@/lib/cartPricing";
import { useQuote } from "@/lib/useQuote";
import FreeShippingMeter from "./FreeShippingMeter";
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";

export default function CartDrawer() {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    isCartOpen,
    setIsCartOpen,
    couponCode,
    setCouponCode,
  } = useCart();
  const siteSettings = useSiteSettings();
  const money = (n: number) => formatMoney(siteSettings.currencySymbol, n);

  const [couponInput, setCouponInput] = useState("");

  // Server quote (debounced)
  const { quote, loading: quoteLoading } = useQuote({ cart, couponCode, enabled: isCartOpen });

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shownSubtotal = quote ? quote.subtotal : subtotal;
  const shownDiscount = quote ? quote.discountAmount : 0;
  const afterDiscount = Math.max(0, shownSubtotal - shownDiscount);
  const freeShippingThreshold = quote?.shipping.freeShippingThreshold ?? siteSettings.freeShippingThreshold;
  const estShipping = afterDiscount >= freeShippingThreshold ? 0 : siteSettings.standardShippingFee;
  const shownShipping = quote ? quote.shipping.fee : estShipping;
  const shownTotal = quote ? quote.total : afterDiscount + estShipping;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponCode(couponInput);
    setCouponInput("");
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-daxul-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="flex-1 cursor-pointer" onClick={() => setIsCartOpen(false)} />

      {/* Cart Side Drawer */}
      <div className="w-full max-w-md bg-daxul-bone border-l border-daxul-black/15 flex flex-col h-full shadow-2xl relative animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-daxul-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-daxul-black" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-daxul-black">Your Cart</h2>
            <span className="bg-daxul-black/10 text-daxul-black text-xs font-semibold px-2 py-0.5 rounded-full font-mono">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
            className="p-1.5 text-daxul-black/60 hover:text-daxul-black rounded-lg hover:bg-daxul-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Free Shipping Progress Meter */}
        <FreeShippingMeter
          subtotal={afterDiscount}
          threshold={freeShippingThreshold}
          currencySymbol={siteSettings.currencySymbol}
          isExpressEligible={false}
          variant="drawer"
        />

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-24 space-y-3 text-[#71717A]">
              <p className="text-sm font-semibold uppercase text-daxul-black">Your cart is empty.</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-xs font-semibold uppercase text-daxul-black underline"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="p-3.5 bg-white border border-daxul-black/10 rounded-xl space-y-3"
              >
                <div className="flex gap-3.5">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg bg-[#EAE5DA] shrink-0 border border-daxul-black/10"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-[#EAE5DA] shrink-0" />
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-xs font-bold text-daxul-black uppercase truncate">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Remove item"
                        className="text-[#71717A] hover:text-red-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Variant selections */}
                    {item.variantSelections && item.variantSelections.length > 0 && (
                      <p className="text-[11px] text-[#71717A] mt-0.5 font-medium">
                        {item.variantSelections.map((v) => `${v.groupName}: ${v.variantName}`).join(" • ")}
                      </p>
                    )}

                    {/* Customization details */}
                    {item.customizationDetails && item.customizationDetails.length > 0 && (
                      <div className="text-[11px] text-[#71717A] mt-1 space-y-0.5">
                        {item.customizationDetails.map((cd, cIdx) => (
                          <div key={cIdx} className="truncate">
                            <span className="font-semibold text-daxul-black">{cd.label}:</span>{" "}
                            {cd.display}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-daxul-black/5">
                      <div className="flex items-center gap-2 border border-daxul-black/15 rounded-lg px-2 py-0.5 bg-[#F3F0E9]">
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="text-[#71717A] hover:text-daxul-black disabled:opacity-30"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-daxul-black min-w-[14px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="text-[#71717A] hover:text-daxul-black"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-xs font-bold text-daxul-black">
                        {money(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Summary */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-daxul-black/10 bg-white space-y-4">
            {/* Coupon row */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 rounded-lg px-3 py-1.5 text-xs text-daxul-black uppercase focus:outline-none focus:border-daxul-black"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-daxul-black text-daxul-bone text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-daxul-black/85 transition-colors"
              >
                Apply
              </button>
            </form>

            {couponCode && (
              <div className="flex justify-between items-center text-xs text-[#71717A]">
                <span>Coupon ({couponCode.toUpperCase()}):</span>
                <button onClick={() => setCouponCode("")} className="text-red-600 underline">
                  Remove
                </button>
              </div>
            )}

            {/* Subtotal */}
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-[#555550]">
                <span>Subtotal</span>
                <span>{money(shownSubtotal)}</span>
              </div>
              {shownDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>-{money(shownDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#555550]">
                <span>Estimated Shipping</span>
                <span>{shownShipping === 0 ? "Free" : money(shownShipping)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-daxul-black pt-2 border-t border-daxul-black/10">
                <span>Estimated Total</span>
                <span>{money(shownTotal)}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Link
              href="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-semibold py-4 rounded-lg text-xs uppercase tracking-widest border border-daxul-black transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
