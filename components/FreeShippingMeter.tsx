"use client";

import React from "react";
import { Check, Truck } from "lucide-react";
import { formatMoney } from "@/lib/cartPricing";

interface FreeShippingMeterProps {
  subtotal: number;
  threshold: number;
  currencySymbol?: string;
  isExpressEligible?: boolean;
  variant?: "drawer" | "checkout" | "banner";
}

export default function FreeShippingMeter({
  subtotal,
  threshold,
  currencySymbol = "₹",
  isExpressEligible = false,
  variant = "drawer",
}: FreeShippingMeterProps) {
  if (threshold <= 0) return null;

  const money = (n: number) => formatMoney(currencySymbol, n);
  const isUnlocked = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const percentage = Math.min(100, Math.max(0, Math.round((subtotal / threshold) * 100)));

  const unlockedMessage = isExpressEligible
    ? "Free Express shipping unlocked"
    : "Free shipping unlocked";

  return (
    <div
      className={`border-b border-daxul-black/10 bg-[#EAE5DA] transition-all ${
        variant === "drawer"
          ? "px-5 py-3 space-y-2"
          : variant === "checkout"
          ? "p-4 rounded-xl border border-daxul-black/10 space-y-2 bg-white"
          : "px-4 py-2 space-y-1"
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold text-daxul-black">
        <div className="flex items-center gap-1.5">
          {isUnlocked ? (
            <span className="w-4 h-4 rounded-full bg-daxul-lime text-daxul-black flex items-center justify-center shrink-0 border border-daxul-black/20">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          ) : (
            <Truck className="w-3.5 h-3.5 text-daxul-black/70 shrink-0" />
          )}
          <span className={isUnlocked ? "font-bold text-daxul-black" : "text-[#555550]"}>
            {isUnlocked ? (
              <span>{unlockedMessage}</span>
            ) : (
              <span>
                Add <span className="font-bold text-daxul-black">{money(remaining)}</span> for free shipping
              </span>
            )}
          </span>
        </div>

        <span className="font-mono text-[10px] text-[#71717A] tracking-wider uppercase">
          {isUnlocked ? "100%" : `${percentage}%`}
        </span>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full bg-daxul-black/10 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${
            isUnlocked ? "bg-daxul-lime" : "bg-daxul-black"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
