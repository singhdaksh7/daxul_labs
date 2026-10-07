"use client";

/**
 * Debounced client for POST /api/quote. The server response is the source of truth for every
 * number shown in the cart drawer and checkout; local arithmetic is only a fallback estimate.
 */
import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/storeContext";
import type { QuoteResponse } from "@/lib/quoteResponse";

export interface UseQuoteOptions {
  cart: CartItem[];
  couponCode?: string;
  paymentMethod?: "prepaid" | "cod";
  shippingMethod?: "STANDARD" | "EXPRESS" | null;
  pincode?: string;
  enabled?: boolean;
  debounceMs?: number;
}

export function useQuote({ cart, couponCode, paymentMethod, shippingMethod, pincode, enabled = true, debounceMs = 400 }: UseQuoteOptions) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const body = useMemo(() => {
    if (!cart.length) return null;
    return JSON.stringify({
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variantSelections: i.variantSelections.map((v) => ({ groupId: v.groupId, variantId: v.variantId })),
        customizations: i.customizations,
      })),
      couponCode: couponCode || undefined,
      paymentMethod,
      shippingMethod: shippingMethod || undefined,
      pincode: pincode && /^\d{6}$/.test(pincode) ? pincode : undefined,
    });
  }, [cart, couponCode, paymentMethod, shippingMethod, pincode]);

  useEffect(() => {
    if (!enabled || !body) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error((data && data.error) || "Could not calculate totals");
        setQuote(data as QuoteResponse);
        setError(null);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Could not calculate totals");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, debounceMs);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [body, enabled, debounceMs]);

  return { quote, loading, error };
}
