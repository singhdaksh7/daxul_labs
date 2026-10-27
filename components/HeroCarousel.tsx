"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroBannerSlide } from "@/lib/cms/pageTypes";
import Hero from "@/components/Hero";

interface HeroCarouselProps {
  initialBanners?: HeroBannerSlide[];
  autoplay?: boolean;
  interval?: number; // milliseconds, default 5500
  showArrows?: boolean;
  showDots?: boolean;
  transitionStyle?: "subtle";
  className?: string;
}

export default function HeroCarousel({
  initialBanners = [],
  autoplay = true,
  interval = 5500,
  showArrows = true,
  showDots = true,
  transitionStyle = "subtle",
  className = "",
}: HeroCarouselProps) {
  const [banners, setBanners] = useState<HeroBannerSlide[]>(initialBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Register manual user interaction: pause rotation and resume after interval ms of inactivity
  const registerUserInteraction = useCallback(() => {
    setIsInteracting(true);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, interval);
  }, [interval]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  // Fetch banners client-side if not provided during SSR
  useEffect(() => {
    if (initialBanners && initialBanners.length > 0) {
      setBanners(initialBanners);
      return;
    }

    let isMounted = true;
    fetch("/api/banners/hero")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.banners) {
          setBanners(data.banners);
        }
      })
      .catch((err) => console.error("Error loading hero banners:", err));

    return () => {
      isMounted = false;
    };
  }, [initialBanners]);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);

    const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  // Pause when document tab is hidden
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const total = banners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = useCallback((idx: number) => {
    setCurrentIndex(idx);
  }, []);

  // User manual navigation triggers
  const handleNext = useCallback(() => {
    registerUserInteraction();
    nextSlide();
  }, [registerUserInteraction, nextSlide]);

  const handlePrev = useCallback(() => {
    registerUserInteraction();
    prevSlide();
  }, [registerUserInteraction, prevSlide]);

  const handleGoTo = useCallback((idx: number) => {
    registerUserInteraction();
    goToSlide(idx);
  }, [registerUserInteraction, goToSlide]);

  // Autoplay timer
  useEffect(() => {
    // If only 1 banner or autoplay disabled or paused or interacting or reduced motion: do not auto-rotate
    if (!autoplay || isPaused || isInteracting || isReducedMotion || total <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, interval);

    return () => clearInterval(timer);
  }, [autoplay, isPaused, isInteracting, isReducedMotion, total, interval, nextSlide]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (total <= 1) return;
    if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "ArrowRight") {
      handleNext();
    }
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold) {
      // Swiped left -> next
      handleNext();
    } else if (diff < -threshold) {
      // Swiped right -> prev
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // 13. FALLBACK: 0 active hero banners -> render approved static Hero
  if (total === 0) {
    return <Hero />;
  }

  // Active slide
  const currentSlide = banners[currentIndex] || banners[0];

  return (
    <section
      ref={containerRef}
      data-carousel="hero-carousel"
      className={`relative w-full bg-daxul-bone border-b border-daxul-black/10 overflow-hidden select-none ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Homepage Hero Banners"
    >
      {/* Slides container */}
      <div className="relative w-full min-h-[520px] sm:min-h-[580px] lg:min-h-[660px] flex items-center">
        {banners.map((slide, index) => {
          const isActive = index === currentIndex;
          const isDarkText = slide.textMode !== "light";
          const textAlign = slide.textAlign || "left";

          // Align classes
          const alignClass =
            textAlign === "center"
              ? "text-center items-center mx-auto"
              : textAlign === "right"
              ? "text-right items-end ml-auto"
              : "text-left items-start";

          const desktopImg = slide.desktopImage || "/images/hero_shadow_lamp.jpg";
          const mobileImg = slide.mobileImage || desktopImg;

          return (
            <div
              key={slide.id || index}
              data-banner-id={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity ${
                isReducedMotion ? "duration-0" : "duration-600"
              } ease-in-out ${
                isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
              aria-hidden={!isActive}
              aria-roledescription="slide"
              aria-label={`${slide.headline || slide.name} (${index + 1} of ${total})`}
            >
              {/* Media Background / Visual Container */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                {/* Desktop Image */}
                <div className="hidden sm:block absolute inset-0 w-full h-full">
                  <Image
                    src={desktopImg}
                    alt={slide.headline || slide.name || "DAXUL Banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 1440px) 100vw, 1440px"
                    className="object-cover object-center"
                  />
                </div>

                {/* Mobile Image (dedicated composition if available) */}
                <div className="block sm:hidden absolute inset-0 w-full h-full">
                  <Image
                    src={mobileImg}
                    alt={slide.headline || slide.name || "DAXUL Banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="100vw"
                    className="object-cover object-center"
                  />
                </div>

                {/* Subtle Overlays */}
                {slide.overlay ? (
                  <div className="absolute inset-0 bg-daxul-black/40" />
                ) : isDarkText ? (
                  // Gradient tint to ensure bone-colored text contrast on light/editorial banners
                  <div className="absolute inset-0 bg-gradient-to-r from-daxul-bone/95 via-daxul-bone/75 to-transparent sm:w-3/4 lg:w-3/5" />
                ) : (
                  // Gradient tint for light text on dark images
                  <div className="absolute inset-0 bg-gradient-to-r from-daxul-black/80 via-daxul-black/50 to-transparent sm:w-3/4 lg:w-3/5" />
                )}
              </div>

              {/* Text & Action Content */}
              <div className="relative z-20 max-w-[1440px] h-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center">
                <div className={`max-w-2xl py-12 sm:py-20 lg:py-24 flex flex-col space-y-6 ${alignClass}`}>
                  {slide.eyebrow && (
                    <span
                      className={`font-mono text-xs uppercase tracking-[0.25em] font-semibold block ${
                        isDarkText ? "text-[#71717A]" : "text-daxul-lime"
                      }`}
                    >
                      {slide.eyebrow}
                    </span>
                  )}

                  <h1
                    className={`text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase leading-[1.08] ${
                      isDarkText ? "text-daxul-black" : "text-daxul-bone"
                    }`}
                  >
                    {slide.headline || slide.text}
                  </h1>

                  {(slide.subheadline || slide.body) && (
                    <p
                      className={`text-sm sm:text-base lg:text-lg leading-relaxed max-w-lg ${
                        isDarkText ? "text-[#555550]" : "text-daxul-bone/85"
                      }`}
                    >
                      {slide.subheadline || slide.body}
                    </p>
                  )}

                  {/* CTAs */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    {slide.buttonText && slide.linkUrl && (
                      <Link
                        href={slide.linkUrl}
                        data-banner-cta="primary"
                        data-banner-id={slide.id}
                        className="inline-flex items-center justify-center bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-semibold text-xs tracking-[0.16em] uppercase px-7 py-4 border border-daxul-black transition-colors daxul-btn shadow-none"
                      >
                        {slide.buttonText}
                      </Link>
                    )}

                    {slide.secondaryCtaLabel && slide.secondaryCtaUrl && (
                      <Link
                        href={slide.secondaryCtaUrl}
                        data-banner-cta="secondary"
                        data-banner-id={slide.id}
                        className={`inline-flex items-center justify-center font-semibold text-xs tracking-[0.16em] uppercase px-7 py-4 border transition-colors daxul-btn ${
                          isDarkText
                            ? "bg-transparent hover:bg-daxul-black/5 text-daxul-black border-daxul-black/30 hover:border-daxul-black"
                            : "bg-transparent hover:bg-white/10 text-daxul-bone border-white/40 hover:border-white"
                        }`}
                      >
                        {slide.secondaryCtaLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. CONTROLS (Only visible if 2+ banners) */}
      {total > 1 && (
        <>
          {/* Navigation Arrows (Desktop) */}
          {showArrows && (
            <div className="hidden sm:flex absolute right-6 lg:right-10 bottom-8 z-30 items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="w-10 h-10 rounded-full border border-daxul-black/20 bg-daxul-bone/80 hover:bg-daxul-bone text-daxul-black flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-daxul-lime"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-10 h-10 rounded-full border border-daxul-black/20 bg-daxul-bone/80 hover:bg-daxul-bone text-daxul-black flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-daxul-lime"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Pagination Indicators / Dots */}
          {showDots && (
            <div
              className="absolute left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 lg:left-10 bottom-6 sm:bottom-8 z-30 flex items-center gap-2.5"
              role="tablist"
              aria-label="Slide indicators"
            >
              {banners.map((slide, idx) => {
                const isSelected = idx === currentIndex;
                return (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => handleGoTo(idx)}
                    role="tab"
                    aria-selected={isSelected}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-daxul-lime ${
                      isSelected
                        ? "w-8 bg-daxul-lime"
                        : "w-2.5 bg-daxul-black/25 hover:bg-daxul-black/50"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
