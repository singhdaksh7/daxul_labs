"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import {
  ShoppingBag,
  Zap,
  Truck,
  Clock,
  ShieldCheck,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Sliders,
} from "lucide-react";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { products, addToCart, siteSettings } = useStore();

  const product = products.find((p) => p.slug === id || p.id === id);

  if (!product) {
    return (
      <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
          <h1 className="text-3xl font-bold uppercase">Object Not Found</h1>
          <p className="text-gray-400 text-sm">The requested 3D product does not exist or has been archived.</p>
          <Link
            href="/shop"
            className="bg-[#C8FF35] text-[#0B0B0C] px-6 py-2.5 rounded-full text-xs font-bold uppercase"
          >
            Return to Shop Catalog
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  // Gallery state
  const [selectedImage, setSelectedImage] = useState(product.images[0] || "");

  // Variant selection states
  const [selectedFinish, setSelectedFinish] = useState(product.finishes[0] || "");
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "");

  // Custom Form Fields values state
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  // Accordion open states
  const [activeTab, setActiveTab] = useState<"story" | "specs" | "care" | "faq">("story");

  // Handle custom text/select input change
  const handleCustomChange = (fieldId: string, label: string, val: string) => {
    setCustomValues((prev) => ({ ...prev, [label]: val }));
  };

  // Handle simulated photo upload
  const handlePhotoUpload = (label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fakeUrl = URL.createObjectURL(file);
      setUploadedFiles((prev) => ({ ...prev, [label]: file.name }));
      setCustomValues((prev) => ({ ...prev, [label]: `Uploaded: ${file.name}` }));
    }
  };

  // Calculate customization fees from active custom fields
  const totalCustomFee = product.customFields.reduce((sum, field) => {
    const val = customValues[field.label];
    if (val && val.trim() !== "") {
      return sum + (field.fee || 0);
    }
    return sum;
  }, 0);

  const unitPriceWithCustomizations = product.price + totalCustomFee;

  const handleAddToCart = (buyNow = false) => {
    // Check required fields
    for (const field of product.customFields) {
      if (field.required && !customValues[field.label]) {
        alert(`Please complete required field: ${field.label}`);
        return;
      }
    }

    addToCart({
      product,
      quantity: 1,
      selectedFinish,
      selectedColor,
      selectedSize,
      customizations: customValues,
      customizationFee: totalCustomFee,
      totalUnitPrice: unitPriceWithCustomizations,
    });

    if (buyNow) {
      window.location.href = "/checkout";
    }
  };

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Product Detail Section */}
      <section className="py-12 lg:py-20 border-b border-[#242426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumbs */}
          <div className="text-xs font-mono text-gray-400 flex items-center gap-2 mb-8 uppercase tracking-wider">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-white">Shop</Link>
            <span>/</span>
            <span className="text-[#C8FF35]">{product.category}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Left Column: Image Gallery (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Main Image Frame */}
              <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-[#151515] border border-[#242426] shadow-2xl">
                <img
                  src={selectedImage || product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover object-center transition-all duration-500"
                />

                {product.badge && (
                  <span className="absolute top-4 left-4 bg-[#0B0B0C]/90 text-[#C8FF35] text-xs font-mono uppercase tracking-wider px-3 py-1 rounded border border-[#242426]">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 bg-[#151515] shrink-0 transition-all ${
                        selectedImage === img ? "border-[#C8FF35]" : "border-[#242426] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Order & Custom Form Builder (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              <div>
                <span className="text-xs font-mono text-[#C8FF35] uppercase tracking-[0.3em] block mb-1">
                  {product.category}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white mb-2">
                  {product.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Price Display */}
              <div className="p-4 bg-[#151515] rounded-xl border border-[#242426] flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-white">
                    {siteSettings.currencySymbol}{unitPriceWithCustomizations}
                    {totalCustomFee > 0 && (
                      <span className="text-xs text-[#C8FF35] font-mono ml-2">
                        (+{siteSettings.currencySymbol}{totalCustomFee} customization fee)
                      </span>
                    )}
                  </div>
                  {product.compareAtPrice && (
                    <div className="text-xs text-gray-500 line-through">
                      MSRP: {siteSettings.currencySymbol}{product.compareAtPrice}
                    </div>
                  )}
                </div>

                <div className="text-right text-[11px] font-mono text-[#C8FF35]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{product.productionTimeDays} Days Print Time</span>
                  </div>
                  <div className="text-gray-400 text-[10px]">
                    Est. Dispatch: {product.estimatedDispatchDays} business days
                  </div>
                </div>
              </div>

              {/* Variant Selectors */}
              {product.finishes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex justify-between">
                    <span>Finish Option</span>
                    <span className="text-[#C8FF35]">{selectedFinish}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.finishes.map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedFinish(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                          selectedFinish === f
                            ? "bg-[#C8FF35] text-[#0B0B0C] font-extrabold"
                            : "bg-[#151515] text-gray-300 border border-[#242426] hover:border-gray-500"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.colors.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex justify-between">
                    <span>Light / Color Spectrum</span>
                    <span className="text-[#C8FF35]">{selectedColor}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedColor === c
                            ? "bg-[#C8FF35] text-[#0B0B0C] font-extrabold"
                            : "bg-[#151515] text-gray-300 border border-[#242426] hover:border-gray-500"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.sizes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex justify-between">
                    <span>Scale / Dimensions</span>
                    <span className="text-[#C8FF35]">{selectedSize}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedSize === s
                            ? "bg-[#C8FF35] text-[#0B0B0C] font-extrabold"
                            : "bg-[#151515] text-gray-300 border border-[#242426] hover:border-gray-500"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DYNAMIC CUSTOMIZATION FORM BUILDER FIELDS */}
              {product.customFields.length > 0 && (
                <div className="bg-[#151515] border border-[#C8FF35]/30 p-5 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#242426] pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C8FF35] flex items-center gap-1.5">
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
                          <span className="text-[10px] text-[#C8FF35] font-mono">
                            +{siteSettings.currencySymbol}{field.fee}
                          </span>
                        )}
                      </label>

                      {field.helpText && (
                        <p className="text-[11px] text-gray-400">{field.helpText}</p>
                      )}

                      {field.type === "text" && (
                        <input
                          type="text"
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={customValues[field.label] || ""}
                          onChange={(e) => handleCustomChange(field.id, field.label, e.target.value)}
                          className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-3 py-2 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none"
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={customValues[field.label] || ""}
                          onChange={(e) => handleCustomChange(field.id, field.label, e.target.value)}
                          className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-xs text-white placeholder:text-gray-600 focus:outline-none"
                        />
                      )}

                      {field.type === "date" && (
                        <input
                          type="date"
                          value={customValues[field.label] || ""}
                          onChange={(e) => handleCustomChange(field.id, field.label, e.target.value)}
                          className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      )}

                      {field.type === "select" && field.options && (
                        <select
                          value={customValues[field.label] || ""}
                          onChange={(e) => handleCustomChange(field.id, field.label, e.target.value)}
                          className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                        >
                          <option value="">Select Option...</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === "photo" && (
                        <div className="relative border-2 border-dashed border-[#242426] hover:border-[#C8FF35] bg-[#0B0B0C] p-4 rounded-xl text-center cursor-pointer transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(field.label, e)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Upload className="w-5 h-5 mx-auto text-[#C8FF35] mb-1" />
                          <div className="text-xs font-semibold text-gray-300">
                            {uploadedFiles[field.label] ? (
                              <span className="text-[#C8FF35] font-bold">✓ {uploadedFiles[field.label]}</span>
                            ) : (
                              "Click or drag photo here to upload"
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">High-contrast photo works best for lithophane projection</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Prepaid Only Tag if enabled */}
              {product.prepaidOnly && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Custom product: Requires Prepaid Payment at checkout.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleAddToCart(false)}
                  className="w-full flex items-center justify-center gap-2 bg-[#C8FF35] hover:bg-white text-[#0B0B0C] font-extrabold py-4 rounded-xl text-xs uppercase tracking-widest transition-all duration-300 shadow-xl shadow-[#C8FF35]/15"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add To Cart</span>
                </button>

                <button
                  onClick={() => handleAddToCart(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#242426] hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-colors border border-[#242426]"
                >
                  <Zap className="w-4 h-4 text-[#C8FF35]" />
                  <span>Buy It Now</span>
                </button>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-2 gap-3 pt-4 text-[11px] text-gray-400 border-t border-[#242426]">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#C8FF35]" />
                  <span>Dispatched in 3-5 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C8FF35]" />
                  <span>7-Day Replacement Guarantee</span>
                </div>
              </div>

            </div>

          </div>

          {/* Product Story, Technical Specs, Care Instructions, & FAQ Tabs */}
          <div className="mt-16 pt-12 border-t border-[#242426]">
            
            {/* Tab navigation */}
            <div className="flex border-b border-[#242426] text-xs font-bold uppercase tracking-wider space-x-8 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab("story")}
                className={`pb-4 transition-colors ${
                  activeTab === "story" ? "text-[#C8FF35] border-b-2 border-[#C8FF35]" : "text-gray-400 hover:text-white"
                }`}
              >
                Product Story
              </button>
              <button
                onClick={() => setActiveTab("specs")}
                className={`pb-4 transition-colors ${
                  activeTab === "specs" ? "text-[#C8FF35] border-b-2 border-[#C8FF35]" : "text-gray-400 hover:text-white"
                }`}
              >
                Tech Specs ({product.specs.length})
              </button>
              <button
                onClick={() => setActiveTab("care")}
                className={`pb-4 transition-colors ${
                  activeTab === "care" ? "text-[#C8FF35] border-b-2 border-[#C8FF35]" : "text-gray-400 hover:text-white"
                }`}
              >
                Care Instructions
              </button>
              <button
                onClick={() => setActiveTab("faq")}
                className={`pb-4 transition-colors ${
                  activeTab === "faq" ? "text-[#C8FF35] border-b-2 border-[#C8FF35]" : "text-gray-400 hover:text-white"
                }`}
              >
                Product FAQ ({product.faq.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="py-8">
              {activeTab === "story" && (
                <div className="max-w-3xl space-y-4 text-sm text-gray-300 leading-relaxed">
                  <p>{product.story || product.description}</p>
                </div>
              )}

              {activeTab === "specs" && (
                <div className="max-w-2xl divide-y divide-[#242426] border border-[#242426] rounded-xl overflow-hidden bg-[#151515]">
                  {product.specs.map((spec, i) => (
                    <div key={i} className="p-3.5 flex justify-between text-xs">
                      <span className="font-bold text-gray-400">{spec.label}</span>
                      <span className="font-mono text-white">{spec.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "care" && (
                <ul className="max-w-xl space-y-2 text-xs text-gray-300 list-disc list-inside">
                  {product.careInstructions.map((ci, i) => (
                    <li key={i}>{ci}</li>
                  ))}
                </ul>
              )}

              {activeTab === "faq" && (
                <div className="max-w-3xl space-y-3">
                  {product.faq.map((item, i) => (
                    <div key={i} className="bg-[#151515] border border-[#242426] p-4 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-[#C8FF35]">{item.question}</div>
                      <div className="text-xs text-gray-300">{item.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-[#242426] space-y-6">
              <h3 className="text-xl font-extrabold uppercase tracking-tight text-white">
                Related {product.category} Objects
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/shop/${rel.slug}`}
                    className="bg-[#151515] border border-[#242426] hover:border-[#C8FF35] p-4 rounded-2xl group transition-all"
                  >
                    <div className="aspect-square rounded-xl bg-[#0B0B0C] overflow-hidden mb-3">
                      <img src={rel.images[0]} alt={rel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="text-xs text-gray-400 font-mono uppercase">{rel.category}</div>
                    <div className="text-sm font-bold text-white group-hover:text-[#C8FF35] transition-colors">{rel.name}</div>
                    <div className="text-sm font-black text-white mt-1">{siteSettings.currencySymbol}{rel.price}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </main>
  );
}
