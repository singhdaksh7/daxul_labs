"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartVariantSelection } from "@/lib/storeContext";
import { useSiteSettings } from "@/lib/siteContext";
import {
  formatMoney,
  isChoiceField,
  isUploadField,
  quoteCustomizations,
  variantAdjustment,
} from "@/lib/cartPricing";
import type { CustomFieldConfig, StoreProduct } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import PincodeEstimator from "@/components/PincodeEstimator";
import RecentlyViewedTray from "@/components/RecentlyViewedTray";
import ProductReviewsSection from "@/components/ProductReviewsSection";
import { ProductQASection } from "@/components/ProductQASection";
import BackInStockModal from "@/components/BackInStockModal";
import { useTrackProductView, trackFunnel } from "@/lib/useFunnelTracker";
import { ShoppingBag, Zap, Truck, Clock, ShieldCheck, Upload, Sliders, Heart, Bell } from "lucide-react";
import { useWishlist } from "@/lib/useWishlist";

const inputCls =
  "w-full bg-white border border-daxul-black/15 focus:border-daxul-black rounded-lg px-3 py-2 text-xs text-daxul-black placeholder:text-[#71717A]/60 focus:outline-none";

export default function ProductClient({
  product,
  related,
}: {
  product: StoreProduct;
  related: StoreProduct[];
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const settings = useSiteSettings();
  const money = (n: number) => formatMoney(settings.currencySymbol, n);

  useTrackProductView(product.id);

  const [selectedImage, setSelectedImage] = useState(product.images[0] || "");
  const [activeTab, setActiveTab] = useState<"story" | "specs" | "care" | "faq" | "reviews" | "qa">("story");

  // groupId -> variantId (default: first in-stock variant of each group)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of product.variantGroups) {
      const first = g.variants.find((v) => v.inStock) ?? g.variants[0];
      if (first) init[g.id] = first.id;
    }
    return init;
  });

  // fieldId -> value
  const [values, setValues] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [backInStockOpen, setBackInStockOpen] = useState(false);

  const setValue = (fieldId: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleUpload = async (field: CustomFieldConfig, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setErrors((p) => ({ ...p, [field.id]: "File is too large (max 15 MB)." }));
      return;
    }
    setUploading((p) => ({ ...p, [field.id]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.file?.url) throw new Error(data?.error || "Upload failed");
      setFileNames((p) => ({ ...p, [field.id]: file.name }));
      setValue(field.id, data.file.url as string);
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [field.id]: err instanceof Error ? err.message : "Upload failed. Please try again.",
      }));
    } finally {
      setUploading((p) => ({ ...p, [field.id]: false }));
    }
  };

  // Live price: base + variant adjustments + custom field fees + choice adjustments
  const variantAdj = useMemo(
    () => variantAdjustment(product, selectedVariants),
    [product, selectedVariants]
  );
  const quote = useMemo(() => quoteCustomizations(product.customFields, values), [product.customFields, values]);
  const unitPrice = product.price + variantAdj + quote.fee;

  const selectedVariantObjects: CartVariantSelection[] = product.variantGroups.flatMap((g) => {
    const v = g.variants.find((x) => x.id === selectedVariants[g.id]);
    return v
      ? [
          {
            groupId: g.id,
            variantId: v.id,
            groupName: g.name,
            variantName: v.name,
            priceAdjustment: v.priceAdjustment,
          },
        ]
      : [];
  });

  const anySelectedVariantOut = product.variantGroups.some((g) => {
    const v = g.variants.find((x) => x.id === selectedVariants[g.id]);
    return v ? !v.inStock : false;
  });
  const canPurchase = product.inStock && !anySelectedVariantOut;
  const anyUploading = Object.values(uploading).some(Boolean);

  const prepaidNote =
    product.prepaidOnly || !product.codEnabled || (product.customizable && settings.customProductsPrepaidOnly);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const f of product.customFields) {
      const v = (values[f.id] ?? "").trim();
      if (f.required && !v) {
        next[f.id] = `${f.label} is required.`;
      } else if (v && isChoiceField(f.type) && f.choices && !f.choices.some((c) => c.value === v)) {
        next[f.id] = `Please choose a valid option for ${f.label}.`;
      }
    }
    for (const g of product.variantGroups) {
      if (!selectedVariants[g.id]) next[`variant:${g.id}`] = `Please choose ${g.name}.`;
    }
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    setFormError(ok ? null : "Please complete the highlighted fields before adding to cart.");
    return ok;
  };

  const handleAdd = (buyNow: boolean) => {
    if (!canPurchase || anyUploading) return;
    if (!validate()) return;
    const customizations: Record<string, string> = {};
    for (const f of product.customFields) {
      const v = (values[f.id] ?? "").trim();
      if (v) customizations[f.id] = v;
    }
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0] || "",
        quantity: 1,
        basePrice: product.price,
        variantSelections: selectedVariantObjects,
        customizations,
        customizationDetails: quote.details,
        customizationFee: quote.fee,
        unitPrice,
        prepaidOnly: product.prepaidOnly,
        codEnabled: product.codEnabled,
        customizable: product.customizable,
      },
      !buyNow
    );
    trackFunnel("ADD_TO_CART", { productId: product.id });
    if (buyNow) router.push("/checkout");
  };

  const renderField = (field: CustomFieldConfig) => {
    const val = values[field.id] ?? "";
    const ph = field.placeholder || `Enter ${field.label}...`;
    const t = field.type;

    if (t === "textarea") {
      return (
        <textarea
          rows={3}
          placeholder={ph}
          value={val}
          maxLength={1000}
          onChange={(e) => setValue(field.id, e.target.value)}
          className={`${inputCls} p-3`}
        />
      );
    }
    if (t === "date") {
      return <input type="date" value={val} onChange={(e) => setValue(field.id, e.target.value)} className={inputCls} />;
    }
    if (t === "select" || t === "color") {
      return (
        <select value={val} onChange={(e) => setValue(field.id, e.target.value)} className={`${inputCls} uppercase cursor-pointer`}>
          <option value="">Select Option...</option>
          {(field.choices ?? []).map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
              {c.priceAdjustment ? ` (${c.priceAdjustment > 0 ? "+" : ""}${money(c.priceAdjustment)})` : ""}
            </option>
          ))}
        </select>
      );
    }
    if (t === "radio") {
      return (
        <div className="space-y-1.5" role="radiogroup" aria-label={field.label}>
          {(field.choices ?? []).map((c) => (
            <label
              key={c.value}
              className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors ${
                val === c.value ? "border-daxul-black bg-white" : "border-daxul-black/15 bg-white hover:border-daxul-black/40"
              }`}
            >
              <span className="flex items-center gap-2 text-daxul-black font-medium">
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  checked={val === c.value}
                  onChange={() => setValue(field.id, c.value)}
                  className="accent-daxul-black"
                />
                {c.label}
              </span>
              {c.priceAdjustment ? (
                <span className="text-[10px] text-daxul-black font-mono">
                  {c.priceAdjustment > 0 ? "+" : ""}
                  {money(c.priceAdjustment)}
                </span>
              ) : null}
            </label>
          ))}
        </div>
      );
    }
    if (isUploadField(t)) {
      return (
        <div className="relative border-2 border-dashed border-daxul-black/20 hover:border-daxul-black bg-white p-4 rounded-lg text-center cursor-pointer transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(field, e)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={field.label}
          />
          <Upload className="w-5 h-5 mx-auto text-daxul-black/70 mb-1" />
          <div className="text-xs font-semibold text-daxul-black">
            {uploading[field.id] ? (
              <span className="text-[#71717A]">Uploading...</span>
            ) : fileNames[field.id] ? (
              <span className="text-daxul-black font-bold">✓ {fileNames[field.id]}</span>
            ) : (
              "Click or drag file here to upload"
            )}
          </div>
          <div className="text-[10px] text-[#71717A] mt-0.5">High-contrast photo works best for lithophane projection</div>
        </div>
      );
    }
    // text (default)
    return (
      <input
        type="text"
        placeholder={ph}
        value={val}
        maxLength={300}
        onChange={(e) => setValue(field.id, e.target.value)}
        className={inputCls}
      />
    );
  };

  const hasSpecs = product.specs.length > 0;
  const hasCare = product.careInstructions.length > 0;
  const hasFaq = product.faq.length > 0;

  return (
    <div className="flex-1 py-8 sm:py-14 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full">
      {/* Breadcrumbs */}
      <div className="text-xs font-mono text-[#71717A] flex items-center gap-2 mb-8 uppercase tracking-wider">
        <Link href="/" className="hover:text-daxul-black">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-daxul-black">Shop</Link>
        <span>/</span>
        <span className="text-daxul-black font-semibold">{product.category}</span>
      </div>

      {/* 60% Gallery / 40% Purchase Panel Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        
        {/* Gallery (60% Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#EAE5DA] border border-daxul-black/10">
            {selectedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-mono uppercase tracking-widest text-[#71717A]">
                No image available
              </div>
            )}
            {product.badge && (
              <span className="absolute top-4 left-4 bg-daxul-bone text-daxul-black text-xs font-mono uppercase tracking-wider px-3 py-1 rounded border border-daxul-black/20">
                {product.badge}
              </span>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 bg-[#EAE5DA] shrink-0 transition-all ${
                    selectedImage === img ? "border-daxul-black" : "border-daxul-black/15 opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Panel (40% Desktop) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-[#71717A] uppercase tracking-[0.25em] block mb-1">
                  {product.category}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black mb-2">
                  {product.name}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={wishlisted ? "Remove from saved items" : "Save to wishlist"}
                className={`p-2.5 rounded-full border transition-colors shrink-0 ${
                  wishlisted
                    ? "bg-red-50 border-red-200 text-red-500"
                    : "bg-white border-daxul-black/15 text-daxul-black/60 hover:text-daxul-black hover:border-daxul-black"
                }`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>
            {product.subtitle && <p className="text-sm text-[#555550] font-medium mb-1">{product.subtitle}</p>}
            <p className="text-xs sm:text-sm text-[#555550] leading-relaxed">{product.description}</p>
          </div>

          {/* Price Box */}
          <div className="p-4 bg-white rounded-xl border border-daxul-black/10 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-daxul-black">
                {money(unitPrice)}
                {(variantAdj !== 0 || quote.fee > 0) && (
                  <span className="text-xs font-mono text-[#71717A] ml-2 font-normal">
                    (base {money(product.price)}
                    {variantAdj !== 0 && ` ${variantAdj > 0 ? "+" : "-"} ${money(Math.abs(variantAdj))}`}
                    {quote.fee > 0 && ` + ${money(quote.fee)} custom`})
                  </span>
                )}
              </div>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="text-xs text-[#71717A] line-through">MSRP: {money(product.compareAtPrice)}</div>
              )}
            </div>

            <div className="text-right text-[11px] font-mono text-daxul-black">
              <div className="flex items-center gap-1 justify-end font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{product.productionTimeDays} Days Print Time</span>
              </div>
              <div className="text-[#71717A] text-[10px]">
                {product.leadTimeText || `Est. Dispatch: ${product.estimatedDispatchDays} days`}
              </div>
            </div>
          </div>

          {/* Variant groups */}
          {product.variantGroups.map((g) => {
            const current = g.variants.find((v) => v.id === selectedVariants[g.id]);
            return (
              <div key={g.id} className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-daxul-black flex justify-between">
                  <span>{g.name}</span>
                  <span className="text-[#71717A] font-normal">{current?.name}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {g.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.inStock}
                      onClick={() => setSelectedVariants((prev) => ({ ...prev, [g.id]: v.id }))}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        selectedVariants[g.id] === v.id
                          ? "bg-daxul-black text-daxul-bone border-daxul-black"
                          : "bg-white text-daxul-black border-daxul-black/20 hover:border-daxul-black"
                      } ${!v.inStock ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                    >
                      {v.name}
                      {v.priceAdjustment !== 0 && (
                        <span className="ml-1 font-mono opacity-80">
                          ({v.priceAdjustment > 0 ? "+" : "-"}
                          {money(Math.abs(v.priceAdjustment))})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {errors[`variant:${g.id}`] && (
                  <p className="text-[11px] text-red-600">{errors[`variant:${g.id}`]}</p>
                )}
              </div>
            );
          })}

          {/* Dynamic customization fields (from DB custom fields) */}
          {product.customFields.length > 0 && (
            <div className="bg-white border border-daxul-black/15 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-daxul-black/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-daxul-black flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>Custom Options</span>
                </span>
                <span className="text-[10px] text-[#71717A] font-mono">Personalized</span>
              </div>

              {product.customFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-semibold text-daxul-black flex justify-between">
                    <span>
                      <span>{field.label}</span>
                      {field.required && <span className="text-red-500"> *</span>}
                    </span>
                    {field.fee > 0 && (
                      <span className="text-[10px] text-daxul-black font-mono">+{money(field.fee)}</span>
                    )}
                  </label>
                  {field.helpText && <p className="text-[11px] text-[#71717A]">{field.helpText}</p>}
                  {renderField(field)}
                  {errors[field.id] && <p className="text-[11px] text-red-600 font-medium">{errors[field.id]}</p>}
                </div>
              ))}
            </div>
          )}

          {prepaidNote && (
            <div className="text-xs bg-[#EAE5DA] border border-daxul-black/15 text-daxul-black p-3 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Requires prepaid payment at checkout (COD not available for custom build).</span>
            </div>
          )}

          {formError && (
            <div role="alert" className="text-xs bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg">
              {formError}
            </div>
          )}

          {/* Add to Cart Actions or Back in Stock Alert */}
          {!canPurchase ? (
            <div className="pt-2">
              <button
                onClick={() => setBackInStockOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-daxul-black text-daxul-bone font-bold py-4 rounded-lg text-xs uppercase tracking-widest hover:bg-daxul-black/85 transition-colors border border-daxul-black"
              >
                <Bell className="w-4 h-4 text-daxul-lime" />
                <span>Notify Me When Available</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleAdd(false)}
                disabled={!canPurchase || anyUploading}
                className="w-full flex items-center justify-center gap-2 bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-bold py-4 rounded-lg text-xs uppercase tracking-widest border border-daxul-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add To Cart</span>
              </button>

              <button
                onClick={() => handleAdd(true)}
                disabled={!canPurchase || anyUploading}
                className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-daxul-black/5 text-daxul-black font-semibold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-colors border border-daxul-black/30 hover:border-daxul-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                <span>Buy It Now</span>
              </button>
            </div>
          )}

          {/* Delivery & Pincode Checker */}
          <div className="pt-1">
            <PincodeEstimator productionTimeDays={product.productionTimeDays} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 text-[11px] text-[#71717A] border-t border-daxul-black/10">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-daxul-black" />
              <span>Dispatch in ~{product.estimatedDispatchDays} days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-daxul-black" />
              <Link href="/policies/returns" className="hover:underline">
                7-day replacement
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Accordions / Tabs: Story, Tech Specs, Care, FAQ */}
      <div className="mt-16 pt-10 border-t border-daxul-black/10">
        <div className="flex border-b border-daxul-black/10 text-xs font-bold uppercase tracking-wider space-x-8 overflow-x-auto hide-scrollbar">
          {(
            [
              ["story", "Description & Story", true],
              ["specs", `Specifications (${product.specs.length})`, hasSpecs],
              ["care", "Care Instructions", hasCare],
              ["faq", `FAQ (${product.faq.length})`, hasFaq],
              ["reviews", "Reviews", true],
              ["qa", "Q&A", true],
            ] as const
          )
            .filter(([, , show]) => show)
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`pb-4 transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? "text-daxul-black border-b-2 border-daxul-black font-bold"
                    : "text-[#71717A] hover:text-daxul-black"
                }`}
              >
                {label}
              </button>
            ))}
        </div>

        <div className="py-8">
          {activeTab === "story" && (
            <div className="max-w-3xl space-y-4 text-sm text-[#555550] leading-relaxed">
              <p>{product.story || product.description}</p>
              {(product.materials || product.dimensions) && (
                <ul className="text-xs text-[#71717A] space-y-1 pt-2 font-mono">
                  {product.materials && <li>Materials: {product.materials}</li>}
                  {product.dimensions && <li>Dimensions: {product.dimensions}</li>}
                </ul>
              )}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="max-w-2xl divide-y divide-daxul-black/10 border-y border-daxul-black/10">
              {product.specs.map((s, idx) => (
                <div key={idx} className="py-3 flex justify-between text-xs">
                  <span className="font-semibold text-daxul-black">{s.label}</span>
                  <span className="text-[#555550] font-mono">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "care" && (
            <ul className="max-w-2xl space-y-2 text-xs text-[#555550] list-disc list-inside">
              {product.careInstructions.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          )}

          {activeTab === "faq" && (
            <div className="max-w-2xl space-y-4">
              {product.faq.map((f, idx) => (
                <div key={idx} className="bg-white border border-daxul-black/10 rounded-lg p-4 space-y-1">
                  <h4 className="text-xs font-bold text-daxul-black">{f.question}</h4>
                  <p className="text-xs text-[#555550] leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "reviews" && (
            <ProductReviewsSection productId={product.id} productName={product.name} />
          )}

          {activeTab === "qa" && (
            <ProductQASection productId={product.id} productName={product.name} />
          )}
        </div>
      </div>

      {/* Related Products Grid */}
      {related.length > 0 && (
        <div className="mt-16 pt-12 border-t border-daxul-black/10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-daxul-black">
              Related Objects
            </h3>
            <Link href="/shop" className="text-xs font-semibold uppercase tracking-wider text-daxul-black hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {related.slice(0, 4).map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed Objects Shelf */}
      <RecentlyViewedTray currentProductId={product.id} />

      {/* Back In Stock Modal */}
      <BackInStockModal
        productId={product.id}
        productName={product.name}
        isOpen={backInStockOpen}
        onClose={() => setBackInStockOpen(false)}
      />
    </div>
  );
}
