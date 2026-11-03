"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Upload, Lightbulb, LightbulbOff, RotateCcw, Box, Square, Minus, Plus, AlertTriangle, Check } from "lucide-react";
import { useCart } from "@/lib/storeContext";
import {
  DEFAULT_CROP,
  LITHOPHANE_LIMITATIONS,
  clampCrop,
  type CartLithophane,
  type Crop,
  type OptionGroup,
  type Orientation,
  type PriceBreakdown,
} from "@/lib/lithophane";
import { computeCropRect, generateHeightMap, gridSize } from "@/lib/lithophaneRelief";
import type { ReliefData } from "./LithophanePreview3D";
import VarietyIcon from "./VarietyIcon";
import LithophaneArModal from "./LithophaneArModal";

const Preview3D = dynamic(() => import("./LithophanePreview3D"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-widest text-[#71717A]">Loading 3D viewer...</div>,
});

// ------------------------------------------------------------------ types for the public config API
interface CfgSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number | null;
  thicknessMm: number;
  priceAdjustment: number;
  isDefault: boolean;
}
interface CfgVariety {
  id: string;
  key: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
  baseModel: string;
  startingPrice: number;
  supportsLight: boolean;
  productionDays: number;
  optionGroups: OptionGroup[];
  defaultSizeId: string;
  sizes: CfgSize[];
}
interface CfgSettings {
  productId: string | null;
  defaultVarietyKey: string | null;
  defaultOrientation: Orientation;
  defaultCropStrategy: string;
  previewResolution: number;
  allowCustomDimensions: boolean;
  customMinMm: number;
  customMaxMm: number;
  headline: string;
  subheadline: string;
  uploadGuidance: string;
  previewDisclaimer: string;
  leadTimeText: string;
}
interface Config {
  settings: CfgSettings;
  varieties: CfgVariety[];
}
interface GenResponse {
  generationId: string;
  hash: string;
  cached: boolean;
  price: PriceBreakdown;
  config: {
    varietyKey: string;
    varietyName: string;
    baseModel: string;
    sizeName: string;
    widthMm: number;
    heightMm: number;
    depthMm: number | null;
    thicknessMm: number;
    minThicknessMm: number;
    orientation: Orientation;
    crop: Crop;
    options: Record<string, string>;
    previewResolution: number;
  };
}

type Phase = "idle" | "uploading" | "processing" | "generating" | "ready" | "error";
interface Selection {
  varietyKey: string;
  sizeId: string | "custom";
  customW: number;
  customH: number;
  orientation: Orientation;
  crop: Crop;
  options: Record<string, string>;
  quantity: number;
  notes: string;
}
interface Photo {
  filename: string;
  originalName: string;
  objectUrl: string;
  imgW: number;
  imgH: number;
  pixels: Uint8ClampedArray;
  thumb: string;
}
interface Preview {
  key: string;
  hash: string;
  generationId: string;
  relief: ReliefData;
  gen: GenResponse;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function defaultOptionValues(groups: OptionGroup[], carry?: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const g of groups) {
    const c = carry?.[g.key];
    out[g.key] = c && g.choices.some((x) => x.value === c) ? c : g.default;
  }
  return out;
}

/** Everything that changes the generated geometry (mirrors the server hash input, minus the photo). */
function geometryKey(sel: Selection, groups: OptionGroup[]) {
  const geo: Record<string, string> = {};
  for (const g of groups) if (g.geometry) geo[g.key] = sel.options[g.key];
  const crop = clampCrop(sel.crop);
  return JSON.stringify({
    v: sel.varietyKey,
    s: sel.sizeId,
    w: sel.sizeId === "custom" ? sel.customW : 0,
    h: sel.sizeId === "custom" ? sel.customH : 0,
    o: sel.orientation,
    c: [crop.cx, crop.cy, crop.zoom],
    g: geo,
  });
}

