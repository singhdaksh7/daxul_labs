/**
 * Privacy-safe analytics for Lithophane AR.
 * Strictly adheres to requirement 25 and 26:
 * NO camera imagery is ever collected, uploaded, analyzed, or stored.
 */

export type ArAnalyticsEvent =
  | 'AR_VIEW_CLICKED'
  | 'AR_SUPPORTED'
  | 'AR_UNSUPPORTED'
  | 'AR_STARTED'
  | 'AR_PLACED'
  | 'AR_FAILED'
  | 'AR_EXITED';

export interface ArAnalyticsPayload {
  varietyKey?: string;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number | null;
  mode?: string;
  deviceCapability?: string;
  reason?: string;
  error?: string;
}

export function trackArEvent(event: ArAnalyticsEvent, payload?: ArAnalyticsPayload) {
  if (typeof window === 'undefined') return;

  const data = {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Dispatch custom browser event for in-page observation / tests
  try {
    const customEvt = new CustomEvent('daxul:ar-analytics', { detail: data });
    window.dispatchEvent(customEvt);
  } catch {
    // ignore
  }

  // Safe beacon dispatch if supported
  try {
    const body = JSON.stringify(data);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/ar', body);
    } else if (typeof fetch !== 'undefined') {
      fetch('/api/analytics/ar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // telemetry failure is non-blocking
  }
}

