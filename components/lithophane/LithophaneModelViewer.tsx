"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, RotateCcw, X, Lightbulb, LightbulbOff, AlertTriangle } from "lucide-react";
import { trackArEvent } from "@/lib/lithophaneArAnalytics";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        "ios-src"?: string;
        alt?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "ar-scale"?: string;
        "ar-placement"?: string;
        "camera-controls"?: boolean;
        "touch-action"?: string;
        "interaction-prompt"?: string;
        poster?: string;
        reveal?: string;
        loading?: string;
        exposure?: string | number;
        "shadow-intensity"?: string | number;
        "shadow-softness"?: string | number;
      };
    }
  }
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string;
          "ios-src"?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "ar-scale"?: string;
          "ar-placement"?: string;
          "camera-controls"?: boolean;
          "touch-action"?: string;
          "interaction-prompt"?: string;
          poster?: string;
          reveal?: string;
          loading?: string;
          exposure?: string | number;
          "shadow-intensity"?: string | number;
          "shadow-softness"?: string | number;
        };
      }
    }
  }
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        "ios-src"?: string;
        alt?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "ar-scale"?: string;
        "ar-placement"?: string;
        "camera-controls"?: boolean;
        "touch-action"?: string;
        "interaction-prompt"?: string;
        poster?: string;
        reveal?: string;
        loading?: string;
        exposure?: string | number;
        "shadow-intensity"?: string | number;
        "shadow-softness"?: string | number;
      };
    }
  }
}

export interface ModelViewerProps {
  modelUrl: string;
  iosSrcUrl?: string;
  varietyName: string;
  dimensionsText: string;
  priceText?: string;
  lightOn?: boolean;
  onToggleLight?: () => void;
  supportsLight?: boolean;
  onClose: () => void;
}

