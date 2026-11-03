"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { X, Smartphone, QrCode, Copy, Check, Camera, Box, AlertTriangle, ArrowRight } from "lucide-react";
import { detectDeviceAr, type DeviceArInfo } from "@/lib/lithophaneArDetection";
import { trackArEvent } from "@/lib/lithophaneArAnalytics";
import { formatDimensionsMm } from "@/lib/lithophaneAr";

const LithophaneModelViewer = dynamic(() => import("./LithophaneModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-widest text-zinc-500">
      Loading AR Engine...
    </div>
  ),
});

export interface LithophaneArModalProps {
  isOpen: boolean;
  onClose: () => void;
  varietyName: string;
  varietyKey: string;
  widthMm: number;
  heightMm: number;
  depthMm?: number | null;
  priceText?: string;
  lightOn: boolean;
  onToggleLight?: () => void;
  supportsLight?: boolean;
  generationId: string;
  hash: string;
  glbBuffer?: ArrayBuffer | null;
  onPrepareGlb: () => Promise<ArrayBuffer>;
}

export default function LithophaneArModal({
  isOpen,
  onClose,
  varietyName,
  varietyKey,
  widthMm,
  heightMm,
  depthMm,
  priceText,
  lightOn,
  onToggleLight,
  supportsLight = true,
  generationId,
  hash,
  glbBuffer,
  onPrepareGlb,
}: LithophaneArModalProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceArInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [preparingGlb, setPreparingGlb] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modelBlobUrl, setModelBlobUrl] = useState<string | null>(null);
  const [inCameraAr, setInCameraAr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dimsText = formatDimensionsMm(widthMm, heightMm, depthMm);

  // 1. Detect capability on modal open
  useEffect(() => {
    if (!isOpen) {
      setInCameraAr(false);
      setError(null);
      return;
    }

    trackArEvent("AR_VIEW_CLICKED", {
      varietyKey,
      widthMm,
      heightMm,
      depthMm,
    });

    detectDeviceAr().then((info) => {
      setDeviceInfo(info);
      if (info.supportsCameraAr) {
        trackArEvent("AR_SUPPORTED", { deviceCapability: info.capability });
      } else {
        trackArEvent("AR_UNSUPPORTED", { deviceCapability: info.capability });
      }
    });
  }, [isOpen, varietyKey, widthMm, heightMm, depthMm]);

  // 2. Setup session for desktop QR code handoff
  useEffect(() => {
    if (!isOpen || !deviceInfo) return;
    if (deviceInfo.supportsCameraAr) return; // Mobile device will run in-page

    let dead = false;
    setLoading(true);

    const initHandoff = async () => {
      try {
        let glbBase64: string | undefined = undefined;
        try {
          const buf = glbBuffer || (await onPrepareGlb());
          glbBase64 = Buffer.from(buf).toString("base64");
        } catch (e) {
          console.warn("Could not pre-export GLB for QR handoff:", e);
        }

        const res = await fetch("/api/lithophane/ar/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationId,
            hash,
            configSummary: {
              varietyName,
              widthMm,
              heightMm,
              depthMm,
              lightOn,
            },
            glbBase64,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not generate AR session");
        if (!dead) {
          setQrDataUrl(data.qrCodeDataUrl);
          setSessionUrl(data.absoluteUrl || window.location.origin + data.url);
        }
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : "Failed to generate QR session");
      } finally {
        if (!dead) setLoading(false);
      }
    };

    void initHandoff();

    return () => {
      dead = true;
    };
  }, [isOpen, deviceInfo, generationId, hash, varietyName, widthMm, heightMm, depthMm, lightOn, glbBuffer, onPrepareGlb]);

  // 3. Launch mobile in-camera AR
  const handleStartMobileAr = async () => {
    setPreparingGlb(true);
    setError(null);
    try {
      const buf = glbBuffer || (await onPrepareGlb());
      const blob = new Blob([buf], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      setModelBlobUrl(url);
      setInCameraAr(true);
    } catch (err) {
      console.error("Failed to prepare AR model:", err);
      setError("Could not prepare the 3D model for AR.");
      trackArEvent("AR_FAILED", { error: String(err) });
    } finally {
      setPreparingGlb(false);
    }
  };

  const handleCopyLink = () => {
    if (!sessionUrl) return;
    navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Active full-screen AR Viewer mode for mobile
  if (inCameraAr && modelBlobUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <LithophaneModelViewer
          modelUrl={modelBlobUrl}
          varietyName={varietyName}
          dimensionsText={dimsText}
          priceText={priceText}
          lightOn={lightOn}
          onToggleLight={onToggleLight}
          supportsLight={supportsLight}
          onClose={() => {
            setInCameraAr(false);
            onClose();
          }}
        />
      </div>
    );
  }

  const isMobileAr = deviceInfo?.supportsCameraAr === true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      data-testid="lithophane-ar-modal"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#121214] text-daxul-bone shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-daxul-lime/10 text-daxul-lime">
              {isMobileAr ? <Camera className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-daxul-lime">
                {isMobileAr ? "Live AR Preview" : "View On Your Table"}
              </h3>
              <p className="text-sm font-bold uppercase text-white">{varietyName}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="ar-modal-close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Physical Size badge */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-white/60">Selected Size</span>
              <span className="font-mono text-xs font-bold text-daxul-lime">{dimsText}</span>
            </div>
            <p className="mt-1 text-[11px] text-white/60">
              AR shows the product approximately at its selected real-world manufacturing size.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Mobile Pre-entry Guidance Experience */}
          {isMobileAr ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-white">How to view on your table:</p>
                <ol className="space-y-2 text-xs text-white/80">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-daxul-lime text-[11px] font-bold text-black">
                      1
                    </span>
                    <span>Tap <strong>Launch AR Camera</strong> below.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-daxul-lime text-[11px] font-bold text-black">
                      2
                    </span>
                    <span>Point your phone at a flat surface (table or desk) and move slowly.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-daxul-lime text-[11px] font-bold text-black">
                      3
                    </span>
                    <span>Tap the detected surface to place your lithophane.</span>
                  </li>
                </ol>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  data-testid="ar-start-camera-btn"
                  disabled={preparingGlb}
                  onClick={handleStartMobileAr}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-daxul-lime px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black shadow-lg hover:bg-daxul-lime/90 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {preparingGlb ? (
                    "Preparing your live preview..."
                  ) : (
                    <>
                      <Box className="h-4 w-4" /> Launch AR Camera
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Desktop QR Code Handoff Experience */
            <div className="space-y-4 text-center">
              <p className="text-xs text-white/70">
                Desktop cameras cannot place objects on a table. Scan this QR code with your phone camera to view it live:
              </p>

              <div className="mx-auto flex w-fit items-center justify-center rounded-2xl bg-white p-3.5 shadow-xl">
                {loading || !qrDataUrl ? (
                  <div className="flex h-52 w-52 items-center justify-center font-mono text-[11px] uppercase tracking-widest text-black/50">
                    Generating QR code...
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Scan to view AR on phone"
                    data-testid="ar-qr-code"
                    className="h-52 w-52 rounded-lg"
                  />
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!sessionUrl}
                  data-testid="ar-copy-link-btn"
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-daxul-lime" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Link Copied" : "Copy Phone Link"}
                </button>
                <button
                  type="button"
                  data-testid="ar-cancel-btn"
                  onClick={onClose}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white"
                >
                  Continue in 3D
                </button>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Temporary link valid for 15 minutes · Private to you
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

