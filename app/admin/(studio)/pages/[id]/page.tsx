"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  Save,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  History,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { PageSectionType } from "@/lib/cms/pageTypes";
import CmsSectionRenderer from "@/components/cms/CmsSectionRenderer";

const SECTION_TYPE_OPTIONS: { type: PageSectionType; label: string }[] = [
  { type: "HERO_CAROUSEL", label: "Hero Carousel (Multi-Banner)" },
  { type: "HERO", label: "Hero Banner" },
  { type: "BANNER", label: "Announcement / Promo Banner" },
  { type: "TEXT", label: "Rich Text / Manifesto" },
  { type: "IMAGE_TEXT", label: "Image + Text Story" },
  { type: "PRODUCT_GRID", label: "Product Grid (Live DB)" },
  { type: "COLLECTION_GRID", label: "Collection Grid (Live DB)" },
  { type: "FEATURED_PRODUCT", label: "Featured Product (Live DB)" },
  { type: "GALLERY", label: "Image / Video Gallery" },
  { type: "VIDEO", label: "Video Showcase" },
  { type: "CTA", label: "Call To Action" },
  { type: "STATS", label: "Stats & Benchmarks" },
  { type: "TABS", label: "Interactive Tabs" },
  { type: "FAQ", label: "FAQ Accordion" },
  { type: "TESTIMONIALS", label: "Testimonials" },
  { type: "CUSTOMIZATION", label: "Customization Steps" },
  { type: "BRAND_STATEMENT", label: "Brand Statement" },
  { type: "INSTAGRAM", label: "Instagram Feed" },
  { type: "NEWSLETTER", label: "Newsletter Capture" },
  { type: "CONTACT", label: "Contact & Form" },
  { type: "SPACER", label: "Spacer & Divider" },
];