async function decodePhoto(file: File): Promise<{ w: number; h: number; pixels: Uint8ClampedArray; thumb: string }> {
  const bmp = await createImageBitmap(file);
  const w0 = bmp.width;
  const h0 = bmp.height;
  const MAX = 900;
  const k = Math.min(1, MAX / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k));
  const h = Math.max(1, Math.round(h0 * k));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const tk = Math.min(1, 160 / Math.max(w, h));
  const tc = document.createElement("canvas");
  tc.width = Math.max(1, Math.round(w * tk));
  tc.height = Math.max(1, Math.round(h * tk));
  tc.getContext("2d")!.drawImage(cv, 0, 0, tc.width, tc.height);
  bmp.close?.();
  return { w, h, pixels, thumb: tc.toDataURL("image/jpeg", 0.7) };
}

const STATE_STEPS: Array<{ key: Phase; label: string }> = [
  { key: "uploading", label: "UPLOADING" },
  { key: "processing", label: "PROCESSING PHOTO" },
  { key: "generating", label: "GENERATING LITHOPHANE" },
  { key: "ready", label: "READY" },
];

export default function LithophaneBuilder() {
  const { addToCart } = useCart();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [running, setRunning] = useState(false);
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [lightOn, setLightOn] = useState(false);
  const [view, setView] = useState<"front" | "perspective">("perspective");
  const [resetKey, setResetKey] = useState(0);
  const [added, setAdded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [arModalOpen, setArModalOpen] = useState(false);
  const arGlbCache = useRef(new Map<string, ArrayBuffer>());

  const reliefCache = useRef(new Map<string, ReliefData>());
  const seq = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  // ---- load config (seeds defaults server-side on first call)
  useEffect(() => {
    let dead = false;
    fetch("/api/lithophane/config", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Could not load the builder");
        if (dead) return;
        const c = d as Config;
        setCfg(c);
        const v = c.varieties.find((x) => x.key === c.settings.defaultVarietyKey) ?? c.varieties[0];
        if (!v) throw new Error("No product types are available yet.");
        const size = v.sizes.find((s) => s.id === v.defaultSizeId) ?? v.sizes[0];
        setSel({
          varietyKey: v.key,
          sizeId: size.id,
          customW: Math.round((c.settings.customMinMm + c.settings.customMaxMm) / 2 / 10) * 10,
          customH: Math.round((c.settings.customMinMm + c.settings.customMaxMm) / 2 / 10) * 10,
          orientation: c.settings.defaultOrientation,
          crop: { ...DEFAULT_CROP },
          options: defaultOptionValues(v.optionGroups),
          quantity: 1,
          notes: "",
        });
      })
      .catch((e) => !dead && setCfgError(e instanceof Error ? e.message : "Could not load the builder"));
    return () => {
      dead = true;
    };
  }, []);

  const variety = useMemo(() => cfg?.varieties.find((v) => v.key === sel?.varietyKey) ?? null, [cfg, sel?.varietyKey]);
  const groups = variety?.optionGroups ?? [];
  const currentKey = useMemo(() => (sel ? geometryKey(sel, groups) : ""), [sel, groups]);

  // ---- upload + decode
  const handleFile = useCallback(
    async (file: File) => {
      if (!cfg || !sel) return;
      setError(null);
      setAdded(false);
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setError("Please choose a JPG, PNG or WEBP photo.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("That photo is larger than 10MB. Please choose a smaller one.");
        return;
      }
      seq.current++;
      setPreview(null);
      setPhoto(null);
      setPhase("uploading");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const [res] = await Promise.all([fetch("/api/lithophane/upload", { method: "POST", body: fd }), sleep(500)]);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Upload failed");
        setPhase("processing");
        const [dec] = await Promise.all([decodePhoto(file), sleep(500)]);
        const objectUrl = URL.createObjectURL(file);
        setSel((s) => (s ? { ...s, crop: { ...DEFAULT_CROP } } : s));
        setPhoto((old) => {
          if (old) URL.revokeObjectURL(old.objectUrl);
          return { filename: data.file.filename, originalName: data.file.originalName, objectUrl, imgW: dec.w, imgH: dec.h, pixels: dec.pixels, thumb: dec.thumb };
        });
        reliefCache.current.clear();
        setPhase("generating");
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : "Something went wrong with that photo.");
      }
    },
    [cfg, sel],
  );

  // ---- generation (initial + every geometry change), debounced
  useEffect(() => {
    if (!photo || !sel || !variety) return;
    if (preview && preview.key === currentKey) {
      seq.current++;
      setRunning(false);
      return;
    }
    const mySeq = ++seq.current;
    const reqKey = currentKey;
    const first = !preview;
    const ctrl = new AbortController();
    const t = setTimeout(
      async () => {
        setRunning(true);
        try {
          if (first) await sleep(500);
          const res = await fetch("/api/lithophane/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ctrl.signal,
            body: JSON.stringify({
              filename: photo.filename,
              varietyKey: sel.varietyKey,
              sizeId: sel.sizeId === "custom" ? null : sel.sizeId,
              customWidthMm: sel.sizeId === "custom" ? sel.customW : null,
              customHeightMm: sel.sizeId === "custom" ? sel.customH : null,
              orientation: sel.orientation,
              crop: sel.crop,
              options: sel.options,
              quantity: sel.quantity,
            }),
          });
          const gen = (await res.json().catch(() => ({}))) as GenResponse & { error?: string };
          if (!res.ok) throw new Error(gen.error || "Could not generate the lithophane");
          if (mySeq !== seq.current) return;
          let relief = reliefCache.current.get(gen.hash);
          if (!relief) {
            await sleep(0);
            const c = gen.config;
            const aspect = c.widthMm / c.heightMm;
            const rect = computeCropRect(photo.imgW, photo.imgH, aspect, c.crop);
            const { cols, rows } = gridSize(aspect, c.previewResolution);
            const map = generateHeightMap(photo.pixels, photo.imgW, photo.imgH, rect, cols, rows, c.minThicknessMm, c.thicknessMm);
            relief = { map, widthMm: c.widthMm, heightMm: c.heightMm, thicknessMm: c.thicknessMm, hash: gen.hash };
            reliefCache.current.set(gen.hash, relief);
          }
          if (mySeq !== seq.current) return;
          setPreview({ key: reqKey, hash: gen.hash, generationId: gen.generationId, relief, gen });
          setPhase("ready");
          setError(null);
        } catch (e) {
          if ((e as { name?: string })?.name === "AbortError") return;
          if (mySeq !== seq.current) return;
          setError(e instanceof Error ? e.message : "Could not generate the lithophane");
          if (first) setPhase("error");
        } finally {
          if (mySeq === seq.current) setRunning(false);
        }
      },
      first ? 0 : 350,
    );
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, currentKey]);

  // ---- server price (always authoritative; quantity and non-geometry options included)
  const priceKey = sel ? JSON.stringify([sel.varietyKey, sel.sizeId, sel.customW, sel.customH, sel.options, sel.quantity]) : "";
  useEffect(() => {
    if (!sel) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/lithophane/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          varietyKey: sel.varietyKey,
          sizeId: sel.sizeId === "custom" ? null : sel.sizeId,
          customWidthMm: sel.sizeId === "custom" ? sel.customW : null,
          customHeightMm: sel.sizeId === "custom" ? sel.customH : null,
          orientation: sel.orientation,
          options: sel.options,
          quantity: sel.quantity,
        }),
      })
        .then(async (r) => {
          const d = await r.json();
          if (r.ok) setPrice(d.price as PriceBreakdown);
        })
        .catch(() => undefined);
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceKey]);

  // ---- selection helpers
  const patch = (p: Partial<Selection>) => {
    setAdded(false);
    setSel((s) => (s ? { ...s, ...p } : s));
  };
  const switchVariety = (v: CfgVariety) => {
    if (!sel || v.key === sel.varietyKey) return;
    const size = v.sizes.find((s) => s.id === v.defaultSizeId) ?? v.sizes[0];
    patch({ varietyKey: v.key, sizeId: size.id, options: defaultOptionValues(v.optionGroups, sel.options) });
  };

  const stale = !!photo && (!preview || preview.key !== currentKey);
  const updating = stale && !!preview;
  const canAdd = !!photo && !!preview && !stale && !running && phase === "ready" && !!price && !!cfg?.settings.productId;
  const showArButton = !!photo && !!preview && (variety as any)?.arEnabled !== false;
  const isArDisabled = updating || running || stale || phase !== "ready";
  const canAr = showArButton && !isArDisabled;

  const prepareArGlb = useCallback(async () => {
    if (!preview || !sel || !variety) throw new Error("Preview not ready");
    const cacheKey = `${preview.hash}_${lightOn ? "on" : "off"}`;
    const cached = arGlbCache.current.get(cacheKey);
    if (cached) return cached;

    const { buildArScene, exportArGlb } = await import("@/lib/lithophaneArModel");
    const sObj = variety.sizes.find((x) => x.id === sel.sizeId);
    const scene = buildArScene({
      map: preview.relief.map,
      widthMm: preview.gen.config.widthMm,
      heightMm: preview.gen.config.heightMm,
      thicknessMm: preview.gen.config.thicknessMm,
      depthMm: sObj?.depthMm ?? null,
      baseModel: variety.baseModel,
      options: sel.options,
      lightOn: lightOn && variety.supportsLight,
      baseOffsetMm: (variety as any).arBaseOffset ?? 0,
    });

    const buffer = await exportArGlb(scene.root);
    arGlbCache.current.set(cacheKey, buffer);
    return buffer;
  }, [preview, sel, variety, lightOn]);

  const cropRect = useMemo(() => {
    if (!photo || !preview) return null;
    const aspect = preview.relief.widthMm / preview.relief.heightMm;
    const r = computeCropRect(photo.imgW, photo.imgH, aspect, sel?.crop);
    return { left: (r.sx / photo.imgW) * 100, top: (r.sy / photo.imgH) * 100, width: (r.sw / photo.imgW) * 100, height: (r.sh / photo.imgH) * 100 };
  }, [photo, preview, sel?.crop]);

  const handleAdd = () => {
    if (!canAdd || !sel || !photo || !preview || !variety || !price || !cfg?.settings.productId) return;
    const g = preview.gen.config;
    const size = variety.sizes.find((s) => s.id === sel.sizeId);
    const optionSummary = groups.map((gr) => ({ label: gr.label, valueLabel: gr.choices.find((c) => c.value === sel.options[gr.key])?.label ?? sel.options[gr.key] }));
    const lithophane: CartLithophane = {
      filename: photo.filename,
      generationId: preview.generationId,
      hash: preview.hash,
      varietyKey: sel.varietyKey,
      sizeId: sel.sizeId === "custom" ? null : sel.sizeId,
      customWidthMm: sel.sizeId === "custom" ? sel.customW : null,
      customHeightMm: sel.sizeId === "custom" ? sel.customH : null,
      orientation: g.orientation,
      crop: g.crop,
      options: sel.options,
      lighting: lightOn ? "on" : "off",
      notes: sel.notes.trim(),
      varietyName: variety.name,
      sizeName: size?.name ?? "Custom",
      widthMm: g.widthMm,
      heightMm: g.heightMm,
      thicknessMm: g.thicknessMm,
      optionSummary,
      thumbnail: photo.thumb,
      unitPrice: price.unitPrice,
    };
    addToCart({
      productId: cfg.settings.productId,
      slug: "custom-lithophane",
      name: `Custom ${variety.name}`,
      image: photo.thumb,
      quantity: sel.quantity,
      basePrice: price.unitPrice,
      variantSelections: [],
      customizations: {},
      customizationDetails: [],
      customizationFee: 0,
      unitPrice: price.unitPrice,
      prepaidOnly: true,
      codEnabled: false,
      customizable: true,
      lithophane,
    });
    setAdded(true);
  };

  // ------------------------------------------------------------------ render
  if (cfgError) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-daxul-black/10 bg-white p-8 text-center text-sm text-[#555550]" data-testid="lithophane-config-error">
        {cfgError}
      </div>
    );
  }
  if (!cfg || !sel || !variety) {
    return <div className="py-24 text-center font-mono text-xs uppercase tracking-widest text-[#71717A]">Loading builder...</div>;
  }
  const s = cfg.settings;
  const activeStep = phase === "idle" ? -1 : STATE_STEPS.findIndex((x) => x.key === phase);
  const sizeObj = variety.sizes.find((x) => x.id === sel.sizeId);

  return (
    <div className="space-y-10" data-testid="lithophane-builder" data-phase={phase}>
      {/* ------------------------------------------------ 1. upload */}
      <section className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${dragOver ? "border-daxul-lime bg-daxul-black/5" : "border-daxul-black/20 bg-white"} ${photo ? "py-4 sm:py-5" : ""}`}
        >
          <input
            ref={fileInput}
            data-testid="lithophane-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          {!photo ? (
            <div className="space-y-3">
              <Upload className="mx-auto h-7 w-7 text-daxul-black" />
              <p className="text-sm font-semibold uppercase tracking-wide text-daxul-black">Upload your photo</p>
              <p className="mx-auto max-w-md text-xs text-[#71717A]">{s.uploadGuidance}</p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={phase === "uploading" || phase === "processing"}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-daxul-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-daxul-lime disabled:opacity-50"
              >
                Choose photo
              </button>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#71717A]">JPG, PNG or WEBP · up to 10MB · private to you</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-left">
              <div className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.objectUrl} alt="Your photo" className="h-12 w-12 rounded-lg border border-daxul-black/10 object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-daxul-black">{photo.originalName}</p>
                  <p className="text-[11px] text-[#71717A]">Your photo is private and used only to make your order.</p>
                </div>
              </div>
              <button type="button" onClick={() => fileInput.current?.click()} className="min-h-11 rounded-lg border border-daxul-black/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-daxul-black hover:border-daxul-black">
                Replace photo
              </button>
            </div>
          )}
        </div>
        {error && (
          <div role="alert" data-testid="lithophane-error" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ generation states */}
      {phase !== "idle" && phase !== "ready" && phase !== "error" && (
        <section data-testid="lithophane-status" data-state={phase} className="rounded-2xl bg-daxul-black p-6 text-daxul-bone sm:p-8">
          <p className="text-sm font-semibold sm:text-base">
            {phase === "uploading" ? "Uploading your photo..." : phase === "processing" ? "Reading your photo..." : "Turning your photo into a lithophane..."}
          </p>
          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATE_STEPS.map((st, i) => (
              <li
                key={st.key}
                data-active={i === activeStep}
                className={`rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${i < activeStep ? "border-daxul-lime/40 text-daxul-lime/80" : i === activeStep ? "border-daxul-lime text-daxul-lime" : "border-white/10 text-white/35"}`}
              >
                {st.label}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ------------------------------------------------ 2. preview + configuration */}
      {photo && preview && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="space-y-3 lg:sticky lg:top-24" data-testid="lithophane-preview-section">
            <div
              className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:aspect-[5/4] lg:aspect-[4/4.2] ${lightOn ? "bg-[#050506]" : "bg-gradient-to-b from-[#1a1a1c] to-[#0B0B0C]"}`}
            >
              <Preview3D
                relief={preview.relief}
                baseModel={variety.baseModel}
                depthMm={sizeObj?.depthMm ?? null}
                options={sel.options}
                lightOn={lightOn && variety.supportsLight}
                view={view}
                resetKey={resetKey}
              />
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-daxul-lime">
                <span className="rounded bg-black/60 px-2 py-1">Preview model</span>
              </div>
              {(updating || running) && (
                <div data-testid="lithophane-updating" className="absolute inset-0 flex items-center justify-center bg-black/55 px-4 text-center text-sm font-semibold text-daxul-bone">
                  Updating your lithophane...
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2" data-testid="lithophane-controls">
              <button
                type="button"
                data-testid="light-off"
                aria-pressed={!lightOn}
                onClick={() => setLightOn(false)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider ${!lightOn ? "border-daxul-black bg-daxul-black text-daxul-lime" : "border-daxul-black/20 text-daxul-black"}`}
              >
                <LightbulbOff className="h-4 w-4" /> Light off
              </button>
              <button
                type="button"
                data-testid="light-on"
                aria-pressed={lightOn}
                onClick={() => setLightOn(true)}
                disabled={!variety.supportsLight}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider disabled:opacity-40 ${lightOn ? "border-daxul-black bg-daxul-black text-daxul-lime" : "border-daxul-black/20 text-daxul-black"}`}
              >
                <Lightbulb className="h-4 w-4" /> Light on
              </button>
              <span className="mx-1 hidden h-6 w-px bg-daxul-black/15 sm:block" />
              <button type="button" data-testid="view-front" aria-pressed={view === "front"} onClick={() => setView("front")} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider ${view === "front" ? "border-daxul-black bg-daxul-black text-daxul-lime" : "border-daxul-black/20 text-daxul-black"}`}>
                <Square className="h-4 w-4" /> Front
              </button>
              <button type="button" data-testid="view-perspective" aria-pressed={view === "perspective"} onClick={() => setView("perspective")} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider ${view === "perspective" ? "border-daxul-black bg-daxul-black text-daxul-lime" : "border-daxul-black/20 text-daxul-black"}`}>
                <Box className="h-4 w-4" /> 3D
              </button>
              <button type="button" data-testid="view-reset" onClick={() => setResetKey((k) => k + 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-daxul-black/20 px-3 text-xs font-bold uppercase tracking-wider text-daxul-black">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
            {showArButton && (
              <div className="pt-2">
                <button
                  type="button"
                  data-testid="view-on-table"
                  disabled={isArDisabled}
                  onClick={() => setArModalOpen(true)}
                  className="flex w-full min-h-12 items-center justify-between gap-3 rounded-xl border border-daxul-black bg-daxul-black px-4 py-3 text-left text-daxul-bone shadow-md hover:bg-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-daxul-lime text-daxul-black">
                      <Box className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-daxul-lime">VIEW ON YOUR TABLE</div>
                      <div className="text-[11px] text-white/70">See it at real size in your space.</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-daxul-lime border border-daxul-lime/40 rounded px-2 py-1">
                    AR
                  </span>
                </button>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-[#71717A]">Drag to rotate, scroll or pinch to zoom. {s.previewDisclaimer}</p>
          </section>

          {/* ---------------------------------------------- configuration */}
          <section className="space-y-8">
            {/* variety */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold uppercase tracking-tight text-daxul-black sm:text-2xl">What do you want to build?</h2>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" role="radiogroup" aria-label="Product type">
                {cfg.varieties.map((v) => {
                  const on = v.key === sel.varietyKey;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-testid={`variety-${v.key}`}
                      onClick={() => switchVariety(v)}
                      className={`flex gap-3 rounded-xl border p-3 text-left transition-colors sm:flex-col lg:flex-row xl:flex-col ${on ? "border-daxul-black bg-daxul-black text-daxul-bone" : "border-daxul-black/15 bg-white text-daxul-black hover:border-daxul-black/50"}`}
                    >
                      <div className={`flex h-16 w-20 shrink-0 items-center justify-center rounded-lg ${on ? "bg-white/5 text-daxul-lime" : "bg-[#EAE5DA] text-daxul-black"}`}>
                        {v.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnailUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                        ) : (
                          <VarietyIcon model={v.baseModel} className="h-12 w-14" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs font-bold uppercase leading-tight">{v.name}</div>
                        <p className={`text-[11px] leading-snug ${on ? "text-white/65" : "text-[#71717A]"}`}>{v.description}</p>
                        <div className={`font-mono text-[11px] ${on ? "text-daxul-lime" : "text-daxul-black"}`}>From {inr(v.startingPrice)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* size */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#71717A]">Size</h3>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                {variety.sizes.map((z) => {
                  const on = z.id === sel.sizeId;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-testid={`size-${z.name.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => patch({ sizeId: z.id })}
                      className={`min-h-11 rounded-lg border px-4 py-2 text-left text-xs ${on ? "border-daxul-black bg-daxul-black text-daxul-bone" : "border-daxul-black/20 bg-white text-daxul-black hover:border-daxul-black/60"}`}
                    >
                      <div className="font-bold uppercase">{z.name}</div>
                      <div className={`font-mono text-[10px] ${on ? "text-daxul-lime" : "text-[#71717A]"}`}>
                        {z.widthMm} x {z.heightMm} mm
                      </div>
                    </button>
                  );
                })}
                {s.allowCustomDimensions && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sel.sizeId === "custom"}
                    data-testid="size-custom"
                    onClick={() => patch({ sizeId: "custom" })}
                    className={`min-h-11 rounded-lg border px-4 py-2 text-left text-xs ${sel.sizeId === "custom" ? "border-daxul-black bg-daxul-black text-daxul-bone" : "border-daxul-black/20 bg-white text-daxul-black"}`}
                  >
                    <div className="font-bold uppercase">Custom</div>
                    <div className="font-mono text-[10px] text-[#71717A]">your size</div>
                  </button>
                )}
              </div>
              {sel.sizeId === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  {(["customW", "customH"] as const).map((k) => (
                    <label key={k} className="space-y-1 text-[11px] text-[#71717A]">
                      {k === "customW" ? "Width (mm)" : "Height (mm)"}
                      <input
                        type="number"
                        min={s.customMinMm}
                        max={s.customMaxMm}
                        value={sel[k]}
                        onChange={(e) => patch({ [k]: Math.min(s.customMaxMm, Math.max(s.customMinMm, Number(e.target.value) || s.customMinMm)) } as Partial<Selection>)}
                        className="min-h-11 w-full rounded-lg border border-daxul-black/20 bg-white px-3 text-sm text-daxul-black"
                      />
                    </label>
                  ))}
                  <p className="col-span-2 text-[11px] text-[#71717A]">
                    Between {s.customMinMm} and {s.customMaxMm} mm.
                  </p>
                </div>
              )}
              <p className="font-mono text-[11px] text-[#71717A]" data-testid="lithophane-dims">
                Panel {preview.gen.config.widthMm} x {preview.gen.config.heightMm} mm · {preview.gen.config.thicknessMm} mm max thickness
              </p>
            </div>

            {/* orientation */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#71717A]">Orientation</h3>
              <div className="flex gap-2" role="radiogroup" aria-label="Orientation">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={sel.orientation === o}
                    data-testid={`orientation-${o}`}
                    onClick={() => patch({ orientation: o })}
                    className={`min-h-11 flex-1 rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider sm:flex-none ${sel.orientation === o ? "border-daxul-black bg-daxul-black text-daxul-lime" : "border-daxul-black/20 bg-white text-daxul-black"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* crop */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs uppercase tracking-widest text-[#71717A]">Crop</h3>
                <button type="button" data-testid="crop-reset" onClick={() => patch({ crop: { ...DEFAULT_CROP } })} className="text-[11px] font-semibold uppercase text-daxul-black underline">
                  Reset crop
                </button>
              </div>
              <div className="flex items-start gap-4">
                <div className="relative w-28 shrink-0 overflow-hidden rounded-lg border border-daxul-black/15 bg-black sm:w-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.objectUrl} alt="Crop area" className="block w-full opacity-50" />
                  {cropRect && (
                    <div
                      className="absolute border-2 border-daxul-lime bg-white/10"
                      style={{ left: `${cropRect.left}%`, top: `${cropRect.top}%`, width: `${cropRect.width}%`, height: `${cropRect.height}%` }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {(
                    [
                      ["zoom", "Zoom", 1, 3, 0.05],
                      ["cx", "Move left / right", 0, 1, 0.01],
                      ["cy", "Move up / down", 0, 1, 0.01],
                    ] as const
                  ).map(([k, label, min, max, step]) => (
                    <label key={k} className="block text-[11px] text-[#71717A]">
                      {label}
                      <input
                        type="range"
                        data-testid={`crop-${k}`}
                        min={min}
                        max={max}
                        step={step}
                        value={sel.crop[k]}
                        onChange={(e) => patch({ crop: { ...sel.crop, [k]: Number(e.target.value) } })}
                        className="mt-1 h-6 w-full accent-black"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[#71717A]">Your photo is cropped, never stretched, to fit the panel shape.</p>
            </div>

            {/* options */}
            {groups.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs uppercase tracking-widest text-[#71717A]">Options</h3>
                {groups.map((g) => (
                  <div key={g.key} className="space-y-2" data-testid={`option-${g.key}`}>
                    <div className="text-xs font-semibold text-daxul-black">{g.label}</div>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={g.label}>
                      {g.choices.map((c) => {
                        const on = sel.options[g.key] === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            data-testid={`option-${g.key}-${c.value}`}
                            onClick={() => patch({ options: { ...sel.options, [g.key]: c.value } })}
                            className={`min-h-11 rounded-lg border px-3 py-2 text-xs ${on ? "border-daxul-black bg-daxul-black text-daxul-bone" : "border-daxul-black/20 bg-white text-daxul-black hover:border-daxul-black/60"}`}
                          >
                            {c.label}
                            {c.priceAdjustment !== 0 && (
                              <span className={`ml-1.5 font-mono text-[10px] ${on ? "text-daxul-lime" : "text-[#71717A]"}`}>
                                {c.priceAdjustment > 0 ? "+" : ""}
                                {inr(c.priceAdjustment)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* notes + qty */}
            <div className="space-y-3">
              <label className="block space-y-1 text-[11px] text-[#71717A]">
                Notes for our team (optional)
                <textarea
                  data-testid="lithophane-notes"
                  value={sel.notes}
                  maxLength={500}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-daxul-black/20 bg-white p-3 text-sm text-daxul-black"
                />
              </label>
            </div>

            {/* price + add to cart */}
            <div className="space-y-3 rounded-2xl border border-daxul-black/15 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#71717A]">Total</div>
                  <div className="text-2xl font-bold text-daxul-black" data-testid="lithophane-price">
                    {price ? inr(price.lineTotal) : "..."}
                  </div>
                  {price && sel.quantity > 1 && <div className="text-[11px] text-[#71717A]">{inr(price.unitPrice)} each</div>}
                </div>
                <div className="flex items-center gap-1" aria-label="Quantity">
                  <button type="button" aria-label="Decrease quantity" data-testid="qty-minus" onClick={() => patch({ quantity: Math.max(1, sel.quantity - 1) })} className="flex h-11 w-11 items-center justify-center rounded-lg border border-daxul-black/20">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span data-testid="qty-value" className="w-9 text-center text-sm font-bold">
                    {sel.quantity}
                  </span>
                  <button type="button" aria-label="Increase quantity" data-testid="qty-plus" onClick={() => patch({ quantity: Math.min(20, sel.quantity + 1) })} className="flex h-11 w-11 items-center justify-center rounded-lg border border-daxul-black/20">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {price && (
                <dl className="space-y-0.5 font-mono text-[11px] text-[#71717A]">
                  <div className="flex justify-between"><dt>{variety.name}</dt><dd>{inr(price.base)}</dd></div>
                  {price.size !== 0 && <div className="flex justify-between"><dt>Size</dt><dd>{inr(price.size)}</dd></div>}
                  {price.options !== 0 && <div className="flex justify-between"><dt>Options</dt><dd>{inr(price.options)}</dd></div>}
                  {price.customDimensions !== 0 && <div className="flex justify-between"><dt>Custom size</dt><dd>{inr(price.customDimensions)}</dd></div>}
                </dl>
              )}
              <button
                type="button"
                data-testid="add-to-cart"
                disabled={!canAdd}
                onClick={handleAdd}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-daxul-lime px-5 py-3 text-sm font-bold uppercase tracking-wider text-daxul-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {!canAdd ? (
                  "Updating preview..."
                ) : added ? (
                  <>
                    <Check className="h-4 w-4" /> Added to cart
                  </>
                ) : (
                  "Add to cart"
                )}
              </button>
              <p className="text-[11px] text-[#71717A]">Custom product: prepaid only (no cash on delivery). {s.leadTimeText}.</p>
            </div>

            <p className="border-t border-daxul-black/10 pt-4 text-[11px] leading-relaxed text-[#71717A]">{LITHOPHANE_LIMITATIONS}</p>
          </section>
        </div>
      )}

      {!photo && phase === "idle" && (
        <p className="text-center text-xs text-[#71717A]">
          Choose a photo and we will build your lithophane preview automatically. You will then pick a product type and size.
        </p>
      )}
      {canAr && (
        <LithophaneArModal
          isOpen={arModalOpen}
          onClose={() => setArModalOpen(false)}
          varietyName={variety.name}
          varietyKey={variety.key}
          widthMm={preview.gen.config.widthMm}
          heightMm={preview.gen.config.heightMm}
          depthMm={sizeObj?.depthMm ?? null}
          priceText={price ? inr(price.lineTotal) : undefined}
          lightOn={lightOn}
          onToggleLight={() => setLightOn(!lightOn)}
          supportsLight={variety.supportsLight}
          generationId={preview.generationId}
          hash={preview.hash}
          onPrepareGlb={prepareArGlb}
        />
      )}
    </div>
  );
}