export default function LithophaneModelViewer({
  modelUrl,
  iosSrcUrl,
  varietyName,
  dimensionsText,
  priceText,
  lightOn = false,
  onToggleLight,
  supportsLight = true,
  onClose,
}: ModelViewerProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [arStatus, setArStatus] = useState<"idle" | "tracking" | "placed" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isViewerLoaded, setIsViewerLoaded] = useState(false);

  useEffect(() => {
    // Dynamically register @google/model-viewer in client
    import("@google/model-viewer")
      .then(() => setIsViewerLoaded(true))
      .catch((err) => {
        console.error("Could not load @google/model-viewer", err);
        setErrorMsg("Failed to load 3D viewer engine.");
      });
  }, []);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    const onArStatus = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const status = detail?.status;
      if (status === "session-started") {
        setArStatus("tracking");
        trackArEvent("AR_STARTED");
      } else if (status === "object-placed") {
        setArStatus("placed");
        trackArEvent("AR_PLACED");
      } else if (status === "failed") {
        setArStatus("failed");
        trackArEvent("AR_FAILED", { error: "AR session failed" });
      } else if (status === "not-presenting") {
        setArStatus("idle");
        trackArEvent("AR_EXITED");
      }
    };

    const onError = (e: Event) => {
      console.warn("model-viewer load error", e);
      trackArEvent("AR_FAILED", { error: "model-viewer error" });
    };

    el.addEventListener("ar-status", onArStatus);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("ar-status", onArStatus);
      el.removeEventListener("error", onError);
    };
  }, [isViewerLoaded]);

  const handleLaunchAr = () => {
    const el = viewerRef.current as any;
    if (el && typeof el.activateAR === "function") {
      trackArEvent("AR_VIEW_CLICKED");
      el.activateAR().catch((err: any) => {
        console.warn("activateAR error", err);
        if (err?.name === "NotAllowedError" || err?.message?.includes("permission")) {
          setErrorMsg("Camera access is needed to view your lithophane in your space.");
        } else {
          setErrorMsg("We couldn't start the live preview on this device. You can still explore the 3D model.");
        }
        trackArEvent("AR_FAILED", { error: err?.message });
      });
    }
  };

  const handleResetPosition = () => {
    const el = viewerRef.current as any;
    if (el && typeof el.resetTurntable === "function") {
      el.resetTurntable();
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0A0A0C] text-daxul-bone" data-testid="lithophane-ar-viewer">
      {/* Top Header / Product Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3">
        <div className="rounded-xl border border-white/10 bg-black/75 px-3.5 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-daxul-lime animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-daxul-lime">AR Real-Scale Preview</span>
          </div>
          <div className="mt-0.5 text-xs font-bold uppercase tracking-tight text-white">{varietyName}</div>
          <div className="font-mono text-[11px] text-white/70">
            {dimensionsText} {priceText ? `· ${priceText}` : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Exit AR view"
          data-testid="ar-exit-btn"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/75 text-white backdrop-blur-md hover:bg-black/95 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main 3D / AR View Area */}
      <div className="relative flex-1 w-full h-full">
        {isViewerLoaded ? (
          <model-viewer
            ref={viewerRef}
            src={modelUrl}
            ios-src={iosSrcUrl}
            alt={`${varietyName} 3D model`}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="floor"
            camera-controls
            touch-action="pan-y"
            shadow-intensity="1"
            shadow-softness="0.8"
            exposure="1.0"
            className="h-full w-full outline-none"
            style={{ width: "100%", height: "100%", backgroundColor: "#0E0E10" }}
          >
            {/* Custom AR Trigger Button slot */}
            <button
              slot="ar-button"
              type="button"
              onClick={handleLaunchAr}
              data-testid="ar-launch-native-btn"
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex min-h-12 items-center gap-2.5 rounded-xl border border-daxul-lime bg-daxul-black px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-daxul-lime shadow-2xl hover:bg-daxul-black/90 active:scale-95 transition-all"
            >
              <Box className="h-4 w-4" />
              VIEW ON YOUR TABLE
            </button>

            {/* Custom Surface Detection Prompt slot */}
            <div
              slot="ar-prompt"
              id="ar-prompt"
              data-testid="ar-placement-prompt"
              className="pointer-events-none absolute inset-x-4 top-24 z-20 mx-auto max-w-sm rounded-xl border border-daxul-lime/40 bg-black/85 p-3 text-center backdrop-blur-md"
            >
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-daxul-lime">
                {arStatus === "tracking" ? "Tap surface to place lithophane" : "Point camera at flat surface & move slowly"}
              </p>
              <p className="mt-1 text-[11px] text-white/70">Find a table or desk surface</p>
            </div>
          </model-viewer>
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-widest text-zinc-500">
            Preparing 3D engine...
          </div>
        )}
      </div>

      {/* Error Message Modal / Notification */}
      {errorMsg && (
        <div
          role="alert"
          data-testid="ar-error-notification"
          className="absolute inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-xl border border-red-500/50 bg-black/90 p-4 backdrop-blur-lg"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-white">{errorMsg}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="ar-try-again-btn"
                  onClick={() => {
                    setErrorMsg(null);
                    handleLaunchAr();
                  }}
                  className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-white/20"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  data-testid="ar-continue-3d-btn"
                  onClick={() => {
                    setErrorMsg(null);
                    onClose();
                  }}
                  className="rounded-lg bg-daxul-lime px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black"
                >
                  Continue in 3D
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Footer Controls (In-Browser Experience) */}
      <div className="flex flex-wrap items-center justify-between border-t border-white/10 bg-[#0E0E10] px-4 py-3 z-20">
        <div className="flex items-center gap-2">
          {supportsLight && onToggleLight && (
            <button
              type="button"
              data-testid="ar-light-toggle"
              onClick={onToggleLight}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                lightOn
                  ? "border-daxul-lime bg-daxul-lime/10 text-daxul-lime"
                  : "border-white/20 text-white/80 hover:border-white/40"
              }`}
            >
              {lightOn ? <Lightbulb className="h-4 w-4" /> : <LightbulbOff className="h-4 w-4" />}
              {lightOn ? "Light ON" : "Light OFF"}
            </button>
          )}

          <button
            type="button"
            data-testid="ar-reset-pos-btn"
            onClick={handleResetPosition}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-xs font-bold uppercase tracking-wider text-white hover:border-white/40 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-white/45 hidden sm:block">
          ar-scale: fixed · horizontal table placement
        </p>
      </div>
    </div>
  );
}
