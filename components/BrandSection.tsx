"use client";

import React from "react";

export default function BrandSection() {
  return (
    <section id="about" className="bg-[#F3F0E9] text-[#0B0B0C] py-24 lg:py-36 border-b border-[#E5E0D5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        
        <span className="text-xs font-bold tracking-[0.4em] uppercase text-[#666660] block">
          BRAND MANIFESTO
        </span>

        {/* Large Editorial Headline */}
        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[0.95] max-w-5xl mx-auto">
          WE DON&apos;T PRINT THINGS.<br />
          WE BUILD OBJECTS WORTH KEEPING.
        </h2>

        {/* Supporting Paragraph */}
        <p className="text-base sm:text-lg text-[#555550] max-w-2xl mx-auto font-normal leading-relaxed">
          DAXUL LABS explores design, light, personalization and digital manufacturing to create products made differently. Every object is engineered with intention, balancing modern physical aesthetics with functional illumination.
        </p>

        {/* Brand Pillars */}
        <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto text-left border-t border-[#D8D3C7]">
          <div>
            <span className="text-xs font-mono font-bold text-[#0B0B0C] block mb-1">01 / DESIGN FIRST</span>
            <p className="text-xs text-[#666660]">Form and lighting optics lead every decision before manufacturing begins.</p>
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-[#0B0B0C] block mb-1">02 / MODERN CRAFT</span>
            <p className="text-xs text-[#666660]">Blending digital precision with hand-finished assembly and optical quality.</p>
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-[#0B0B0C] block mb-1">03 / PERSONAL INTENT</span>
            <p className="text-xs text-[#666660]">Objects tailored to turn your space, memories, and light into living art.</p>
          </div>
        </div>

      </div>
    </section>
  );
}
