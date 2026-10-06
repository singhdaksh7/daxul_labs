"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStore } from "@/lib/storeContext";
import {
  Upload,
  Palette,
  Cpu,
  Hammer,
  CheckCircle2,
  FileImage,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

export default function CustomizePage() {
  const { products, addToCart, siteSettings } = useStore();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id || "");
  const [artworkType, setArtworkType] = useState<"image" | "logo" | "silhouette" | "sketch" | "artwork">("image");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [customName1, setCustomName1] = useState("");
  const [customName2, setCustomName2] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [baseColor, setBaseColor] = useState("Matte Charcoal");
  const [lightColor, setLightColor] = useState("Warm Gold (2700K)");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const targetProd = products.find((p) => p.id === selectedProduct) || products[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileUrl(URL.createObjectURL(file));
    }
  };

  const handleFinishCustomization = () => {
    const customSummary: Record<string, string> = {
      'Artwork Type': artworkType.toUpperCase(),
      'Uploaded File': fileName || 'Reference uploaded',
      'Name 1 / Text A': customName1 || 'N/A',
      'Name 2 / Text B': customName2 || 'N/A',
      'Special Date': customDate || 'N/A',
      'Base Finish': baseColor,
      'Light Temp': lightColor,
      'Custom Instructions': specialInstructions || 'Standard precision slicing',
    };

    addToCart({
      product: targetProd,
      quantity: 1,
      selectedFinish: baseColor,
      selectedColor: lightColor,
      selectedSize: targetProd.sizes[0] || 'Standard',
      customizations: customSummary,
      customizationFee: 300,
      totalUnitPrice: targetProd.price + 300,
    });

    setIsSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex flex-col font-sans text-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#151515] border-b border-[#242426] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C8FF35]">
            BESPOKE ADDITIVE STUDIO
          </span>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">
            Customize Your Object.
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Turn your personal photos, couple portraits, vector logos, and sketches into 3D light-refracting projection lamps and monolith sculptures.
          </p>
        </div>
      </section>

      {/* Interactive 4-Step Studio Flow */}
      <section className="flex-1 py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        
        {/* Step Progress Tracker Bar */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 bg-[#151515] p-2 sm:p-3 rounded-2xl border border-[#242426]">
          {[
            { num: 1, label: "1. Upload", icon: Upload },
            { num: 2, label: "2. Customize", icon: Palette },
            { num: 3, label: "3. We Design", icon: Cpu },
            { num: 4, label: "4. We Make", icon: Hammer },
          ].map((s) => {
            const IconComp = s.icon;
            const isActive = activeStep === s.num;
            const isDone = activeStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setActiveStep(s.num as any)}
                className={`p-3 rounded-xl flex items-center justify-center sm:justify-between text-xs font-extrabold uppercase transition-all ${
                  isActive
                    ? "bg-[#C8FF35] text-[#0B0B0C] shadow-lg shadow-[#C8FF35]/20"
                    : isDone
                    ? "bg-[#242426] text-[#C8FF35]"
                    : "bg-[#0B0B0C] text-gray-500 hover:text-white"
                }`}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.num}</span>
                <IconComp className="w-4 h-4 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Success Modal state */}
        {isSubmitted ? (
          <div className="bg-[#151515] border border-[#C8FF35] p-8 sm:p-12 rounded-3xl text-center space-y-6 animate-in zoom-in-95">
            <CheckCircle2 className="w-16 h-16 text-[#C8FF35] mx-auto animate-bounce" />
            <h2 className="text-3xl font-extrabold uppercase tracking-wide">
              Customization Added To Cart!
            </h2>
            <p className="text-sm text-gray-300 max-w-md mx-auto">
              Your custom artwork details and 3D configuration have been saved. Proceed to checkout to review your design proof options.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => setIsSubmitted(false)}
                className="bg-[#242426] text-white px-6 py-3 rounded-full text-xs font-bold uppercase"
              >
                Build Another Custom Object
              </button>
              <Link
                href="/checkout"
                className="bg-[#C8FF35] text-[#0B0B0C] px-8 py-3 rounded-full text-xs font-extrabold uppercase hover:bg-white transition-colors"
              >
                Proceed To Checkout
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[#151515] border border-[#242426] p-6 sm:p-10 rounded-3xl space-y-8">
            
            {/* STEP 1: UPLOAD */}
            {activeStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-[#242426] pb-4">
                  <h3 className="text-xl font-extrabold uppercase text-[#C8FF35] flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span>Step 1: Upload Artwork or Reference</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload your image, company logo, couple photo silhouette, sketch, or artwork reference.
                  </p>
                </div>

                {/* Target product selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Select Base Object Model to Customize:
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-xs text-white uppercase focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {siteSettings.currencySymbol}{p.price} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Artwork Category:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: "image", label: "Photo / Portrait" },
                      { id: "logo", label: "Vector Logo" },
                      { id: "silhouette", label: "Silhouette" },
                      { id: "sketch", label: "Hand Sketch" },
                      { id: "artwork", label: "Reference Art" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setArtworkType(t.id as any)}
                        className={`p-3 rounded-xl border text-center text-xs font-semibold uppercase transition-all ${
                          artworkType === t.id
                            ? "bg-[#C8FF35] text-[#0B0B0C] border-[#C8FF35] font-extrabold"
                            : "bg-[#0B0B0C] border-[#242426] text-gray-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload Dropzone */}
                <div className="border-2 border-dashed border-[#242426] hover:border-[#C8FF35] bg-[#0B0B0C] p-8 rounded-2xl text-center relative cursor-pointer transition-colors group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-12 h-12 rounded-full bg-[#151515] flex items-center justify-center mx-auto mb-3 border border-[#242426] group-hover:border-[#C8FF35]">
                    <FileImage className="w-6 h-6 text-[#C8FF35]" />
                  </div>
                  <div className="text-sm font-bold text-white uppercase">
                    {fileName ? <span className="text-[#C8FF35]">✓ Loaded: {fileName}</span> : "Click or Drag to Upload File"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Supports PNG, JPG, WEBP, SVG, DXF up to 25MB</p>

                  {fileUrl && (
                    <div className="mt-4 max-w-xs mx-auto aspect-video rounded-lg overflow-hidden border border-[#242426]">
                      <img src={fileUrl} alt="Upload Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="bg-[#C8FF35] text-[#0B0B0C] px-8 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-wider hover:bg-white transition-colors flex items-center gap-2"
                  >
                    <span>Next: Customize Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CUSTOMIZE DETAILS */}
            {activeStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-[#242426] pb-4">
                  <h3 className="text-xl font-extrabold uppercase text-[#C8FF35] flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    <span>Step 2: Personalize Text, Names & Lighting</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter names, anniversary dates, or engraved messages to be precision sliced into the object base.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Primary Name / Text A:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ROHAN"
                      value={customName1}
                      onChange={(e) => setCustomName1(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Secondary Name / Text B:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PRIYA"
                      value={customName2}
                      onChange={(e) => setCustomName2(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Special Date (Optional):
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Base Finish:
                    </label>
                    <select
                      value={baseColor}
                      onChange={(e) => setBaseColor(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-4 py-3 text-xs text-white uppercase focus:outline-none"
                    >
                      <option value="Matte Charcoal">Matte Charcoal</option>
                      <option value="Volcanic Obsidian">Volcanic Obsidian</option>
                      <option value="Chalk White">Chalk White</option>
                      <option value="Raw Titanium Texture">Raw Titanium Texture</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Light Temperature:
                    </label>
                    <select
                      value={lightColor}
                      onChange={(e) => setLightColor(e.target.value)}
                      className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    >
                      <option value="Warm Gold (2700K)">Warm Gold (2700K)</option>
                      <option value="Amber Sanctuary (2200K)">Amber Sanctuary (2200K)</option>
                      <option value="Neutral White (4000K)">Neutral White (4000K)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#C8FF35]" />
                    <span>Custom Instructions & Notes for 3D Designer:</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter any specific layout preferences, shadow height requests, or font styles..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] rounded-xl p-3 text-xs text-white placeholder:text-gray-600 focus:outline-none"
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="bg-[#242426] text-gray-300 px-6 py-3 rounded-full text-xs font-bold uppercase"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="bg-[#C8FF35] text-[#0B0B0C] px-8 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-wider hover:bg-white transition-colors flex items-center gap-2"
                  >
                    <span>Next: We Design (Proofing)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: WE DESIGN */}
            {activeStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-[#242426] pb-4">
                  <h3 className="text-xl font-extrabold uppercase text-[#C8FF35] flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    <span>Step 3: Studio Generative Slicing & Proofing</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Our computational design studio translates your vector artwork into 3D light refractors.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3 bg-[#0B0B0C] p-5 rounded-2xl border border-[#242426] text-xs text-gray-300">
                    <div className="font-bold text-[#C8FF35] uppercase tracking-wider mb-2">
                      Design Proofing Protocol:
                    </div>
                    <ul className="space-y-2 list-disc list-inside">
                      <li>Vector depth map generated within 24 hours of order confirmation.</li>
                      <li>High resolution 3D render proof emailed & sent via WhatsApp.</li>
                      <li>Includes 1 free design revision before slicing begins.</li>
                      <li>Optical diffraction tolerance checked at 0.12mm layer height.</li>
                    </ul>
                  </div>

                  <div className="bg-[#0B0B0C] p-5 rounded-2xl border border-[#242426] text-center space-y-2">
                    <Sparkles className="w-8 h-8 text-[#C8FF35] mx-auto animate-pulse" />
                    <div className="text-sm font-extrabold text-white uppercase">Digital Proof Guarantee</div>
                    <p className="text-xs text-gray-400">
                      We do not print until you approve the digital design proof.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="bg-[#242426] text-gray-300 px-6 py-3 rounded-full text-xs font-bold uppercase"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="bg-[#C8FF35] text-[#0B0B0C] px-8 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-wider hover:bg-white transition-colors flex items-center gap-2"
                  >
                    <span>Next: Manufacturing Summary</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: WE MAKE */}
            {activeStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-[#242426] pb-4">
                  <h3 className="text-xl font-extrabold uppercase text-[#C8FF35] flex items-center gap-2">
                    <Hammer className="w-5 h-5" />
                    <span>Step 4: Crafting & Order Confirmation</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Review your custom object summary before adding to your cart.
                  </p>
                </div>

                {/* Summary Table */}
                <div className="bg-[#0B0B0C] p-6 rounded-2xl border border-[#242426] space-y-3 text-xs">
                  <div className="flex justify-between font-bold text-[#C8FF35] uppercase border-b border-[#242426] pb-2">
                    <span>Base Model: {targetProd.name}</span>
                    <span>{siteSettings.currencySymbol}{targetProd.price + 300}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-gray-300 pt-1">
                    <div>Artwork Type: <span className="text-white font-mono">{artworkType.toUpperCase()}</span></div>
                    <div>Uploaded File: <span className="text-white font-mono">{fileName || "Default Upload"}</span></div>
                    <div>Name A: <span className="text-white font-mono">{customName1 || "N/A"}</span></div>
                    <div>Name B: <span className="text-white font-mono">{customName2 || "N/A"}</span></div>
                    <div>Special Date: <span className="text-white font-mono">{customDate || "N/A"}</span></div>
                    <div>Base Finish: <span className="text-white font-mono">{baseColor}</span></div>
                    <div>Light Temp: <span className="text-white font-mono">{lightColor}</span></div>
                    <div>Production: <span className="text-[#C8FF35] font-mono">{targetProd.productionTimeDays} Days</span></div>
                  </div>

                  {specialInstructions && (
                    <div className="pt-2 border-t border-[#242426] text-gray-400">
                      Notes: "{specialInstructions}"
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="bg-[#242426] text-gray-300 px-6 py-3 rounded-full text-xs font-bold uppercase"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishCustomization}
                    className="bg-[#C8FF35] text-[#0B0B0C] px-10 py-4 rounded-full text-xs font-extrabold uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-[#C8FF35]/20 flex items-center gap-2"
                  >
                    <span>Add Custom Order To Cart</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </section>

      <Footer />
    </main>
  );
}
