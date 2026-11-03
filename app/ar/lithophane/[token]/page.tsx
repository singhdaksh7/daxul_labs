"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Box, AlertTriangle, ShieldCheck, Check } from "lucide-react";
import { formatDimensionsMm } from "@/lib/lithophaneAr";

const LithophaneModelViewer = dynamic(() => import("@/components/lithophane/LithophaneModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center font-mono text-xs uppercase tracking-widest text-zinc-500">
      Loading 3D AR Viewer...
    </div>
  ),
});

interface SessionData {
  generationId: string;
  expiresAt: string;
  config?: {
    varietyName?: string;
    widthMm?: number;
    heightMm?: number;
    depthMm?: number | null;
    unitPrice?: number;
    lightOn?: boolean;
  };
  modelUrl: string;
}

export default function LithophaneMobileArPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightOn, setLightOn] = useState(false);

  useEffect(() => {
    let dead = false;
    fetch(`/api/lithophane/ar/session/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "This AR link is invalid or expired.");
        if (!dead) {
          setSession(data as SessionData);
          if (data.config?.lightOn !== undefined) {
            setLightOn(Boolean(data.config.lightOn));
          }
        }
      })
      .catch((err) => {
        if (!dead) setError(err instanceof Error ? err.message : "Could not load AR session");
      })
      .finally(() => {
        if (!dead) setLoading(false);
      });

    return () => {
      dead = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0C] px-4 font-mono text-xs uppercase tracking-widest text-daxul-lime">
        Connecting to AR Session...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0C] px-6 text-center text-daxul-bone">
        <div className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#121214] p-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-yellow-400" />
          <h1 className="text-base font-bold uppercase tracking-wide text-white">AR Link Expired or Invalid</h1>
          <p className="text-xs text-white/60">
            {error || "For your privacy, lithophane AR preview links expire automatically after 15 minutes."}
          </p>
          <div className="pt-2">
            <Link
              href="/customize/lithophane"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-daxul-lime px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black"
            >
              Open Lithophane Builder
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cfg = session.config || {};
  const varietyName = cfg.varietyName || "Custom Lithophane";
  const dimsText = formatDimensionsMm(cfg.widthMm || 120, cfg.heightMm || 180, cfg.depthMm);

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0C] text-daxul-bone" data-testid="lithophane-mobile-ar-page">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0E0E10] px-4 py-3">
        <Link
          href="/customize/lithophane"
          className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> DAXUL LABS
        </Link>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-daxul-lime">
          <ShieldCheck className="h-3.5 w-3.5" /> Private Session
        </span>
      </header>

      {/* Main Viewer */}
      <main className="flex-1 flex flex-col">
        <div className="h-[65vh] w-full relative">
          <LithophaneModelViewer
            modelUrl={session.modelUrl}
            varietyName={varietyName}
            dimensionsText={dimsText}
            priceText={cfg.unitPrice ? `₹${cfg.unitPrice}` : undefined}
            lightOn={lightOn}
            onToggleLight={() => setLightOn(!lightOn)}
            supportsLight={true}
            onClose={() => {
              window.location.href = "/customize/lithophane";
            }}
          />
        </div>

        {/* Guidance and Order Backlink */}
        <section className="space-y-4 border-t border-white/10 bg-[#121214] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-daxul-lime">Real Scale Model</div>
              <h2 className="text-sm font-bold uppercase text-white">{varietyName}</h2>
            </div>
            <div className="font-mono text-xs font-bold text-daxul-lime">{dimsText}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs text-white/75 space-y-1">
            <p className="font-semibold text-white">How to view on your table:</p>
            <p>1. Tap the green <strong>VIEW ON YOUR TABLE</strong> button.</p>
            <p>2. Aim your camera at a desk or flat surface and move slowly.</p>
            <p>3. Tap the reticle circle to place the lithophane at its actual manufacturing scale.</p>
          </div>

          <div className="pt-2">
            <Link
              href="/customize/lithophane"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10"
            >
              Back to Lithophane Customizer
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

