/**
 * Device capability detection for Lithophane AR.
 * Safely probes WebXR, Google Scene Viewer, and Apple Quick Look without crashing
 * if navigator.xr is absent or if run in a restricted environment.
 */

export type ArCapability =
  | 'SUPPORTED_WEBXR'
  | 'SUPPORTED_SCENE_VIEWER'
  | 'SUPPORTED_QUICK_LOOK'
  | 'UNSUPPORTED';

export interface DeviceArInfo {
  capability: ArCapability;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsCameraAr: boolean;
  recommendedMode: 'webxr' | 'scene-viewer' | 'quick-look' | 'qr-handoff';
}

export async function detectDeviceAr(overrideUserAgent?: string): Promise<DeviceArInfo> {
  const ua = overrideUserAgent ?? (typeof window !== 'undefined' ? window.navigator?.userAgent || '' : '');
  if (!ua && typeof window === 'undefined') {
    return {
      capability: 'UNSUPPORTED',
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      supportsCameraAr: false,
      recommendedMode: 'qr-handoff',
    };
  }
  const hasWindow = typeof window !== 'undefined';
  const nav = hasWindow ? window.navigator : (typeof navigator !== 'undefined' ? navigator : undefined);

  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (typeof nav?.platform === 'string' &&
      nav.platform === 'MacIntel' &&
      ((nav as any).maxTouchPoints || 0) > 1);

  const isMobile = isAndroid || isIOS || /Mobile|Tablet/i.test(ua);

  // 1. Probe WebXR immersive-ar support (modern Chrome on Android with ARCore)
  let supportsWebXR = false;
  try {
    if (nav?.xr && typeof nav.xr.isSessionSupported === 'function') {
      supportsWebXR = await nav.xr.isSessionSupported('immersive-ar');
    }
  } catch {
    supportsWebXR = false;
  }

  if (supportsWebXR) {
    return {
      capability: 'SUPPORTED_WEBXR',
      isMobile,
      isIOS,
      isAndroid,
      supportsCameraAr: true,
      recommendedMode: 'webxr',
    };
  }

  // 2. iOS Quick Look (Safari on iOS 12+ or anchor rel="ar")
  if (isIOS) {
    let supportsRelAr = false;
    try {
      const a = document.createElement('a');
      supportsRelAr = Boolean(a.relList && a.relList.supports && a.relList.supports('ar'));
    } catch {
      supportsRelAr = false;
    }

    // iOS Safari WebKit supports Quick Look for AR assets
    const isSafari = /WebKit/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua);
    if (supportsRelAr || isSafari) {
      return {
        capability: 'SUPPORTED_QUICK_LOOK',
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        supportsCameraAr: true,
        recommendedMode: 'quick-look',
      };
    }
  }

  // 3. Android Google Scene Viewer fallback
  if (isAndroid) {
    return {
      capability: 'SUPPORTED_SCENE_VIEWER',
      isMobile: true,
      isIOS: false,
      isAndroid: true,
      supportsCameraAr: true,
      recommendedMode: 'scene-viewer',
    };
  }

  // Desktop or unsupported browser
  return {
    capability: 'UNSUPPORTED',
    isMobile,
    isIOS,
    isAndroid,
    supportsCameraAr: false,
    recommendedMode: 'qr-handoff',
  };
}