export default function PageBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pageId } = use(params);

  const [page, setPage] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "seo" | "history">("sections");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Draft editor state for selected section
  const [editingContent, setEditingContent] = useState<any>({});
  const [editingName, setEditingName] = useState("");

  // Live products & collections for preview
  const [previewProducts, setPreviewProducts] = useState<any[]>([]);
  const [previewCollections, setPreviewCollections] = useState<any[]>([]);

  const fetchPage = async () => {
    try {
      const res = await fetch(`/api/admin/cms/pages/${pageId}`);
      const data = await res.json();
      if (data.page) {
        setPage(data.page);
        const secs = data.page.sections || [];
        setSections(secs);
        if (secs.length > 0 && !selectedSectionId) {
          setSelectedSectionId(secs[0].id);
          setEditingContent(secs[0].draftContent || {});
          setEditingName(secs[0].name || "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();

    // Fetch catalog products and collections for preview
    fetch("/api/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.products) setPreviewProducts(data.products);
        if (data?.collections) setPreviewCollections(data.collections);
      })
      .catch(() => {});
  }, [pageId]);

  const selectSection = (sec: any) => {
    setSelectedSectionId(sec.id);
    setEditingContent(sec.draftContent || {});
    setEditingName(sec.name || "");
    setActiveTab("sections");
  };

  const handleAddSection = async (type: PageSectionType) => {
    try {
      const res = await fetch("/api/admin/cms/page-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, type }),
      });
      const data = await res.json();
      if (data.section) {
        const next = [...sections, data.section];
        setSections(next);
        selectSection(data.section);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateSection = async (secId: string) => {
    try {
      const res = await fetch(`/api/admin/cms/page-sections/${secId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (data.section) {
        fetchPage();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSection = async (secId: string) => {
    if (!confirm("Delete this section?")) return;
    try {
      await fetch(`/api/admin/cms/page-sections/${secId}`, { method: "DELETE" });
      const remaining = sections.filter((s) => s.id !== secId);
      setSections(remaining);
      if (selectedSectionId === secId) {
        if (remaining.length > 0) selectSection(remaining[0]);
        else setSelectedSectionId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVisible = async (sec: any) => {
    const nextVis = !sec.visible;
    try {
      await fetch(`/api/admin/cms/page-sections/${sec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: nextVis }),
      });
      setSections(sections.map((s) => (s.id === sec.id ? { ...s, visible: nextVis } : s)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveSection = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setSections(reordered);

    try {
      await fetch("/api/admin/cms/page-sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, sectionIds: reordered.map((s) => s.id) }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedSectionId) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/cms/page-sections/${selectedSectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName,
          draftContent: editingContent,
        }),
      });
      const data = await res.json();
      if (data.section) {
        setSections(
          sections.map((s) => (s.id === selectedSectionId ? { ...s, draftContent: editingContent, name: editingName } : s))
        );
        setFeedback("Draft saved.");
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setFeedback("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevertSection = async () => {
    if (!selectedSectionId || !confirm("Revert this section to its last published state?")) return;
    try {
      const res = await fetch(`/api/admin/cms/page-sections/${selectedSectionId}/revert`, { method: "POST" });
      const data = await res.json();
      if (data.section) {
        setEditingContent(data.section.draftContent);
        setSections(
          sections.map((s) => (s.id === selectedSectionId ? data.section : s))
        );
        setFeedback("Reverted to published.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishPage = async () => {
    setPublishing(true);
    try {
      // First save current draft if any
      if (selectedSectionId) {
        await fetch(`/api/admin/cms/page-sections/${selectedSectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editingName, draftContent: editingContent }),
        });
      }

      const res = await fetch(`/api/admin/cms/pages/${pageId}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.page) {
        setPage(data.page);
        setSections(data.page.sections || []);
        setFeedback("Page published live!");
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  const handleSavePageMeta = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cms/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.title,
          slug: page.slug,
          status: page.status,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          ogImage: page.ogImage,
          canonicalUrl: page.canonicalUrl,
          noIndex: page.noIndex,
        }),
      });
      const data = await res.json();
      if (data.page) {
        setPage(data.page);
        setFeedback("Page settings saved.");
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const currentSection = sections.find((s) => s.id === selectedSectionId);

  // Update draft content field helper
  const updateField = (field: string, val: any) => {
    const updated = { ...editingContent, [field]: val };
    setEditingContent(updated);
    // Realtime update in sections list for live preview!
    setSections(
      sections.map((s) => (s.id === selectedSectionId ? { ...s, draftContent: updated } : s))
    );
  };

  if (loading || !page) {
    return (
      <div className="p-12 text-center font-mono text-sm text-[#B9B9B4]">
        Loading page builder...
      </div>
    );
  }

  const liveUrl = page.slug === "home" ? "/" : `/${page.slug}`;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-6 bg-[#0B0B0C] text-white overflow-hidden">
      
      {/* Top Builder Bar */}
      <div className="h-14 border-b border-[#242426] bg-[#141416] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages"
            className="p-1.5 hover:bg-[#242426] text-[#B9B9B4] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide">{page.title}</span>
              <span className="font-mono text-xs text-[#71717A]">/{page.slug}</span>
              <span
                className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${
                  page.status === "PUBLISHED"
                    ? "bg-green-500/10 text-green-400 border border-green-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}
              >
                {page.status}
              </span>
            </div>
          </div>
        </div>

        {/* Viewport switchers */}
        <div className="hidden sm:flex items-center bg-[#1C1C1E] border border-[#242426] p-0.5">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1.5 ${viewport === "desktop" ? "bg-daxul-lime text-daxul-black" : "text-[#B9B9B4] hover:text-white"}`}
            title="Desktop 1440px"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`p-1.5 ${viewport === "tablet" ? "bg-daxul-lime text-daxul-black" : "text-[#B9B9B4] hover:text-white"}`}
            title="Tablet 768px"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1.5 ${viewport === "mobile" ? "bg-daxul-lime text-daxul-black" : "text-[#B9B9B4] hover:text-white"}`}
            title="Mobile 390px"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {feedback && (
            <span className="font-mono text-xs text-daxul-lime animate-pulse hidden md:inline-block">
              {feedback}
            </span>
          )}

          <a
            href={`${liveUrl}?preview=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1E] border border-[#242426] text-xs font-mono text-[#B9B9B4] hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </a>

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#242426] text-white hover:bg-[#323236] text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={handlePublishPage}
            disabled={publishing}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-daxul-lime text-daxul-black hover:bg-[#b8eb2f] text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{publishing ? "Publishing..." : "Publish"}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: Section List & Page Tabs (280px) */}
        <div className="w-72 bg-[#141416] border-r border-[#242426] flex flex-col shrink-0">
          <div className="flex border-b border-[#242426] bg-[#101012] text-xs font-mono">
            <button
              onClick={() => setActiveTab("sections")}
              className={`flex-1 py-2.5 uppercase tracking-wider ${
                activeTab === "sections" ? "border-b-2 border-daxul-lime text-white font-bold" : "text-[#B9B9B4] hover:text-white"
              }`}
            >
              Sections ({sections.length})
            </button>
            <button
              onClick={() => setActiveTab("seo")}
              className={`flex-1 py-2.5 uppercase tracking-wider ${
                activeTab === "seo" ? "border-b-2 border-daxul-lime text-white font-bold" : "text-[#B9B9B4] hover:text-white"
              }`}
            >
              Page & SEO
            </button>
          </div>

          {activeTab === "sections" ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Add Section dropdown */}
              <div className="relative mb-3">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddSection(e.target.value as PageSectionType);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-[#1C1C1E] border border-[#242426] text-xs text-white p-2.5 focus:outline-none focus:border-daxul-lime font-mono"
                >
                  <option value="" disabled>
                    + Add New Section...
                  </option>
                  {SECTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sections list */}
              {sections.map((sec, idx) => {
                const isSelected = sec.id === selectedSectionId;
                return (
                  <div
                    key={sec.id}
                    onClick={() => selectSection(sec)}
                    className={`p-2.5 border transition-all cursor-pointer group flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[#1C1C1E] border-daxul-lime text-white"
                        : "bg-[#101012] border-[#242426] text-[#B9B9B4] hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-[#71717A]">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate text-white">
                          {sec.name || sec.type}
                        </div>
                        <div className="font-mono text-[9px] text-[#71717A] uppercase">
                          {sec.type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="p-1 hover:text-white disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(idx, "down");
                        }}
                        disabled={idx === sections.length - 1}
                        className="p-1 hover:text-white disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisible(sec);
                        }}
                        className="p-1 hover:text-white"
                        title={sec.visible ? "Hide" : "Show"}
                      >
                        {sec.visible ? <Eye className="w-3 h-3 text-green-400" /> : <EyeOff className="w-3 h-3 text-neutral-500" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSection(sec.id);
                        }}
                        className="p-1 hover:text-white"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(sec.id);
                        }}
                        className="p-1 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SEO & General Settings Panel */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={page.title}
                  onChange={(e) => setPage({ ...page, title: e.target.value })}
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                  Slug Route
                </label>
                <input
                  type="text"
                  disabled={page.isSystem}
                  value={page.slug}
                  onChange={(e) => setPage({ ...page, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\/-]/g, "") })}
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={page.seoTitle || ""}
                  onChange={(e) => setPage({ ...page, seoTitle: e.target.value })}
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={page.seoDescription || ""}
                  onChange={(e) => setPage({ ...page, seoDescription: e.target.value })}
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                  OG Social Image URL
                </label>
                <input
                  type="text"
                  value={page.ogImage || ""}
                  onChange={(e) => setPage({ ...page, ogImage: e.target.value })}
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="noIndexToggle"
                  checked={page.noIndex || false}
                  onChange={(e) => setPage({ ...page, noIndex: e.target.checked })}
                  className="rounded bg-[#1C1C1E]"
                />
                <label htmlFor="noIndexToggle" className="font-mono text-xs text-[#B9B9B4]">
                  Noindex (hide from search engines)
                </label>
              </div>

              <button
                onClick={handleSavePageMeta}
                className="w-full mt-4 bg-daxul-lime text-daxul-black font-semibold uppercase py-2 hover:bg-[#b8eb2f]"
              >
                Save Page Settings
              </button>
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Live Interactive Responsive Preview Frame */}
        <div className="flex-1 bg-[#050505] overflow-auto flex items-start justify-center p-4 sm:p-6">
          <div
            style={{
              width:
                viewport === "mobile"
                  ? "390px"
                  : viewport === "tablet"
                  ? "768px"
                  : "100%",
              maxWidth: "1440px",
            }}
            className="bg-daxul-bone text-daxul-black shadow-2xl transition-all duration-300 min-h-[800px] border border-white/10 overflow-hidden"
          >
            {sections.length === 0 ? (
              <div className="p-16 text-center text-[#71717A] space-y-4">
                <p className="font-mono text-xs uppercase tracking-widest">
                  This page has no sections yet.
                </p>
                <p className="text-sm">
                  Click "+ Add New Section" in the left panel to begin assembling your layout.
                </p>
              </div>
            ) : (
              sections.map((sec) => (
                <div
                  key={sec.id}
                  onClick={() => selectSection(sec)}
                  className={`relative group cursor-pointer transition-all ${
                    sec.id === selectedSectionId ? "ring-2 ring-daxul-lime" : ""
                  }`}
                >
                  <CmsSectionRenderer
                    section={sec}
                    useDraft={true}
                    products={previewProducts}
                    collections={previewCollections}
                  />
                  {sec.id === selectedSectionId && (
                    <div className="absolute top-2 right-2 bg-daxul-lime text-daxul-black font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 font-bold shadow pointer-events-none">
                      Active Editor
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Section Editor Panel (340px) */}
        <div className="w-80 bg-[#141416] border-l border-[#242426] flex flex-col shrink-0">
          {currentSection ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-[#242426] flex items-center justify-between bg-[#101012]">
                <div>
                  <h3 className="font-bold text-sm text-white">{currentSection.name || currentSection.type}</h3>
                  <span className="font-mono text-[10px] text-daxul-lime uppercase">
                    {currentSection.type}
                  </span>
                </div>
                <button
                  onClick={handleRevertSection}
                  className="p-1.5 text-[#B9B9B4] hover:text-white"
                  title="Revert to Published"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dynamic Field Inputs based on section type */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    Section Display Name
                  </label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                {/* Common Heading & Eyebrow */}
                {editingContent.eyebrow !== undefined && (
                  <div>
                    <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                      Eyebrow Tag
                    </label>
                    <input
                      type="text"
                      value={editingContent.eyebrow || ""}
                      onChange={(e) => updateField("eyebrow", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {editingContent.heading !== undefined && (
                  <div>
                    <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                      Heading Title
                    </label>
                    <input
                      type="text"
                      value={editingContent.heading || ""}
                      onChange={(e) => updateField("heading", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {editingContent.subheading !== undefined && (
                  <div>
                    <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                      Subheading
                    </label>
                    <input
                      type="text"
                      value={editingContent.subheading || ""}
                      onChange={(e) => updateField("subheading", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {editingContent.body !== undefined && (
                  <div>
                    <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                      Body (Markdown supported)
                    </label>
                    <textarea
                      rows={4}
                      value={editingContent.body || ""}
                      onChange={(e) => updateField("body", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {editingContent.description !== undefined && (
                  <div>
                    <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                      Description (Markdown supported)
                    </label>
                    <textarea
                      rows={4}
                      value={editingContent.description || ""}
                      onChange={(e) => updateField("description", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Media fields */}
                {(editingContent.desktopImage !== undefined || editingContent.image !== undefined) && (
                  <div>
                    <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                      Image URL (Media Asset / R2)
                    </label>
                    <input
                      type="text"
                      value={editingContent.desktopImage ?? editingContent.image ?? ""}
                      onChange={(e) => {
                        if (editingContent.desktopImage !== undefined) updateField("desktopImage", e.target.value);
                        if (editingContent.image !== undefined) updateField("image", e.target.value);
                      }}
                      placeholder="/images/... or R2 storage URL"
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {editingContent.videoUrl !== undefined && (
                  <div>
                    <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                      Video URL
                    </label>
                    <input
                      type="text"
                      value={editingContent.videoUrl || ""}
                      onChange={(e) => updateField("videoUrl", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* CTAs */}
                {editingContent.cta1Label !== undefined && (
                  <div className="space-y-2 pt-2 border-t border-[#242426]">
                    <label className="block font-mono uppercase text-[#B9B9B4]">Primary CTA</label>
                    <input
                      type="text"
                      placeholder="Label (e.g. SHOP NOW)"
                      value={editingContent.cta1Label || ""}
                      onChange={(e) => updateField("cta1Label", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none mb-1"
                    />
                    <input
                      type="text"
                      placeholder="Destination URL (e.g. /shop)"
                      value={editingContent.cta1Link || ""}
                      onChange={(e) => updateField("cta1Link", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {editingContent.ctaLabel !== undefined && (
                  <div className="space-y-2 pt-2 border-t border-[#242426]">
                    <label className="block font-mono uppercase text-[#B9B9B4]">Call To Action</label>
                    <input
                      type="text"
                      placeholder="Label (e.g. EXPLORE)"
                      value={editingContent.ctaLabel || ""}
                      onChange={(e) => updateField("ctaLabel", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none mb-1"
                    />
                    <input
                      type="text"
                      placeholder="Destination URL"
                      value={editingContent.ctaLink || ""}
                      onChange={(e) => updateField("ctaLink", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Banner Button */}
                {editingContent.buttonText !== undefined && (
                  <div className="space-y-2 pt-2 border-t border-[#242426]">
                    <label className="block font-mono uppercase text-[#B9B9B4]">Button</label>
                    <input
                      type="text"
                      placeholder="Button Text"
                      value={editingContent.buttonText || ""}
                      onChange={(e) => updateField("buttonText", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none mb-1"
                    />
                    <input
                      type="text"
                      placeholder="Link URL"
                      value={editingContent.linkUrl || ""}
                      onChange={(e) => updateField("linkUrl", e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Product Grid Limit & Sort */}
                {editingContent.limit !== undefined && (
                  <div className="space-y-2 pt-2 border-t border-[#242426]">
                    <label className="block font-mono uppercase text-[#B9B9B4]">Grid Settings</label>
                    <div>
                      <span className="text-[10px] text-[#71717A] block mb-1">Product Limit</span>
                      <input
                        type="number"
                        value={editingContent.limit || 4}
                        onChange={(e) => updateField("limit", parseInt(e.target.value) || 4)}
                        className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Spacer heights */}
                {editingContent.heightDesktop !== undefined && (
                  <div className="space-y-2 pt-2 border-t border-[#242426]">
                    <label className="block font-mono uppercase text-[#B9B9B4]">Spacer Dimensions</label>
                    <div>
                      <span className="text-[10px] text-[#71717A] block mb-1">Desktop Height (px)</span>
                      <input
                        type="number"
                        value={editingContent.heightDesktop || 64}
                        onChange={(e) => updateField("heightDesktop", parseInt(e.target.value) || 64)}
                        className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Hero Carousel Settings */}
                {(currentSection.type === "HERO_CAROUSEL" || currentSection.type === "HERO") && (
                  <div className="space-y-3 pt-3 border-t border-[#242426]">
                    <label className="block font-mono uppercase text-daxul-lime font-bold">
                      Carousel Playback Controls
                    </label>

                    <div className="flex items-center justify-between">
                      <span className="text-[#B9B9B4]">Autoplay</span>
                      <button
                        type="button"
                        onClick={() => updateField("autoplay", editingContent.autoplay === false ? true : false)}
                        className={`px-3 py-1 font-mono text-[10px] uppercase font-bold transition-colors ${
                          editingContent.autoplay !== false
                            ? "bg-daxul-lime text-daxul-black"
                            : "bg-[#242426] text-[#71717A]"
                        }`}
                      >
                        {editingContent.autoplay !== false ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#B9B9B4]">Interval (ms)</span>
                        <span className="font-mono text-[10px] text-[#71717A]">5000-6000ms</span>
                      </div>
                      <input
                        type="number"
                        step={500}
                        min={1000}
                        max={60000}
                        value={editingContent.interval ?? 5500}
                        onChange={(e) => updateField("interval", parseInt(e.target.value) || 5500)}
                        className="w-full bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#B9B9B4]">Show Arrows</span>
                      <button
                        type="button"
                        onClick={() => updateField("showArrows", editingContent.showArrows === false ? true : false)}
                        className={`px-3 py-1 font-mono text-[10px] uppercase font-bold transition-colors ${
                          editingContent.showArrows !== false
                            ? "bg-daxul-lime text-daxul-black"
                            : "bg-[#242426] text-[#71717A]"
                        }`}
                      >
                        {editingContent.showArrows !== false ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#B9B9B4]">Show Dots</span>
                      <button
                        type="button"
                        onClick={() => updateField("showDots", editingContent.showDots === false ? true : false)}
                        className={`px-3 py-1 font-mono text-[10px] uppercase font-bold transition-colors ${
                          editingContent.showDots !== false
                            ? "bg-daxul-lime text-daxul-black"
                            : "bg-[#242426] text-[#71717A]"
                        }`}
                      >
                        {editingContent.showDots !== false ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div>
                      <span className="text-[#B9B9B4] block mb-1">Transition Style</span>
                      <div className="bg-[#1C1C1E] border border-[#242426] px-3 py-2 text-white font-mono text-[10px] flex items-center justify-between">
                        <span>Subtle Crossfade (600ms)</span>
                        <span className="text-daxul-lime text-[9px] uppercase font-bold">LOCKED</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#242426] bg-[#101012]">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="w-full py-2.5 bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-wider hover:bg-[#b8eb2f] transition-colors"
                >
                  {saving ? "Saving Draft..." : "Save Section Draft"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#71717A] font-mono text-xs">
              Select a section to edit its content.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
