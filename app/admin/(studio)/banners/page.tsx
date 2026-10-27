"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  Eye,
  EyeOff,
  Edit,
  Copy,
  ChevronUp,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import type { HeroBannerSlide } from "@/lib/cms/pageTypes";

type BannerTab = "HOMEPAGE_HERO" | "ANNOUNCEMENT" | "PROMO_BAR" | "PAGE_HERO";

export default function AdminBannersPage() {
  const [activeTab, setActiveTab] = useState<BannerTab>("HOMEPAGE_HERO");
  const [banners, setBanners] = useState<HeroBannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewSlide, setPreviewSlide] = useState<HeroBannerSlide | null>(null);
  const [editingBanner, setEditingBanner] = useState<HeroBannerSlide | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState<BannerTab>("HOMEPAGE_HERO");
  const [text, setText] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [body, setBody] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState("");
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState("");
  const [desktopImage, setDesktopImage] = useState("");
  const [mobileImage, setMobileImage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [textMode, setTextMode] = useState<"dark" | "light">("dark");
  const [overlay, setOverlay] = useState(false);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState(0);
  const [visible, setVisible] = useState(true);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Hero Carousel Playback & Navigation Settings
  const [carouselAutoplay, setCarouselAutoplay] = useState(true);
  const [carouselInterval, setCarouselInterval] = useState(5500);
  const [carouselShowArrows, setCarouselShowArrows] = useState(true);
  const [carouselShowDots, setCarouselShowDots] = useState(true);
  const [carouselTransitionStyle, setCarouselTransitionStyle] = useState<"subtle">("subtle");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

  const fetchCarouselSettings = async () => {
    try {
      const res = await fetch("/api/admin/banners/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setCarouselAutoplay(data.settings.autoplay !== false);
          setCarouselInterval(data.settings.interval || 5500);
          setCarouselShowArrows(data.settings.showArrows !== false);
          setCarouselShowDots(data.settings.showDots !== false);
          setCarouselTransitionStyle(data.settings.transitionStyle || "subtle");
        }
      }
    } catch (e) {
      console.error("Failed to load carousel settings", e);
    }
  };

  const handleSaveCarouselSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/banners/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoplay: carouselAutoplay,
          interval: Number(carouselInterval) || 5500,
          showArrows: carouselShowArrows,
          showDots: carouselShowDots,
          transitionStyle: carouselTransitionStyle,
        }),
      });
      if (res.ok) {
        setSettingsFeedback("Settings published live!");
        setTimeout(() => setSettingsFeedback(null), 3000);
      } else {
        alert("Failed to save carousel settings");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving carousel settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const data = await res.json();
      if (data?.banners) setBanners(data.banners);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchCarouselSettings();
  }, []);

  const filteredBanners = banners.filter((b) => {
    if (activeTab === "HOMEPAGE_HERO") {
      return b.placement === "HOMEPAGE_HERO" || b.placement === "HOMEPAGE_TOP";
    }
    return b.placement === activeTab;
  });

  const openCreateModal = () => {
    setEditingBanner(null);
    setName("");
    setPlacement(activeTab);
    setText("");
    setEyebrow("");
    setHeadline("");
    setSubheadline("");
    setBody("");
    setButtonText("");
    setLinkUrl("");
    setSecondaryCtaLabel("");
    setSecondaryCtaUrl("");
    setDesktopImage("");
    setMobileImage("");
    setVideoUrl("");
    setTextAlign("left");
    setTextMode("dark");
    setOverlay(false);
    setStatus("PUBLISHED");
    setStartDate("");
    setEndDate("");
    setPriority(filteredBanners.length > 0 ? (filteredBanners[0].priority || 0) + 5 : 10);
    setVisible(true);
    setModalOpen(true);
  };

  const openEditModal = (b: HeroBannerSlide) => {
    setEditingBanner(b);
    setName(b.name);
    setPlacement((b.placement as BannerTab) || activeTab);
    setText(b.text || "");
    setEyebrow(b.eyebrow || "");
    setHeadline(b.headline || b.text || "");
    setSubheadline(b.subheadline || "");
    setBody(b.body || "");
    setButtonText(b.buttonText || "");
    setLinkUrl(b.linkUrl || "");
    setSecondaryCtaLabel(b.secondaryCtaLabel || "");
    setSecondaryCtaUrl(b.secondaryCtaUrl || "");
    setDesktopImage(b.desktopImage || "");
    setMobileImage(b.mobileImage || "");
    setVideoUrl(b.videoUrl || "");
    setTextAlign(b.textAlign || "left");
    setTextMode(b.textMode || "dark");
    setOverlay(!!b.overlay);
    setStatus(b.status === "DRAFT" ? "DRAFT" : "PUBLISHED");
    setStartDate(b.startDate ? b.startDate.slice(0, 16) : "");
    setEndDate(b.endDate ? b.endDate.slice(0, 16) : "");
    setPriority(b.priority ?? 0);
    setVisible(b.visible ?? true);
    setModalOpen(true);
  };

  const openPreview = (slide: HeroBannerSlide) => {
    setPreviewSlide(slide);
    setPreviewViewport("desktop");
    setPreviewModalOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/banners/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        await fetchBanners();
      }
    } catch (err) {
      console.error("Duplicate error:", err);
    }
  };

  const handleToggleVisible = async (b: HeroBannerSlide) => {
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...b,
          visible: !b.visible,
        }),
      });
      if (res.ok) fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      const res = await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReorder = async (direction: "up" | "down", index: number) => {
    const list = [...filteredBanners];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const bannerIds = list.map((b) => b.id);
    try {
      await fetch("/api/admin/banners/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerIds }),
      });
      fetchBanners();
    } catch (err) {
      console.error("Reorder error:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "desktop" | "mobile") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setter = target === "desktop" ? setUploadingDesktop : setUploadingMobile;
    setter(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("altText", `${name || "Hero"} ${target} visual`);

      const res = await fetch("/api/admin/cms/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Upload error: ${err.error || "Failed to upload"}`);
        return;
      }

      const data = await res.json();
      const assetUrl = data.asset?.url || `/api/uploads/file/${data.asset?.filename}`;

      if (target === "desktop") {
        setDesktopImage(assetUrl);
      } else {
        setMobileImage(assetUrl);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload media asset to R2.");
    } finally {
      setter(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceStatus?: "DRAFT" | "PUBLISHED") => {
    e.preventDefault();
    setSubmitting(true);

    const chosenStatus = forceStatus || status;

    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBanner?.id,
          name,
          placement,
          text: headline || text || name,
          eyebrow: eyebrow || null,
          headline: headline || text || name,
          subheadline: subheadline || null,
          body: body || null,
          buttonText: buttonText || null,
          linkUrl: linkUrl || null,
          secondaryCtaLabel: secondaryCtaLabel || null,
          secondaryCtaUrl: secondaryCtaUrl || null,
          desktopImage: desktopImage || null,
          mobileImage: mobileImage || null,
          videoUrl: videoUrl || null,
          textAlign,
          textMode,
          overlay,
          status: chosenStatus,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          priority: Number(priority) || 0,
          visible,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchBanners();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to save banner"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network error saving banner");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-daxul-black/10 pb-6">
        <div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-wider text-daxul-black flex items-center gap-3">
            <Layers className="w-6 h-6 text-daxul-black" />
            Banners & Hero Carousel
          </h1>
          <p className="text-xs text-[#71717A] mt-1">
            Manage multi-slide homepage hero carousels, announcement bars, and promotional banners.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black font-semibold text-xs tracking-[0.16em] uppercase px-5 py-3 border border-daxul-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "HOMEPAGE_HERO" ? "Add Hero Slide" : "New Banner"}
        </button>
      </div>

      {/* Placement Tabs */}
      <div className="flex border-b border-daxul-black/10 gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("HOMEPAGE_HERO")}
          className={`pb-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "HOMEPAGE_HERO"
              ? "border-daxul-black text-daxul-black font-bold"
              : "border-transparent text-[#71717A] hover:text-daxul-black"
          }`}
        >
          Homepage Hero
          <span className="text-[10px] bg-daxul-black/10 px-1.5 py-0.5 rounded-full">
            {banners.filter((b) => b.placement === "HOMEPAGE_HERO" || b.placement === "HOMEPAGE_TOP").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ANNOUNCEMENT")}
          className={`pb-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ANNOUNCEMENT"
              ? "border-daxul-black text-daxul-black font-bold"
              : "border-transparent text-[#71717A] hover:text-daxul-black"
          }`}
        >
          Announcement Bar
          <span className="text-[10px] bg-daxul-black/10 px-1.5 py-0.5 rounded-full">
            {banners.filter((b) => b.placement === "ANNOUNCEMENT").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("PROMO_BAR")}
          className={`pb-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "PROMO_BAR"
              ? "border-daxul-black text-daxul-black font-bold"
              : "border-transparent text-[#71717A] hover:text-daxul-black"
          }`}
        >
          Promotional Bar
          <span className="text-[10px] bg-daxul-black/10 px-1.5 py-0.5 rounded-full">
            {banners.filter((b) => b.placement === "PROMO_BAR").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("PAGE_HERO")}
          className={`pb-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "PAGE_HERO"
              ? "border-daxul-black text-daxul-black font-bold"
              : "border-transparent text-[#71717A] hover:text-daxul-black"
          }`}
        >
          Page Hero
          <span className="text-[10px] bg-daxul-black/10 px-1.5 py-0.5 rounded-full">
            {banners.filter((b) => b.placement === "PAGE_HERO").length}
          </span>
        </button>
      </div>

      {/* Info notice and Carousel Controls for Homepage Hero */}
      {activeTab === "HOMEPAGE_HERO" && (
        <div className="space-y-4">
          <div className="bg-[#ECE8E0] border border-daxul-black/10 p-4 text-xs text-[#555550] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-bold text-daxul-black block mb-0.5">Homepage Hero Carousel Behavior</span>
              When 2+ active slides exist, the homepage automatically auto-rotates every 5.5s with a smooth 600ms subtle crossfade, hover pause, user interaction pause/resume, and mobile touch swipe. If 1 slide exists, it serves a minimal static hero. If 0 slides exist, it seamlessly falls back to the default hero.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-daxul-lime" />
              <span className="font-mono text-[10px] uppercase font-bold text-daxul-black">
                {filteredBanners.filter((b) => b.visible && b.status === "PUBLISHED").length} Active in Public Carousel
              </span>
            </div>
          </div>

          {/* Carousel Playback & Navigation Settings Box */}
          <div className="bg-white border border-daxul-black/10 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-daxul-black/10">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-daxul-black">
                  Hero Carousel Section Settings
                </h3>
                <p className="text-xs text-[#71717A]">
                  Configure global auto-rotation, interval, navigation arrows, and pagination dots for the homepage hero.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {settingsFeedback && (
                  <span className="font-mono text-xs text-green-700 bg-green-50 px-2.5 py-1 border border-green-200">
                    {settingsFeedback}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveCarouselSettings}
                  disabled={savingSettings}
                  className="bg-daxul-lime text-daxul-black hover:bg-[#bcf82a] font-bold text-xs uppercase tracking-widest px-5 py-2.5 border border-daxul-black transition-colors"
                >
                  {savingSettings ? "Saving..." : "Save Carousel Settings"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1 text-xs">
              {/* Autoplay */}
              <div className="space-y-1.5 p-3 bg-daxul-bone border border-daxul-black/10 flex flex-col justify-between">
                <div>
                  <span className="font-mono uppercase text-[10px] text-[#71717A] block font-semibold">Autoplay</span>
                  <p className="text-[11px] text-[#555550]">Automatically switch slides</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCarouselAutoplay(!carouselAutoplay)}
                  className={`mt-2 py-1.5 px-3 font-mono text-[11px] font-bold uppercase border transition-colors ${
                    carouselAutoplay
                      ? "bg-daxul-lime text-daxul-black border-daxul-black"
                      : "bg-white text-[#71717A] border-daxul-black/20"
                  }`}
                >
                  {carouselAutoplay ? "ENABLED (ON)" : "DISABLED (OFF)"}
                </button>
              </div>

              {/* Interval */}
              <div className="space-y-1.5 p-3 bg-daxul-bone border border-daxul-black/10 flex flex-col justify-between">
                <div>
                  <span className="font-mono uppercase text-[10px] text-[#71717A] block font-semibold">Interval (ms)</span>
                  <p className="text-[11px] text-[#555550]">5000–6000ms recommended</p>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <input
                    type="number"
                    step={500}
                    min={1000}
                    max={60000}
                    value={carouselInterval}
                    onChange={(e) => setCarouselInterval(parseInt(e.target.value) || 5500)}
                    className="w-full bg-white border border-daxul-black/20 px-2.5 py-1.5 font-mono text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                  />
                  <span className="font-mono text-[10px] text-[#71717A]">ms</span>
                </div>
              </div>

              {/* Show Arrows */}
              <div className="space-y-1.5 p-3 bg-daxul-bone border border-daxul-black/10 flex flex-col justify-between">
                <div>
                  <span className="font-mono uppercase text-[10px] text-[#71717A] block font-semibold">Show Arrows</span>
                  <p className="text-[11px] text-[#555550]">Prev / Next arrow buttons</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCarouselShowArrows(!carouselShowArrows)}
                  className={`mt-2 py-1.5 px-3 font-mono text-[11px] font-bold uppercase border transition-colors ${
                    carouselShowArrows
                      ? "bg-daxul-lime text-daxul-black border-daxul-black"
                      : "bg-white text-[#71717A] border-daxul-black/20"
                  }`}
                >
                  {carouselShowArrows ? "VISIBLE" : "HIDDEN"}
                </button>
              </div>

              {/* Show Dots */}
              <div className="space-y-1.5 p-3 bg-daxul-bone border border-daxul-black/10 flex flex-col justify-between">
                <div>
                  <span className="font-mono uppercase text-[10px] text-[#71717A] block font-semibold">Show Dots</span>
                  <p className="text-[11px] text-[#555550]">Slide indicators at bottom</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCarouselShowDots(!carouselShowDots)}
                  className={`mt-2 py-1.5 px-3 font-mono text-[11px] font-bold uppercase border transition-colors ${
                    carouselShowDots
                      ? "bg-daxul-lime text-daxul-black border-daxul-black"
                      : "bg-white text-[#71717A] border-daxul-black/20"
                  }`}
                >
                  {carouselShowDots ? "VISIBLE" : "HIDDEN"}
                </button>
              </div>

              {/* Transition Style */}
              <div className="space-y-1.5 p-3 bg-daxul-bone border border-daxul-black/10 flex flex-col justify-between">
                <div>
                  <span className="font-mono uppercase text-[10px] text-[#71717A] block font-semibold">Transition Style</span>
                  <p className="text-[11px] text-[#555550]">Subtle 600ms crossfade</p>
                </div>
                <div className="mt-2 py-1.5 px-2.5 bg-white border border-daxul-black/20 font-mono text-[10px] text-daxul-black flex items-center justify-between">
                  <span>SUBTLE (600ms)</span>
                  <span className="text-[9px] bg-daxul-lime px-1.5 py-0.5 font-bold uppercase text-daxul-black">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banners List */}
      {loading ? (
        <div className="p-12 text-center font-mono text-xs text-[#71717A] uppercase tracking-wider">
          Loading slides & banners...
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="p-12 text-center bg-[#ECE8E0] border border-daxul-black/10 space-y-4">
          <p className="font-mono text-xs text-[#71717A] uppercase tracking-wider">
            No banners configured in this category.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-daxul-black text-daxul-bone hover:bg-daxul-graphite font-semibold text-xs tracking-widest uppercase px-5 py-2.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Slide
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBanners.map((b, index) => {
            const isPublished = b.status === "PUBLISHED";
            const isDraft = b.status === "DRAFT";
            const isVisible = b.visible;

            return (
              <div
                key={b.id}
                className="bg-white border border-daxul-black/10 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-daxul-black/30"
              >
                {/* Left: Reorder arrows + Thumbnail */}
                <div className="flex items-center gap-4">
                  {/* Up / Down Reorder */}
                  {activeTab === "HOMEPAGE_HERO" && (
                    <div className="flex flex-col gap-1 text-[#71717A]">
                      <button
                        type="button"
                        onClick={() => handleReorder("up", index)}
                        disabled={index === 0}
                        className="p-1 hover:text-daxul-black disabled:opacity-20 transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder("down", index)}
                        disabled={index === filteredBanners.length - 1}
                        className="p-1 hover:text-daxul-black disabled:opacity-20 transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Visual Preview Thumbnail */}
                  <div className="relative w-24 h-16 sm:w-32 sm:h-20 bg-[#ECE8E0] border border-daxul-black/10 overflow-hidden shrink-0">
                    {b.desktopImage ? (
                      <Image
                        src={b.desktopImage}
                        alt={b.name}
                        fill
                        className="object-cover object-center"
                        sizes="128px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-[#71717A]">
                        NO IMAGE
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-daxul-black uppercase">
                        {b.name}
                      </span>

                      {/* Status Badges */}
                      {isPublished && isVisible ? (
                        <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-daxul-lime text-daxul-black font-bold">
                          PUBLISHED
                        </span>
                      ) : isDraft ? (
                        <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-amber-200 text-amber-900 font-bold">
                          DRAFT
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-gray-200 text-gray-700 font-bold">
                          HIDDEN
                        </span>
                      )}

                      {b.startDate && (
                        <span className="font-mono text-[9px] text-[#71717A] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(b.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {b.eyebrow && (
                      <p className="font-mono text-[10px] text-[#71717A] uppercase tracking-wider">
                        {b.eyebrow}
                      </p>
                    )}

                    <h2 className="text-xs font-semibold text-daxul-black uppercase line-clamp-1">
                      {b.headline || b.text}
                    </h2>

                    {b.subheadline && (
                      <p className="text-xs text-[#71717A] line-clamp-1">{b.subheadline}</p>
                    )}

                    {b.buttonText && (
                      <p className="text-[11px] font-mono text-daxul-black">
                        CTA: <span className="font-bold">{b.buttonText}</span> → {b.linkUrl}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => openPreview(b)}
                    className="p-2 border border-daxul-black/10 hover:border-daxul-black text-daxul-black transition-colors"
                    title="Live Device Preview"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleVisible(b)}
                    className="p-2 border border-daxul-black/10 hover:border-daxul-black text-daxul-black transition-colors"
                    title={b.visible ? "Hide Banner" : "Show Banner"}
                  >
                    {b.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(b.id)}
                    className="p-2 border border-daxul-black/10 hover:border-daxul-black text-daxul-black transition-colors"
                    title="Duplicate Slide"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(b)}
                    className="p-2 border border-daxul-black/10 hover:border-daxul-black text-daxul-black transition-colors"
                    title="Edit Slide"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="p-2 border border-red-200 hover:border-red-500 text-red-500 transition-colors"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Slide Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-daxul-black/20 w-full max-w-3xl my-8 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-daxul-black/10 pb-4">
              <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-daxul-black">
                {editingBanner ? "Edit Slide / Banner" : "New Slide / Banner"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-xs font-mono uppercase text-[#71717A] hover:text-daxul-black"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
              {/* Placement & Internal Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                    Internal Slide Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hero Slide 1 — Studio Lamp"
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black font-sans"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                    Category Placement
                  </label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as BannerTab)}
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black font-sans"
                  >
                    <option value="HOMEPAGE_HERO">Homepage Hero Carousel</option>
                    <option value="ANNOUNCEMENT">Announcement Bar (Header Top)</option>
                    <option value="PROMO_BAR">Promotional Bar</option>
                    <option value="PAGE_HERO">General Page Hero</option>
                  </select>
                </div>
              </div>

              {/* Typography / Copy */}
              <div className="border-t border-daxul-black/10 pt-4 space-y-4">
                <h3 className="font-mono text-xs font-bold uppercase text-daxul-black">
                  Slide Content & Copy
                </h3>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                    Eyebrow / Badge Text
                  </label>
                  <input
                    type="text"
                    value={eyebrow}
                    onChange={(e) => setEyebrow(e.target.value)}
                    placeholder="e.g. DAXUL LABS / STUDIO"
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                    Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. OBJECTS MADE DIFFERENTLY."
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                    Subheadline
                  </label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="e.g. Sculptural lighting, custom lithophanes, and tactile devotional altars."
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                    Body Copy (Optional Details)
                  </label>
                  <textarea
                    rows={2}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Supporting details on materiality or craftsmanship..."
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black leading-relaxed"
                  />
                </div>
              </div>

              {/* CTAs */}
              <div className="border-t border-daxul-black/10 pt-4 space-y-4">
                <h3 className="font-mono text-xs font-bold uppercase text-daxul-black">
                  Call to Action Buttons
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Primary CTA Label
                    </label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="e.g. SHOP OBJECTS"
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Primary CTA Link
                    </label>
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="e.g. /shop"
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                    />
                    <div className="flex gap-2 mt-1">
                      {["/shop", "/collections", "/customize", "/about"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setLinkUrl(u)}
                          className="font-mono text-[9px] text-[#71717A] hover:text-daxul-black underline"
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Secondary CTA Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={secondaryCtaLabel}
                      onChange={(e) => setSecondaryCtaLabel(e.target.value)}
                      placeholder="e.g. EXPLORE STUDIO"
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Secondary CTA Link
                    </label>
                    <input
                      type="text"
                      value={secondaryCtaUrl}
                      onChange={(e) => setSecondaryCtaUrl(e.target.value)}
                      placeholder="e.g. /about"
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                    />
                  </div>
                </div>
              </div>

              {/* Media (Desktop & Mobile) */}
              <div className="border-t border-daxul-black/10 pt-4 space-y-4">
                <h3 className="font-mono text-xs font-bold uppercase text-daxul-black">
                  Banner Imagery (R2 / MediaAsset)
                </h3>

                {/* Desktop Image */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                      Desktop Image URL (approx 1440 × 660px)
                    </label>
                    <label className="font-mono text-[10px] uppercase font-bold text-daxul-black hover:text-[#71717A] cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {uploadingDesktop ? "Uploading..." : "Upload to R2"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "desktop")}
                        disabled={uploadingDesktop}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={desktopImage}
                    onChange={(e) => setDesktopImage(e.target.value)}
                    placeholder="https://... or /images/..."
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                  />
                </div>

                {/* Mobile Image */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                      Dedicated Mobile Image URL (approx 430 × 580px, optional)
                    </label>
                    <label className="font-mono text-[10px] uppercase font-bold text-daxul-black hover:text-[#71717A] cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {uploadingMobile ? "Uploading..." : "Upload to R2"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "mobile")}
                        disabled={uploadingMobile}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={mobileImage}
                    onChange={(e) => setMobileImage(e.target.value)}
                    placeholder="If blank, uses desktop image on mobile"
                    className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                  />
                </div>
              </div>

              {/* Design Controls & Layout */}
              <div className="border-t border-daxul-black/10 pt-4 space-y-4">
                <h3 className="font-mono text-xs font-bold uppercase text-daxul-black">
                  Design & Alignment
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Text Alignment
                    </label>
                    <select
                      value={textAlign}
                      onChange={(e) => setTextAlign(e.target.value as any)}
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Center Aligned</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Text Color Mode
                    </label>
                    <select
                      value={textMode}
                      onChange={(e) => setTextMode(e.target.value as any)}
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-3 text-xs text-daxul-black focus:outline-none focus:border-daxul-black"
                    >
                      <option value="dark">Dark Text (for Bone / Light BG)</option>
                      <option value="light">Light Text (for Dark Imagery)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Subtle Tint Overlay
                    </label>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overlay}
                        onChange={(e) => setOverlay(e.target.checked)}
                        className="w-4 h-4 accent-daxul-lime"
                      />
                      <span className="text-xs text-daxul-black">Dark contrast overlay</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Scheduling & Priority */}
              <div className="border-t border-daxul-black/10 pt-4 space-y-4">
                <h3 className="font-mono text-xs font-bold uppercase text-daxul-black">
                  Scheduling & Display Priority
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Start Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-2.5 text-xs text-daxul-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-2.5 text-xs text-daxul-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                      Order / Priority (Higher = First)
                    </label>
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full bg-[#ECE8E0] border border-daxul-black/10 p-2.5 text-xs text-daxul-black focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="border-t border-daxul-black/10 pt-6 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="font-mono text-xs uppercase px-5 py-3 border border-daxul-black/20 text-[#71717A] hover:text-daxul-black transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={(e) => handleSubmit(e, "DRAFT")}
                    className="font-mono text-xs uppercase tracking-wider px-5 py-3 bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold transition-colors disabled:opacity-50"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    onClick={() => setStatus("PUBLISHED")}
                    className="font-mono text-xs uppercase tracking-wider px-6 py-3 bg-daxul-lime text-daxul-black hover:bg-[#bcf82a] font-bold border border-daxul-black transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save & Publish"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Device Preview Modal */}
      {previewModalOpen && previewSlide && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-daxul-bone border border-daxul-black/20 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Preview Toolbar */}
            <div className="bg-daxul-black text-daxul-bone px-6 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-daxul-lime">
                  Live Preview:
                </span>
                <span className="font-mono text-xs text-white/80 uppercase">
                  {previewSlide.headline || previewSlide.name}
                </span>
              </div>

              {/* Viewport Switcher */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-md">
                <button
                  type="button"
                  onClick={() => setPreviewViewport("desktop")}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 rounded transition-colors ${
                    previewViewport === "desktop"
                      ? "bg-daxul-lime text-daxul-black font-bold"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop (1440)
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewViewport("tablet")}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 rounded transition-colors ${
                    previewViewport === "tablet"
                      ? "bg-daxul-lime text-daxul-black font-bold"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  Tablet (768)
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewViewport("mobile")}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 rounded transition-colors ${
                    previewViewport === "mobile"
                      ? "bg-daxul-lime text-daxul-black font-bold"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile (390)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="font-mono text-xs uppercase text-white/70 hover:text-white"
              >
                Close ✕
              </button>
            </div>

            {/* Preview Frame Container */}
            <div className="flex-1 bg-[#DED9CF] p-4 sm:p-8 overflow-auto flex justify-center items-start">
              <div
                className="bg-daxul-bone border border-daxul-black/20 shadow-xl overflow-hidden transition-all duration-300 relative"
                style={{
                  width:
                    previewViewport === "desktop"
                      ? "100%"
                      : previewViewport === "tablet"
                      ? "768px"
                      : "390px",
                  maxWidth: "100%",
                }}
              >
                {/* Banner Slide Render in Preview */}
                <div className="relative w-full min-h-[500px] flex items-center overflow-hidden">
                  {/* Background Image */}
                  <div className="absolute inset-0 w-full h-full">
                    <Image
                      src={
                        previewViewport === "mobile" && previewSlide.mobileImage
                          ? previewSlide.mobileImage
                          : previewSlide.desktopImage || "/images/hero_shadow_lamp.jpg"
                      }
                      alt={previewSlide.headline || "Slide Preview"}
                      fill
                      className="object-cover object-center"
                    />
                    {previewSlide.overlay ? (
                      <div className="absolute inset-0 bg-daxul-black/40" />
                    ) : previewSlide.textMode === "light" ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-daxul-black/80 via-daxul-black/50 to-transparent w-full" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-daxul-bone/95 via-daxul-bone/75 to-transparent w-full" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="relative z-10 p-6 sm:p-12 max-w-xl space-y-4">
                    {previewSlide.eyebrow && (
                      <span
                        className={`font-mono text-xs uppercase tracking-[0.25em] font-semibold block ${
                          previewSlide.textMode === "light" ? "text-daxul-lime" : "text-[#71717A]"
                        }`}
                      >
                        {previewSlide.eyebrow}
                      </span>
                    )}

                    <h1
                      className={`text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight uppercase leading-[1.1] ${
                        previewSlide.textMode === "light" ? "text-daxul-bone" : "text-daxul-black"
                      }`}
                    >
                      {previewSlide.headline || previewSlide.text}
                    </h1>

                    {(previewSlide.subheadline || previewSlide.body) && (
                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${
                          previewSlide.textMode === "light"
                            ? "text-daxul-bone/85"
                            : "text-[#555550]"
                        }`}
                      >
                        {previewSlide.subheadline || previewSlide.body}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {previewSlide.buttonText && (
                        <div className="bg-daxul-lime text-daxul-black font-semibold text-xs tracking-widest uppercase px-6 py-3 border border-daxul-black">
                          {previewSlide.buttonText}
                        </div>
                      )}

                      {previewSlide.secondaryCtaLabel && (
                        <div
                          className={`font-semibold text-xs tracking-widest uppercase px-6 py-3 border ${
                            previewSlide.textMode === "light"
                              ? "text-daxul-bone border-white/40"
                              : "text-daxul-black border-daxul-black/40"
                          }`}
                        >
                          {previewSlide.secondaryCtaLabel}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
