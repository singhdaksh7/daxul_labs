"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/storeContext';
import { useSiteSettings } from '@/lib/siteContext';
import { formatMoney } from '@/lib/cartPricing';
import { useQuote } from '@/lib/useQuote';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ShoppingBag, Truck } from 'lucide-react';

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

  const [couponInput, setCouponInput] = useState('');

  // Server quote (debounced). The local arithmetic below is only the fallback estimate.
  const { quote, loading: quoteLoading } = useQuote({ cart, couponCode, enabled: isCartOpen });

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  const hasPrepaidOnlyItems = cart.some(
    (item) =>
      item.prepaidOnly ||
      !item.codEnabled ||
      (item.customizable && siteSettings.customProductsPrepaidOnly)
  );
  const freeShippingThreshold = quote?.shipping.freeShippingThreshold ?? siteSettings.freeShippingThreshold;
  const shownSubtotal = quote ? quote.subtotal : subtotal;
  const shownDiscount = quote ? quote.discountAmount : 0;
  const afterDiscount = Math.max(0, shownSubtotal - shownDiscount);
  const estShipping = afterDiscount >= freeShippingThreshold ? 0 : siteSettings.standardShippingFee;
  const shownShipping = quote ? quote.shipping.fee : estShipping;
  const shownTotal = quote ? quote.total : afterDiscount + estShipping;
  const progressPercent = freeShippingThreshold > 0 ? Math.min(100, (afterDiscount / freeShippingThreshold) * 100) : 100;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - afterDiscount);
  const couponQuote = quote?.coupon ?? null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponCode(couponInput);
    setCouponInput('');
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Backdrop click to close */}
      <div className="flex-1 cursor-pointer" onClick={() => setIsCartOpen(false)} />

      {/* Cart Side Drawer */}
      <div className="w-full max-w-md bg-daxul-black border-l border-daxul-graphite flex flex-col h-full shadow-2xl relative animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-daxul-graphite flex items-center justify-between bg-daxul-dark">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-daxul-lime" />
            <h2 className="text-base font-extrabold uppercase tracking-widest text-white">Your Cart</h2>
            <span className="bg-daxul-graphite text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-daxul-graphite transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="bg-daxul-dark/50 border-b border-daxul-graphite p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-gray-300 font-medium">
            <span className="flex items-center gap-1.5 text-gray-400">
              <Truck className="w-3.5 h-3.5 text-daxul-lime" />
              {amountNeededForFreeShipping === 0 ? (
                <span className="text-daxul-lime font-bold">🎉 Free Shipping Unlocked!</span>
              ) : (
                <span>Add {money(amountNeededForFreeShipping)} more for FREE shipping</span>
              )}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-daxul-graphite rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-daxul-lime/50 to-daxul-lime transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-daxul-graphite/60">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4 py-12">
              <div className="w-16 h-16 rounded-full bg-daxul-dark flex items-center justify-center border border-daxul-graphite">
                <ShoppingBag className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">Your cart is currently empty</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="bg-daxul-lime text-daxul-black px-6 py-2.5 daxul-btn-pill text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors shadow-lg shadow-daxul-lime/10"
              >
                Explore Catalog
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 bg-daxul-dark daxul-card-sm overflow-hidden relative border border-daxul-graphite shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider line-clamp-1">
                      {item.name}
                    </h3>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="text-[11px] text-gray-400 space-y-0.5">
                    {item.variantSelections.map((v) => (
                      <div key={v.groupId}>{v.groupName}: <span className="text-gray-200">{v.variantName}</span></div>
                    ))}
                  </div>

                  {/* Customizations Badge */}
                  {item.customizationDetails.length > 0 && (
                    <div className="mt-1 bg-daxul-dark p-2 rounded border border-daxul-graphite text-[10px] text-gray-300 space-y-0.5">
                      <div className="font-bold text-daxul-lime uppercase tracking-wider">Custom Config:</div>
                      {item.customizationDetails.map((d) => (
                        <div key={d.fieldId} className="truncate">
                          <span className="text-gray-500">{d.label}:</span> {d.display}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price & Quantity control */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center border border-daxul-graphite bg-daxul-dark rounded-lg">
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="p-1 hover:text-daxul-lime transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="p-1 hover:text-daxul-lime transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-white">
                        {money(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-daxul-graphite bg-daxul-dark space-y-4">
            {/* Promo Code Form */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="PROMO CODE (e.g. DAXUL10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full bg-daxul-black border border-daxul-graphite daxul-btn pl-9 pr-3 py-2 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none focus:border-daxul-lime"
                />
              </div>
              <button
                type="submit"
                className="bg-daxul-graphite hover:bg-daxul-lime hover:text-daxul-black px-4 py-2 daxul-btn text-xs font-bold uppercase transition-all"
              >
                Apply
              </button>
            </form>

            {/* Applied Coupon Info */}
            {couponCode && (
              <div
                className={`flex justify-between items-center text-xs p-2 rounded-lg border ${
                  couponQuote && !couponQuote.valid
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-daxul-lime/10 border-daxul-lime/30 text-daxul-lime'
                }`}
              >
                <span>
                  {!couponQuote
                    ? `Checking code ${couponCode}...`
                    : couponQuote.valid
                      ? `Code ${couponQuote.code} applied: -${money(couponQuote.discountAmount)}`
                      : couponQuote.message}
                </span>
                <button onClick={() => setCouponCode('')} className="underline text-gray-400 hover:text-white text-[10px]">
                  Remove
                </button>
              </div>
            )}

            {/* Calculations */}
            <div className="space-y-1.5 text-xs text-gray-300 pt-1 border-t border-daxul-graphite">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(shownSubtotal)}</span>
              </div>
              {shownDiscount > 0 && (
                <div className="flex justify-between text-daxul-lime">
                  <span>Discount</span>
                  <span>-{money(shownDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{quote ? 'Shipping' : 'Est. Shipping'}</span>
                <span>
                  {shownShipping === 0 ? <span className="text-daxul-lime">FREE</span> : money(shownShipping)}
                </span>
              </div>
              <div className={`flex justify-between text-sm font-extrabold text-white pt-2 border-t border-daxul-graphite ${quoteLoading ? 'opacity-60' : ''}`}>
                <span>{quote ? 'Total' : 'Estimated Total'}</span>
                <span className="text-daxul-lime">{money(shownTotal)}</span>
              </div>
              {quote && quote.issues.some((i) => i.code === 'stock' || i.code === 'line') && (
                <div className="text-[10px] text-amber-300">{quote.issues.find((i) => i.code === 'stock' || i.code === 'line')?.message}</div>
              )}
            </div>

            {/* COD Notice if prepaid only items */}
            {hasPrepaidOnlyItems && (
              <div className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 p-2 rounded-lg">
                Items in your cart require prepaid payment (no Cash on Delivery).
              </div>
            )}

            {/* Checkout CTA */}
            <Link
              href="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-daxul-lime text-daxul-black font-extrabold py-3.5 daxul-btn uppercase tracking-widest text-xs shadow-xl shadow-daxul-lime/20 hover:bg-white transition-colors"
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
