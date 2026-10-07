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
import { ShoppingBag, Zap, Truck, Clock, ShieldCheck, Upload, Sliders } from "lucide-react";

const inputCls =
  "w-full bg-daxul-black border border-daxul-graphite focus:border-daxul-lime rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none";

export default function ProductClient({
  product,
  related,
}: {
  product: StoreProduct;
  related: StoreProduct[];
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const settings = useSiteSettings();
  const money = (n: number) => formatMoney(settings.currencySymbol, n);

  const [selectedImage, setSelectedImage] = useState(product.images[0] || "");
  const [activeTab, setActiveTab] = useState<"story" | "specs" | "care" | "faq">("story");

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
    addToCart({
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
    });
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
        <select value={val} onChange={(e) => setValue(field.id, e.target.value)} className={`${inputCls} uppercase`}>
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
              className={`flex items-center justify-between gap-3 border rounded-xl px-3 py-2 text-xs cursor-pointer transition-colors ${
                val === c.value ? "border-daxul-lime bg-daxul-black" : "border-daxul-graphite bg-daxul-black"
              }`}
            >
              <span className="flex items-center gap-2 text-gray-200">
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  checked={val === c.value}
                  onChange={() => setValue(field.id, c.value)}
                  className="accent-daxul-lime"
                />
                {c.label}
              </span>
              {c.priceAdjustment ? (
                <span className="text-[10px] text-daxul-lime font-mono">
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
        <div className="relative border-2 border-dashed border-daxul-graphite hover:border-daxul-lime bg-daxul-black p-4 rounded-xl text-center cursor-pointer transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(field, e)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={field.label}
          />
          <Upload className="w-5 h-5 mx-auto text-daxul-lime mb-1" />
          <div className="text-xs font-semibold text-gray-300">
            {uploading[field.id] ? (
              <span className="text-gray-400">Uploading...</span>
            ) : fileNames[field.id] ? (
              <span className="text-daxul-lime font-bold">✓ {fileNames[field.id]}</span>
            ) : (
              "Click or drag file here to upload"
            )}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">High-contrast photo works best for lithophane projection</div>
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
    <>
      <section className="py-12 lg:py-20 border-b border-daxul-graphite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="text-xs font-mono text-gray-400 flex items-center gap-2 mb-8 uppercase tracking-wider">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-white">Shop</Link>
            <span>/</span>
            <span className="text-daxul-lime">{product.category}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Gallery */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-daxul-dark border border-daxul-graphite shadow-2xl">
                {selectedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-full object-cover object-center transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-mono uppercase tracking-widest text-daxul-gray">
                    No image available
                  </div>
                )}
                {product.badge && (
                  <span className="absolute top-4 left-4 bg-daxul-black/90 text-daxul-lime text-xs font-mono uppercase tracking-wider px-3 py-1 rounded border border-daxul-graphite">
                    {product.badge}
                  </span>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 bg-daxul-dark shrink-0 transition-all ${
                        selectedImage === img ? "border-daxul-lime" : "border-daxul-graphite opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Order panel */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-mono text-daxul-lime uppercase tracking-[0.3em] block mb-1">
                  {product.category}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white mb-2">
                  {product.name}
                </h1>
                {product.subtitle && <p className="text-sm text-gray-300 mb-1">{product.subtitle}</p>}
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{product.description}</p>
              </div>

              {/* Price */}
              <div className="p-4 bg-daxul-dark rounded-xl border border-daxul-graphite flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-white">
                    {money(unitPrice)}
                    {(variantAdj !== 0 || quote.fee > 0) && (
                      <span className="text-xs text-daxul-lime font-mono ml-2">
                        (base {money(product.price)}
                        {variantAdj !== 0 && ` ${variantAdj > 0 ? "+" : "-"} ${money(Math.abs(variantAdj))} options`}
                        {quote.fee > 0 && ` + ${money(quote.fee)} customization`})
                      </span>
                    )}
                  </div>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <div className="text-xs text-gray-500 line-through">MSRP: {money(product.compareAtPrice)}</div>
                  )}
                </div>

                <div className="text-right text-[11px] font-mono text-daxul-lime">
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{product.productionTimeDays} Days Print Time</span>
                  </div>
                  <div className="text-gray-400 text-[10px]">
                    {product.leadTimeText || `Est. Dispatch: ${product.estimatedDispatchDays} business days`}
                  </div>
                </div>
              </div>

              {/* Variant groups */}
              {product.variantGroups.map((g) => {
                const current = g.variants.find((v) => v.id === selectedVariants[g.id]);
                return (
                  <div key={g.id} className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex justify-between">
                      <span>{g.name}</span>
                      <span className="text-daxul-lime">{current?.name}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {g.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          disabled={!v.inStock}
                          onClick={() => setSelectedVariants((prev) => ({ ...prev, [g.id]: v.id }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            selectedVariants[g.id] === v.id
                              ? "bg-daxul-lime text-daxul-black font-extrabold"
                              : "bg-daxul-dark text-gray-300 border border-daxul-graphite hover:border-gray-500"
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
                      <p className="text-[11px] text-red-400">{errors[`variant:${g.id}`]}</p>
                    )}
                  </div>
                );
              })}

              {/* Dynamic customization form (from DB custom fields) */}
              {product.customFields.length > 0 && (
                <div className="bg-daxul-dark border border-daxul-lime/30 p-5 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-daxul-graphite pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-daxul-lime flex items-center gap-1.5">
                      <Sliders className="w-4 h-4" />
                      <span>Custom Object Fields</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Personalization Ready</span>
                  </div>

                  {product.customFields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-200 flex justify-between">
                        <span>
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </span>
                        {field.fee > 0 && (
                          <span className="text-[10px] text-daxul-lime font-mono">+{money(field.fee)}</span>
                        )}
                      </label>
                      {field.helpText && <p className="text-[11px] text-gray-400">{field.helpText}</p>}
                      {renderField(field)}
                      {errors[field.id] && <p className="text-[11px] text-red-400">{errors[field.id]}</p>}
                    </div>
                  ))}
                </div>
              )}

              {prepaidNote && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Requires prepaid payment at checkout (Cash on Delivery is not available for this item).</span>
                </div>
              )}

              {formError && (
                <div role="alert" className="text-xs bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl">
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleAdd(false)}
                  disabled={!canPurchase || anyUploading}
                  className="w-full flex items-center justify-center gap-2 bg-daxul-lime hover:bg-white text-daxul-black font-extrabold py-4 rounded-xl text-xs uppercase tracking-widest transition-all duration-300 shadow-xl shadow-daxul-lime/15 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{canPurchase ? "Add To Cart" : "Sold Out"}</span>
                </button>

                <button
                  onClick={() => handleAdd(true)}
                  disabled={!canPurchase || anyUploading}
                  className="w-full flex items-center justify-center gap-2 bg-daxul-graphite hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-colors border border-daxul-graphite disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4 text-daxul-lime" />
                  <span>Buy It Now</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 text-[11px] text-gray-400 border-t border-daxul-graphite">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-daxul-lime" />
                  <span>Dispatch in ~{product.estimatedDispatchDays} business days</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-daxul-lime" />
                  <Link href="/policies/returns" className="hover:text-white underline-offset-2 hover:underline">
                    Returns & replacement policy
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Story / Specs / Care / FAQ */}
          <div className="mt-16 pt-12 border-t border-daxul-graphite">
            <div className="flex border-b border-daxul-graphite text-xs font-bold uppercase tracking-wider space-x-8 overflow-x-auto hide-scrollbar">
              {(
                [
                  ["story", "Product Story", true],
                  ["specs", `Tech Specs (${product.specs.length})`, hasSpecs],
                  ["care", "Care Instructions", hasCare],
                  ["faq", `Product FAQ (${product.faq.length})`, hasFaq],
                ] as const
              )
                .filter(([, , show]) => show)
                .map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`pb-4 transition-colors whitespace-nowrap ${
                      activeTab === key ? "text-daxul-lime border-b-2 border-daxul-lime" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
            </div>

            <div className="py-8">
              {activeTab === "story" && (
                <div className="max-w-3xl space-y-4 text-sm text-gray-300 leading-relaxed">
                  <p>{product.story || product.description}</p>
                  {(product.materials || product.dimensions) && (
                    <ul className="text-xs text-gray-400 space-y-1 pt-2">
                      {product.materials && <li>Materials: {product.materials}</li>}
                      {product.dimensions && <li>Dimensions: {product.dimensions}</li>}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "specs" && hasSpecs && (
                <div className="max-w-2xl divide-y divide-daxul-graphite border border-daxul-graphite rounded-xl overflow-hidden bg-daxul-dark">
                  {product.specs.map((spec, i) => (
                    <div key={i} className="p-3.5 flex justify-between text-xs">
                      <span className="font-bold text-gray-400">{spec.label}</span>
                      <span className="font-mono text-white">{spec.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "care" && hasCare && (
                <ul className="max-w-xl space-y-2 text-xs text-gray-300 list-disc list-inside">
                  {product.careInstructions.map((ci, i) => (
                    <li key={i}>{ci}</li>
                  ))}
                </ul>
              )}

              {activeTab === "faq" && hasFaq && (
                <div className="max-w-3xl space-y-3">
                  {product.faq.map((item, i) => (
                    <div key={i} className="bg-daxul-dark border border-daxul-graphite p-4 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-daxul-lime">{item.question}</div>
                      <div className="text-xs text-gray-300">{item.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16 pt-12 border-t border-daxul-graphite space-y-6">
              <h3 className="text-xl font-extrabold uppercase tracking-tight text-white">
                Related {product.category} Objects
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {related.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/shop/${rel.slug}`}
                    className="bg-daxul-dark border border-daxul-graphite hover:border-daxul-lime p-4 rounded-2xl group transition-all"
                  >
                    <div className="aspect-square rounded-xl bg-daxul-black overflow-hidden mb-3">
                      {rel.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rel.images[0]}
                          alt={rel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono uppercase">{rel.category}</div>
                    <div className="text-sm font-bold text-white group-hover:text-daxul-lime transition-colors">
                      {rel.name}
                    </div>
                    <div className="text-sm font-black text-white mt-1">{money(rel.price)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
