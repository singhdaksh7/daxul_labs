"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/storeContext';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ShoppingBag, Truck } from 'lucide-react';

export default function CartDrawer() {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    isCartOpen,
    setIsCartOpen,
    siteSettings,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; text: string } | null>(null);

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.totalUnitPrice * item.quantity, 0);
  
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discount = appliedCoupon.discountValue;
    }
  }

  const hasPrepaidOnlyItems = cart.some((item) => item.product.prepaidOnly);
  const freeShippingThreshold = siteSettings.freeShippingThreshold;
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    const res = applyCoupon(couponCode);
    setCouponMsg({ success: res.success, text: res.message });
    if (res.success) setCouponCode('');
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Backdrop click to close */}
      <div className="flex-1 cursor-pointer" onClick={() => setIsCartOpen(false)} />

      {/* Cart Side Drawer */}
      <div className="w-full max-w-md bg-[#0B0B0C] border-l border-[#242426] flex flex-col h-full shadow-2xl relative animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#242426] flex items-center justify-between bg-[#151515]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C8FF35]" />
            <h2 className="text-base font-extrabold uppercase tracking-widest text-white">Your Cart</h2>
            <span className="bg-[#242426] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#242426] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="bg-[#151515]/50 border-b border-[#242426] p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-gray-300 font-medium">
            <span className="flex items-center gap-1.5 text-gray-400">
              <Truck className="w-3.5 h-3.5 text-[#C8FF35]" />
              {amountNeededForFreeShipping === 0 ? (
                <span className="text-[#C8FF35] font-bold">🎉 Free Shipping Unlocked!</span>
              ) : (
                <span>Add {siteSettings.currencySymbol}{amountNeededForFreeShipping} more for FREE shipping</span>
              )}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#242426] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C8FF35]/50 to-[#C8FF35] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-[#242426]/60">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4 py-12">
              <div className="w-16 h-16 rounded-full bg-[#151515] flex items-center justify-center border border-[#242426]">
                <ShoppingBag className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">Your cart is currently empty</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="bg-[#C8FF35] text-[#0B0B0C] px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors shadow-lg shadow-[#C8FF35]/10"
              >
                Explore Catalog
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 bg-[#151515] rounded-xl overflow-hidden relative border border-[#242426] shrink-0">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider line-clamp-1">
                      {item.product.name}
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
                    {item.selectedFinish && <div>Finish: <span className="text-gray-200">{item.selectedFinish}</span></div>}
                    {item.selectedColor && <div>Color: <span className="text-gray-200">{item.selectedColor}</span></div>}
                    {item.selectedSize && <div>Size: <span className="text-gray-200">{item.selectedSize}</span></div>}
                  </div>

                  {/* Customizations Badge */}
                  {Object.keys(item.customizations).length > 0 && (
                    <div className="mt-1 bg-[#151515] p-2 rounded border border-[#242426] text-[10px] text-gray-300 space-y-0.5">
                      <div className="font-bold text-[#C8FF35] uppercase tracking-wider">Custom Config:</div>
                      {Object.entries(item.customizations).map(([key, val]) => (
                        <div key={key} className="truncate">
                          <span className="text-gray-500">{key}:</span> {val}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price & Quantity control */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center border border-[#242426] bg-[#151515] rounded-lg">
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="p-1 hover:text-[#C8FF35] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="p-1 hover:text-[#C8FF35] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-white">
                        {siteSettings.currencySymbol}{item.totalUnitPrice * item.quantity}
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
          <div className="p-5 border-t border-[#242426] bg-[#151515] space-y-4">
            {/* Promo Code Form */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="PROMO CODE (e.g. DAXUL10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full bg-[#0B0B0C] border border-[#242426] rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none focus:border-[#C8FF35]"
                />
              </div>
              <button
                type="submit"
                className="bg-[#242426] hover:bg-[#C8FF35] hover:text-[#0B0B0C] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Apply
              </button>
            </form>

            {/* Applied Coupon Info */}
            {appliedCoupon && (
              <div className="flex justify-between items-center text-xs bg-[#C8FF35]/10 border border-[#C8FF35]/30 p-2 rounded-lg text-[#C8FF35]">
                <span>Code {appliedCoupon.code} applied</span>
                <button onClick={removeCoupon} className="underline text-gray-400 hover:text-white text-[10px]">
                  Remove
                </button>
              </div>
            )}
            {couponMsg && !appliedCoupon && (
              <div className={`text-[11px] ${couponMsg.success ? 'text-green-400' : 'text-red-400'}`}>
                {couponMsg.text}
              </div>
            )}

            {/* Calculations */}
            <div className="space-y-1.5 text-xs text-gray-300 pt-1 border-t border-[#242426]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{siteSettings.currencySymbol}{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#C8FF35]">
                  <span>Discount</span>
                  <span>-{siteSettings.currencySymbol}{discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Est. Shipping</span>
                <span>
                  {subtotal >= freeShippingThreshold ? (
                    <span className="text-[#C8FF35]">FREE</span>
                  ) : (
                    `${siteSettings.currencySymbol}${siteSettings.standardShippingFee}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-[#242426]">
                <span>Estimated Total</span>
                <span className="text-[#C8FF35]">
                  {siteSettings.currencySymbol}
                  {Math.max(0, subtotal - discount + (subtotal >= freeShippingThreshold ? 0 : siteSettings.standardShippingFee))}
                </span>
              </div>
            </div>

            {/* COD Notice if prepaid only items */}
            {hasPrepaidOnlyItems && (
              <div className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 p-2 rounded-lg">
                ⚠️ Custom personalized items in your cart require Prepaid payment.
              </div>
            )}

            {/* Checkout CTA */}
            <Link
              href="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-[#C8FF35] text-[#0B0B0C] font-extrabold py-3.5 rounded-xl uppercase tracking-widest text-xs shadow-xl shadow-[#C8FF35]/20 hover:bg-white transition-colors"
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
