"use client";

import React, { useState } from "react";
import { MapPin, Truck, Check, AlertCircle } from "lucide-react";
import { checkPincode, type PincodeResult } from "@/lib/pincode";

export default function PincodeEstimator({
  productionTimeDays = 2,
}: {
  productionTimeDays?: number;
}) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<PincodeResult | null>(null);
  const [checked, setChecked] = useState(false);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode.trim()) return;
    const res = checkPincode(pincode, productionTimeDays);
    setResult(res);
    setChecked(true);
  };

  return (
    <div className="bg-white border border-daxul-black/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-daxul-black flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-daxul-black" />
          <span>Delivery & Serviceability Check</span>
        </span>
        <span className="text-[10px] font-mono text-[#71717A]">India</span>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter 6-digit PIN code"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ""));
            setChecked(false);
          }}
          className="flex-1 bg-[#F3F0E9] border border-daxul-black/15 focus:border-daxul-black rounded-lg px-3 py-2 text-xs font-mono text-daxul-black placeholder:text-[#71717A]/70 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-daxul-black hover:bg-[#242426] text-daxul-bone px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
        >
          Check
        </button>
      </form>

      {checked && result && (
        <div className="pt-1 space-y-2 text-xs">
          {result.valid ? (
            <div className="space-y-1.5 bg-[#F3F0E9]/80 p-3 rounded-lg border border-daxul-black/10">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Serviceable to {result.state} ({result.pincode})</span>
              </div>
              <div className="text-[#555550] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-daxul-black shrink-0" />
                <span>{result.estimatedDeliveryText}</span>
              </div>
              <div className="text-[10px] text-[#71717A] pt-0.5">
                • Standard Courier: Free on orders over ₹1,999<br />
                • On-demand fabrication: ~{result.estimatedDispatchDays} days before dispatch<br />
                • {result.codAvailable ? "Cash on Delivery (COD) supported" : "Prepaid only for remote region"}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{result.estimatedDeliveryText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
