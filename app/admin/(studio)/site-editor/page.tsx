"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCms } from "@/lib/cmsContext";
import { CmsSectionKey } from "@/lib/cmsTypes";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import {
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Monitor,
  Smartphone,
  Layers,
  Sparkles,
  AlertTriangle,
  Upload,
  RefreshCw,
  History,
} from "lucide-react";

export default function AdminSiteEditorPage() {
  const { refetchCmsData, setDraftOverrideData } = useCms();

  const [sections, setSections] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<CmsSectionKey>("HERO");
  const [draftDataMap, setDraftDataMap] = useState<Record<string, any>>({});
  const [publishedDataMap, setPublishedDataMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  // Preview options
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile">("desktop");

  // Media picker modal state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTargetField, setMediaPickerTargetField] = useState<string | null>(null);
  const [currentMediaForPicker, setCurrentMediaForPicker] = useState<any>(undefined);

  // Fetch admin sections from DB
  const fetchSections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms/sections");
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);

        const drafts: Record<string, any> = {};
        const pubs: Record<string, any> = {};

        (data.sections || []).forEach((sec: any) => {
          drafts[sec.sectionKey] = sec.draftContent;
          pubs[sec.sectionKey] = sec.publishedContent;
        });

        setDraftDataMap(drafts);
        setPublishedDataMap(pubs);
        updateLivePreview(drafts);
      }
    } catch (err) {
      console.error("Error fetching admin CMS sections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const updateLivePreview = (drafts: Record<string, any>) => {
    if (setDraftOverrideData) {
      setDraftOverrideData({
        header: drafts.HEADER,
        hero: drafts.HERO,
        featuredProduct: drafts.FEATURED_PRODUCT,
        collections: drafts.COLLECTIONS,
        customization: drafts.CUSTOMIZATION,
        lab: drafts.LAB,
        buildingDaxul: drafts.BUILDING_DAXUL,
        footer: drafts.FOOTER,
      });
    }
  };

  const handleUpdateCurrentDraft = (newDraftContent: any) => {
    const updatedMap = { ...draftDataMap, [selectedKey]: newDraftContent };
    setDraftDataMap(updatedMap);
    updateLivePreview(updatedMap);
  };

  const handleSaveDraft = async (key: CmsSectionKey) => {
    setSavingKey(key);
    try {
      const res = await fetch(`/api/admin/cms/sections/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftContent: draftDataMap[key] }),
      });

      if (res.ok) {
        setStatusMsg(`Saved draft for ${key}`);
        fetchSections();
      } else {
        alert("Failed to save draft.");
      }
    } catch (e: any) {
      alert("Error saving draft: " + e.message);
    } finally {
      setSavingKey(null);
    }
  };

  const handlePublishSection = async (key: CmsSectionKey) => {
    try {
      const res = await fetch(`/api/admin/cms/sections/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });

      if (res.ok) {
        setStatusMsg(`Published ${key} to live storefront!`);
        await fetchSections();
        await refetchCmsData();
      }
    } catch (e: any) {
      alert("Error publishing section: " + e.message);
    }
  };

  const handlePublishAll = async () => {
    if (!confirm("Are you sure you want to publish ALL draft changes to the live storefront?")) return;
    try {
      const res = await fetch("/api/admin/cms/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_all" }),
      });

      if (res.ok) {
        setStatusMsg("All homepage sections published live successfully!");
        await fetchSections();
        await refetchCmsData();
      }
    } catch (e: any) {
      alert("Error publishing all sections: " + e.message);
    }
  };

  const handleRevertSection = async (key: CmsSectionKey) => {
    try {
      const res = await fetch(`/api/admin/cms/sections/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert" }),
      });

      if (res.ok) {
        setStatusMsg(`Reverted draft for ${key} back to published state.`);
        fetchSections();
      }
    } catch (e: any) {
      alert("Error reverting draft: " + e.message);
    }
  };

  const handleResetSectionToDefault = async (key: CmsSectionKey) => {
    if (!confirm(`Reset ${key} back to standard DAXUL default template?`)) return;
    try {
      const res = await fetch(`/api/admin/cms/sections/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_default" }),
      });

      if (res.ok) {
        setStatusMsg(`Reset ${key} to standard DAXUL default.`);
        await fetchSections();
        await refetchCmsData();
      }
    } catch (e: any) {
      alert("Error resetting section: " + e.message);
    }
  };

  const handleResetAllToDefault = async () => {
    if (!confirm("Reset ALL 8 homepage sections back to standard DAXUL LABS default templates?")) return;
    try {
      const res = await fetch("/api/admin/cms/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_all_default" }),
      });

      if (res.ok) {
        setStatusMsg("Reset entire homepage to standard DAXUL LABS default template.");
        await fetchSections();
        await refetchCmsData();
      }
    } catch (e: any) {
      alert("Error resetting all sections: " + e.message);
    }
  };

  const handleToggleVisibility = async (key: CmsSectionKey) => {
    try {
      const res = await fetch(`/api/admin/cms/sections/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_visibility" }),
      });

      if (res.ok) {
        fetchSections();
      }
    } catch (e: any) {
      alert("Error toggling section visibility: " + e.message);
    }
  };

  const handleMoveSection = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    const orderedKeys = copy.map((s) => s.sectionKey);

    try {
      const res = await fetch("/api/admin/cms/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", order: orderedKeys }),
      });

      if (res.ok) {
        fetchSections();
      }
    } catch (e: any) {
      alert("Error reordering sections: " + e.message);
    }
  };

  const openMediaPickerFor = (fieldKey: string, currentVal?: any) => {
    setMediaPickerTargetField(fieldKey);
    setCurrentMediaForPicker(currentVal);
    setMediaPickerOpen(true);
  };

  const handleMediaSelected = (mediaConfig: any) => {
    if (!mediaPickerTargetField) return;
    const currentDraft = { ...draftDataMap[selectedKey] };

    // Deep set field in current draft
    if (mediaPickerTargetField === "media") {
      currentDraft.media = mediaConfig;
    } else if (mediaPickerTargetField.startsWith("tile_media_")) {
      const tileIdx = parseInt(mediaPickerTargetField.replace("tile_media_", ""), 10);
      if (currentDraft.tiles && currentDraft.tiles[tileIdx]) {
        currentDraft.tiles[tileIdx].media = mediaConfig;
      }
    }

    handleUpdateCurrentDraft(currentDraft);
  };

  const currentDraft = draftDataMap[selectedKey] || {};
  const currentSectionRecord = sections.find((s) => s.sectionKey === selectedKey);
  const isModified = JSON.stringify(draftDataMap[selectedKey]) !== JSON.stringify(publishedDataMap[selectedKey]);

  return (
    <div className="min-h-full bg-[#0B0B0C] text-white flex flex-col font-sans selection:bg-[#C8FF35] selection:text-[#0B0B0C]">
      
      {/* Top Admin Editor Bar */}
      <header className="bg-[#151515] border-b border-[#242426] sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="font-extrabold text-sm uppercase tracking-wider text-white hover:text-[#C8FF35]">
            ← Admin Dashboard
          </Link>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C8FF35] animate-ping" />
            <h1 className="font-bold text-sm uppercase tracking-wider text-white">
              DAXUL Storefront CMS Site Editor
            </h1>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-3">
          {statusMsg && (
            <span className="text-xs font-mono text-[#C8FF35] bg-[#C8FF35]/10 px-3 py-1 rounded border border-[#C8FF35]/30 animate-in fade-in">
              {statusMsg}
            </span>
          )}

          <button
            onClick={() => handleSaveDraft(selectedKey)}
            disabled={savingKey === selectedKey}
            className="flex items-center gap-1.5 bg-[#242426] hover:bg-white hover:text-[#0B0B0C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingKey === selectedKey ? "Saving..." : "Save Section Draft"}</span>
          </button>

          <button
            onClick={handlePublishAll}
            className="flex items-center gap-1.5 bg-[#C8FF35] text-[#0B0B0C] px-5 py-2 rounded-xl text-xs font-extrabold uppercase hover:bg-white transition-all shadow-lg shadow-[#C8FF35]/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Publish All Live</span>
          </button>

          <button
            onClick={handleResetAllToDefault}
            title="Reset All Sections to Standard DAXUL Default"
            className="p-2 text-gray-400 hover:text-amber-400 hover:bg-[#242426] rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 3-Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* PANE 1: LEFT SIDEBAR — Homepage Section List */}
        <aside className="w-full lg:w-72 bg-[#151515] border-r border-[#242426] p-4 shrink-0 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-65px)] space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-[10px] text-gray-400 uppercase tracking-widest px-1">
              <span>HOMEPAGE SECTIONS</span>
              <span>({sections.length})</span>
            </div>

            <div className="space-y-2">
              {sections.map((sec, idx) => {
                const isSelected = selectedKey === sec.sectionKey;
                const isDraftDiff = JSON.stringify(sec.draftContent) !== JSON.stringify(sec.publishedContent);

                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedKey(sec.sectionKey as CmsSectionKey)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-[#0B0B0C] border-[#C8FF35] shadow-lg shadow-[#C8FF35]/10"
                        : "bg-[#0B0B0C]/60 border-[#242426] hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-white uppercase flex items-center gap-2 truncate">
                        <Layers className="w-3.5 h-3.5 text-[#C8FF35] shrink-0" />
                        <span className="truncate">{sec.name}</span>
                      </div>

                      {/* Move & Visibility buttons */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleMoveSection(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveSection(idx, "down")}
                          disabled={idx === sections.length - 1}
                          className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(sec.sectionKey as CmsSectionKey)}
                          className={`p-1 rounded font-mono text-[10px] font-bold ${
                            sec.visible ? "text-[#C8FF35]" : "text-gray-600 line-through"
                          }`}
                          title="Toggle Visibility"
                        >
                          {sec.visible ? "VIS" : "HID"}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider">
                      <span className="text-gray-500">{sec.sectionKey}</span>
                      {isDraftDiff ? (
                        <span className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          Draft Modified
                        </span>
                      ) : (
                        <span className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                          Published
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#242426] text-[10px] font-mono text-gray-500 space-y-1">
            <div>All changes are saved to draft first.</div>
            <div>Click <strong>Publish All Live</strong> to push changes publicly.</div>
          </div>
        </aside>

        {/* PANE 2: CENTER — Live Storefront Preview */}
        <section className="flex-1 bg-[#070708] flex flex-col border-r border-[#242426] overflow-hidden">
          
          {/* Viewport Toolbar */}
          <div className="bg-[#151515] border-b border-[#242426] p-2.5 px-4 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 font-mono text-[11px] text-gray-400">
              <Eye className="w-4 h-4 text-[#C8FF35]" />
              <span>LIVE DRAFT STOREFRONT PREVIEW</span>
            </div>

            <div className="flex items-center gap-2 bg-[#0B0B0C] p-1 rounded-xl border border-[#242426]">
              <button
                onClick={() => setViewportMode("desktop")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono uppercase transition-colors ${
                  viewportMode === "desktop" ? "bg-[#C8FF35] text-[#0B0B0C] font-bold" : "text-gray-400"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop (1440px)</span>
              </button>

              <button
                onClick={() => setViewportMode("mobile")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono uppercase transition-colors ${
                  viewportMode === "mobile" ? "bg-[#C8FF35] text-[#0B0B0C] font-bold" : "text-gray-400"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (390px)</span>
              </button>
            </div>
          </div>

          {/* Frame Container */}
          <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center bg-[#050505]">
            <div
              className={`transition-all duration-300 bg-[#0B0B0C] border border-[#242426] shadow-2xl overflow-hidden ${
                viewportMode === "mobile"
                  ? "w-[390px] h-[780px] rounded-3xl"
                  : "w-full max-w-[1440px] h-full rounded-2xl"
              }`}
            >
              <iframe
                src="/"
                className="w-full h-full border-0"
                title="Live Storefront Preview"
              />
            </div>
          </div>

        </section>

        {/* PANE 3: RIGHT — Selected Section Dynamic Form Editor */}
        <aside className="w-full lg:w-[480px] bg-[#151515] p-6 shrink-0 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-65px)] space-y-6">
          
          <div className="space-y-6">
            
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-[#242426] pb-4">
              <div>
                <span className="font-mono text-[10px] text-[#C8FF35] tracking-widest uppercase block mb-1">
                  [ SECTION EDITOR ]
                </span>
                <h2 className="text-xl font-bold uppercase text-white">
                  {currentSectionRecord?.name || selectedKey}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePublishSection(selectedKey)}
                  className="bg-[#C8FF35] text-[#0B0B0C] font-mono text-[11px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                >
                  Publish
                </button>
                <button
                  onClick={() => handleResetSectionToDefault(selectedKey)}
                  title="Reset section to default template"
                  className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-[#242426] rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DYNAMIC FORM CONTROLS BY SECTION KEY */}

            {/* 1. HEADER EDITOR */}
            {selectedKey === "HEADER" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Logo Wordmark Text</label>
                  <input
                    type="text"
                    value={currentDraft.logoText || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, logoText: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Logo Subtext Tagline</label>
                  <input
                    type="text"
                    value={currentDraft.logoSubtext || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, logoSubtext: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">CTA Button Label</label>
                  <input
                    type="text"
                    value={currentDraft.ctaLabel || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaLabel: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">CTA Destination URL</label>
                  <input
                    type="text"
                    value={currentDraft.ctaUrl || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaUrl: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                {/* Nav Links Repeater */}
                <div className="space-y-3 pt-4 border-t border-[#242426]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold uppercase text-white">Navigation Links</span>
                    <button
                      onClick={() => {
                        const items = currentDraft.navItems || [];
                        handleUpdateCurrentDraft({
                          ...currentDraft,
                          navItems: [...items, { label: "New Link", url: "/shop" }],
                        });
                      }}
                      className="text-[10px] font-mono font-bold text-[#C8FF35] hover:underline"
                    >
                      + Add Nav Link
                    </button>
                  </div>

                  {(currentDraft.navItems || []).map((item: any, idx: number) => (
                    <div key={idx} className="bg-[#0B0B0C] border border-[#242426] p-3 rounded-xl space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const copy = [...currentDraft.navItems];
                            copy[idx].label = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, navItems: copy });
                          }}
                          className="flex-1 bg-[#151515] border border-[#242426] p-2 rounded-lg text-white font-bold"
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => {
                            const copy = [...currentDraft.navItems];
                            copy[idx].url = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, navItems: copy });
                          }}
                          className="flex-1 bg-[#151515] border border-[#242426] p-2 rounded-lg text-white font-mono"
                          placeholder="URL"
                        />
                        <button
                          onClick={() => {
                            const copy = currentDraft.navItems.filter((_: any, i: number) => i !== idx);
                            handleUpdateCurrentDraft({ ...currentDraft, navItems: copy });
                          }}
                          className="p-2 text-red-400 hover:bg-[#242426] rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. HERO EDITOR */}
            {selectedKey === "HERO" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Eyebrow Tagline</label>
                  <input
                    type="text"
                    value={currentDraft.eyebrow || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, eyebrow: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Headline Line 1</label>
                    <input
                      type="text"
                      value={currentDraft.headlineLine1 || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, headlineLine1: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Line 2</label>
                    <input
                      type="text"
                      value={currentDraft.headlineLine2 || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, headlineLine2: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Line 3</label>
                    <input
                      type="text"
                      value={currentDraft.headlineLine3 || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, headlineLine3: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Supporting Copy</label>
                  <textarea
                    rows={3}
                    value={currentDraft.supportingCopy || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, supportingCopy: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-normal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Primary CTA Label</label>
                    <input
                      type="text"
                      value={currentDraft.primaryCtaLabel || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, primaryCtaLabel: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Primary CTA URL</label>
                    <input
                      type="text"
                      value={currentDraft.primaryCtaUrl || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, primaryCtaUrl: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Secondary CTA Label</label>
                    <input
                      type="text"
                      value={currentDraft.secondaryCtaLabel || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, secondaryCtaLabel: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Secondary CTA URL</label>
                    <input
                      type="text"
                      value={currentDraft.secondaryCtaUrl || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, secondaryCtaUrl: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                {/* Media Picker Component Input */}
                <div className="pt-4 border-t border-[#242426] space-y-2">
                  <label className="font-mono text-xs font-bold uppercase text-white block">Hero Showcase Media</label>
                  <div className="bg-[#0B0B0C] border border-[#242426] p-3 rounded-2xl flex items-center justify-between">
                    <div className="text-xs text-gray-300 font-mono truncate max-w-[240px]">
                      {currentDraft.media?.url || "Default image"} ({currentDraft.media?.mediaType || "image"})
                    </div>
                    <button
                      onClick={() => openMediaPickerFor("media", currentDraft.media)}
                      className="bg-[#C8FF35] text-[#0B0B0C] font-mono text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-white"
                    >
                      Select Media
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. FEATURED PRODUCT EDITOR */}
            {selectedKey === "FEATURED_PRODUCT" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Section Badge</label>
                  <input
                    type="text"
                    value={currentDraft.badge || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, badge: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Section Headline</label>
                  <input
                    type="text"
                    value={currentDraft.headline || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, headline: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Product Slug Reference</label>
                  <input
                    type="text"
                    value={currentDraft.productSlug || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, productSlug: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Custom Override Display Title</label>
                  <input
                    type="text"
                    value={currentDraft.customOverrideTitle || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, customOverrideTitle: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Description Copy</label>
                  <textarea
                    rows={3}
                    value={currentDraft.description || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, description: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">CTA Label</label>
                    <input
                      type="text"
                      value={currentDraft.ctaLabel || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaLabel: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">CTA URL</label>
                    <input
                      type="text"
                      value={currentDraft.ctaUrl || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaUrl: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#242426] space-y-2">
                  <label className="font-mono text-xs font-bold uppercase text-white block">Flagship Showcase Media</label>
                  <div className="bg-[#0B0B0C] border border-[#242426] p-3 rounded-2xl flex items-center justify-between">
                    <div className="text-xs text-gray-300 font-mono truncate max-w-[240px]">
                      {currentDraft.media?.url || "Default image"}
                    </div>
                    <button
                      onClick={() => openMediaPickerFor("media", currentDraft.media)}
                      className="bg-[#C8FF35] text-[#0B0B0C] font-mono text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-white"
                    >
                      Select Media
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. COLLECTIONS EDITOR */}
            {selectedKey === "COLLECTIONS" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Section Eyebrow</label>
                  <input
                    type="text"
                    value={currentDraft.eyebrow || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, eyebrow: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Section Heading</label>
                  <input
                    type="text"
                    value={currentDraft.sectionHeading || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, sectionHeading: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold"
                  />
                </div>

                {/* Collection Tiles Repeater */}
                <div className="space-y-3 pt-4 border-t border-[#242426]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold uppercase text-white">Collection Tiles ({currentDraft.tiles?.length || 0})</span>
                    <button
                      onClick={() => {
                        const tiles = currentDraft.tiles || [];
                        handleUpdateCurrentDraft({
                          ...currentDraft,
                          tiles: [
                            ...tiles,
                            {
                              id: `tile-${Date.now()}`,
                              title: "NEW COLLECTION",
                              slug: "new-collection",
                              descriptor: "Collection description...",
                              destinationUrl: "/collections",
                              media: { mediaType: "image", url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop" },
                            },
                          ],
                        });
                      }}
                      className="text-[10px] font-mono font-bold text-[#C8FF35] hover:underline"
                    >
                      + Add Tile
                    </button>
                  </div>

                  {(currentDraft.tiles || []).map((tile: any, idx: number) => (
                    <div key={tile.id || idx} className="bg-[#0B0B0C] border border-[#242426] p-3 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={tile.title}
                          onChange={(e) => {
                            const copy = [...currentDraft.tiles];
                            copy[idx].title = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, tiles: copy });
                          }}
                          className="bg-[#151515] border border-[#242426] p-1.5 rounded-lg text-white font-bold uppercase"
                        />
                        <button
                          onClick={() => {
                            const copy = currentDraft.tiles.filter((_: any, i: number) => i !== idx);
                            handleUpdateCurrentDraft({ ...currentDraft, tiles: copy });
                          }}
                          className="p-1 text-red-400 hover:bg-[#242426] rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={tile.descriptor}
                        onChange={(e) => {
                          const copy = [...currentDraft.tiles];
                          copy[idx].descriptor = e.target.value;
                          handleUpdateCurrentDraft({ ...currentDraft, tiles: copy });
                        }}
                        className="w-full bg-[#151515] border border-[#242426] p-1.5 rounded-lg text-white text-[11px]"
                        placeholder="Descriptor"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-gray-400 truncate max-w-[200px]">{tile.media?.url}</span>
                        <button
                          onClick={() => openMediaPickerFor(`tile_media_${idx}`, tile.media)}
                          className="bg-[#C8FF35] text-[#0B0B0C] font-mono text-[9px] font-bold uppercase px-2.5 py-1 rounded"
                        >
                          Change Tile Media
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. CUSTOMIZATION EDITOR */}
            {selectedKey === "CUSTOMIZATION" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Section Headline</label>
                  <input
                    type="text"
                    value={currentDraft.headline || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, headline: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Supporting Copy</label>
                  <textarea
                    rows={2}
                    value={currentDraft.supportingCopy || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, supportingCopy: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">CTA Label</label>
                    <input
                      type="text"
                      value={currentDraft.ctaLabel || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaLabel: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">CTA URL</label>
                    <input
                      type="text"
                      value={currentDraft.ctaUrl || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaUrl: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                {/* Steps Repeater */}
                <div className="space-y-3 pt-4 border-t border-[#242426]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold uppercase text-white">Customization Steps ({currentDraft.steps?.length || 0})</span>
                    <button
                      onClick={() => {
                        const steps = currentDraft.steps || [];
                        handleUpdateCurrentDraft({
                          ...currentDraft,
                          steps: [
                            ...steps,
                            { id: `step-${Date.now()}`, num: `0${steps.length + 1}`, title: "New Step", desc: "Step details..." },
                          ],
                        });
                      }}
                      className="text-[10px] font-mono font-bold text-[#C8FF35] hover:underline"
                    >
                      + Add Step
                    </button>
                  </div>

                  {(currentDraft.steps || []).map((step: any, idx: number) => (
                    <div key={step.id || idx} className="bg-[#0B0B0C] border border-[#242426] p-3 rounded-2xl space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={step.num}
                          onChange={(e) => {
                            const copy = [...currentDraft.steps];
                            copy[idx].num = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, steps: copy });
                          }}
                          className="w-12 bg-[#151515] border border-[#242426] p-1.5 rounded-lg text-[#C8FF35] font-mono font-bold"
                        />
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const copy = [...currentDraft.steps];
                            copy[idx].title = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, steps: copy });
                          }}
                          className="flex-1 bg-[#151515] border border-[#242426] p-1.5 rounded-lg text-white font-bold uppercase"
                        />
                        <button
                          onClick={() => {
                            const copy = currentDraft.steps.filter((_: any, i: number) => i !== idx);
                            handleUpdateCurrentDraft({ ...currentDraft, steps: copy });
                          }}
                          className="p-1.5 text-red-400 hover:bg-[#242426] rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={step.desc}
                        onChange={(e) => {
                          const copy = [...currentDraft.steps];
                          copy[idx].desc = e.target.value;
                          handleUpdateCurrentDraft({ ...currentDraft, steps: copy });
                        }}
                        className="w-full bg-[#151515] border border-[#242426] p-1.5 rounded-lg text-white text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. DAXUL LAB EDITOR */}
            {selectedKey === "LAB" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Badge Label</label>
                  <input
                    type="text"
                    value={currentDraft.badgeText || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, badgeText: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Heading</label>
                  <input
                    type="text"
                    value={currentDraft.heading || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, heading: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Copy</label>
                  <textarea
                    rows={3}
                    value={currentDraft.copy || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, copy: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">CTA Label</label>
                    <input
                      type="text"
                      value={currentDraft.ctaLabel || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaLabel: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">CTA URL</label>
                    <input
                      type="text"
                      value={currentDraft.ctaUrl || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, ctaUrl: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#242426] space-y-2">
                  <label className="font-mono text-xs font-bold uppercase text-white block">Lab Media</label>
                  <div className="bg-[#0B0B0C] border border-[#242426] p-3 rounded-2xl flex items-center justify-between">
                    <div className="text-xs text-gray-300 font-mono truncate max-w-[240px]">
                      {currentDraft.media?.url || "Default image"}
                    </div>
                    <button
                      onClick={() => openMediaPickerFor("media", currentDraft.media)}
                      className="bg-[#C8FF35] text-[#0B0B0C] font-mono text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-white"
                    >
                      Select Media
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. BUILDING DAXUL EDITOR */}
            {selectedKey === "BUILDING_DAXUL" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Heading</label>
                  <input
                    type="text"
                    value={currentDraft.heading || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, heading: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Supporting Copy</label>
                  <input
                    type="text"
                    value={currentDraft.supportingCopy || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, supportingCopy: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Social Handle</label>
                    <input
                      type="text"
                      value={currentDraft.socialHandle || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, socialHandle: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Handle URL</label>
                    <input
                      type="text"
                      value={currentDraft.handleUrl || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, handleUrl: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                {/* Tiles Repeater */}
                <div className="space-y-3 pt-4 border-t border-[#242426]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold uppercase text-white">Chronicle Tiles ({currentDraft.tiles?.length || 0})</span>
                    <button
                      onClick={() => {
                        const tiles = currentDraft.tiles || [];
                        handleUpdateCurrentDraft({
                          ...currentDraft,
                          tiles: [
                            ...tiles,
                            {
                              id: `b-tile-${Date.now()}`,
                              tag: `0${tiles.length + 1} / STAGE`,
                              title: "New Journey Tile",
                              description: "Stage details...",
                              media: { mediaType: "image", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1000&auto=format&fit=crop" },
                            },
                          ],
                        });
                      }}
                      className="text-[10px] font-mono font-bold text-[#C8FF35] hover:underline"
                    >
                      + Add Tile
                    </button>
                  </div>

                  {(currentDraft.tiles || []).map((tile: any, idx: number) => (
                    <div key={tile.id || idx} className="bg-[#0B0B0C] border border-[#242426] p-3 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <input
                          type="text"
                          value={tile.tag}
                          onChange={(e) => {
                            const copy = [...currentDraft.tiles];
                            copy[idx].tag = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, tiles: copy });
                          }}
                          className="w-28 bg-[#151515] border border-[#242426] p-1 rounded-lg text-[#C8FF35] font-mono text-[10px]"
                        />
                        <input
                          type="text"
                          value={tile.title}
                          onChange={(e) => {
                            const copy = [...currentDraft.tiles];
                            copy[idx].title = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, tiles: copy });
                          }}
                          className="flex-1 bg-[#151515] border border-[#242426] p-1 rounded-lg text-white font-bold uppercase"
                        />
                        <button
                          onClick={() => {
                            const copy = currentDraft.tiles.filter((_: any, i: number) => i !== idx);
                            handleUpdateCurrentDraft({ ...currentDraft, tiles: copy });
                          }}
                          className="p-1 text-red-400 hover:bg-[#242426] rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={tile.description}
                        onChange={(e) => {
                          const copy = [...currentDraft.tiles];
                          copy[idx].description = e.target.value;
                          handleUpdateCurrentDraft({ ...currentDraft, tiles: copy });
                        }}
                        className="w-full bg-[#151515] border border-[#242426] p-1.5 rounded-lg text-white text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. FOOTER EDITOR */}
            {selectedKey === "FOOTER" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Wordmark Text</label>
                  <input
                    type="text"
                    value={currentDraft.wordmarkText || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, wordmarkText: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-gray-400 uppercase">Tagline</label>
                  <input
                    type="text"
                    value={currentDraft.tagline || ""}
                    onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, tagline: e.target.value })}
                    className="w-full bg-[#0B0B0C] border border-[#242426] p-2.5 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Copyright Line</label>
                    <input
                      type="text"
                      value={currentDraft.copyrightLine || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, copyrightLine: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-gray-400 text-[10px] uppercase">Made In India Text</label>
                    <input
                      type="text"
                      value={currentDraft.madeInIndiaText || ""}
                      onChange={(e) => handleUpdateCurrentDraft({ ...currentDraft, madeInIndiaText: e.target.value })}
                      className="w-full bg-[#0B0B0C] border border-[#242426] p-2 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                {/* Footer Columns Repeater */}
                <div className="space-y-4 pt-4 border-t border-[#242426]">
                  <span className="font-mono text-xs font-bold uppercase text-white block">Footer Nav Columns</span>

                  {(currentDraft.columns || []).map((col: any, cIdx: number) => (
                    <div key={col.id || cIdx} className="bg-[#0B0B0C] border border-[#242426] p-3.5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={col.heading}
                          onChange={(e) => {
                            const copy = [...currentDraft.columns];
                            copy[cIdx].heading = e.target.value;
                            handleUpdateCurrentDraft({ ...currentDraft, columns: copy });
                          }}
                          className="bg-[#151515] border border-[#242426] p-1.5 rounded-lg text-white font-bold uppercase"
                        />
                      </div>

                      {/* Links in column */}
                      <div className="space-y-1.5 pl-2">
                        {(col.links || []).map((link: any, lIdx: number) => (
                          <div key={lIdx} className="flex gap-2">
                            <input
                              type="text"
                              value={link.label}
                              onChange={(e) => {
                                const copy = [...currentDraft.columns];
                                copy[cIdx].links[lIdx].label = e.target.value;
                                handleUpdateCurrentDraft({ ...currentDraft, columns: copy });
                              }}
                              className="flex-1 bg-[#151515] border border-[#242426] p-1 rounded text-white text-[11px]"
                            />
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => {
                                const copy = [...currentDraft.columns];
                                copy[cIdx].links[lIdx].url = e.target.value;
                                handleUpdateCurrentDraft({ ...currentDraft, columns: copy });
                              }}
                              className="flex-1 bg-[#151515] border border-[#242426] p-1 rounded text-white font-mono text-[10px]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Section Action Footer */}
          <div className="pt-4 border-t border-[#242426] flex items-center justify-between">
            <button
              onClick={() => handleRevertSection(selectedKey)}
              className="text-xs font-mono text-gray-400 hover:text-white uppercase flex items-center gap-1"
            >
              <History className="w-3.5 h-3.5" />
              <span>Revert Draft</span>
            </button>

            <button
              onClick={() => handleSaveDraft(selectedKey)}
              disabled={savingKey === selectedKey}
              className="bg-white hover:bg-[#F3F0E9] text-[#0B0B0C] font-mono text-xs font-bold uppercase px-6 py-2.5 rounded-xl transition-all"
            >
              Save Section Draft
            </button>
          </div>

        </aside>

      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelectMedia={handleMediaSelected}
        currentMedia={currentMediaForPicker}
      />

    </div>
  );
}
