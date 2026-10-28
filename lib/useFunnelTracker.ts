"use client";

import { useEffect, useRef } from "react";
import type { FunnelStep } from "./funnelAnalytics";

const SESSION_KEY = "daxul_funnel_session";

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let sid = window.sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    window.sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function trackFunnel(
  step: FunnelStep,
  payload?: {
    productId?: string | null;
    orderId?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  if (typeof window === "undefined") return;

  try {
    const sessionId = getSessionId();
    const body = {
      step,
      sessionId,
      productId: payload?.productId || null,
      orderId: payload?.orderId || null,
      metadata: payload?.metadata || null,
    };

    // Use sendBeacon if available, otherwise fetch with keepalive
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/funnel", JSON.stringify(body));
    } else {
      fetch("/api/analytics/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {
        // Silently ignore telemetry failure
      });
    }
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Hook to automatically track product view once per component mount.
 */
export function useTrackProductView(productId: string) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!productId || trackedRef.current) return;
    trackedRef.current = true;
    trackFunnel("VIEW_PRODUCT", { productId });
  }, [productId]);
}
