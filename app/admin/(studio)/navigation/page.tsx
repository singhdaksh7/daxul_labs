"use client";

import React, { useEffect, useState } from "react";
import {
  Compass,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  FolderPlus,
} from "lucide-react";

interface NavItem {
  id: string;
  menuId: string;
  parentId?: string | null;
  label: string;
  url: string;
  openNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
  children?: NavItem[];
}

export default function AdminNavigationPage() {
  const [activeMenu, setActiveMenu] = useState<"header" | "footer" | "mobile">("header");
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [parentItemForChild, setParentItemForChild] = useState<NavItem | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [openNewTab, setOpenNewTab] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchMenu = async (handle: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/navigation?handle=${handle}`);
      const data = await res.json();
      if (data?.menu?.items) {
        setItems(data.menu.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu(activeMenu);
  }, [activeMenu]);

  const handleOpenAddModal = (parent?: NavItem) => {
    setParentItemForChild(parent || null);
    setLabel("");
    setUrl("");
    setOpenNewTab(false);
    setModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuHandle: activeMenu,
          parentId: parentItemForChild?.id || null,
          label,
          url,
          openNewTab,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchMenu(activeMenu);
        setFeedback("Item added.");
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: NavItem) => {
    try {
      await fetch("/api/admin/navigation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isActive: !item.isActive,
        }),
      });
      fetchMenu(activeMenu);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: string, label: string) => {
    if (!confirm(`Delete navigation item "${label}"?`)) return;
    try {
      await fetch(`/api/admin/navigation?id=${id}`, { method: "DELETE" });
      fetchMenu(activeMenu);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter root items (items without parentId)
  const rootItems = items.filter((i) => !i.parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-daxul-lime" />
            <span>Navigation Builder</span>
          </h1>
          <p className="font-mono text-xs text-[#B9B9B4] tracking-wide mt-1">
            Configure header, footer, and mobile menus with nested dropdown items.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          className="flex items-center gap-2 bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-[#b8eb2f] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Root Link</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-green-950/40 border border-green-500/30 text-green-400 font-mono text-xs">
          {feedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#242426] bg-[#141416] p-1 font-mono text-xs">
        {(["header", "footer", "mobile"] as const).map((handle) => (
          <button
            key={handle}
            onClick={() => setActiveMenu(handle)}
            className={`px-6 py-2.5 uppercase tracking-wider font-semibold transition-colors ${
              activeMenu === handle
                ? "bg-daxul-lime text-daxul-black"
                : "text-[#B9B9B4] hover:text-white"
            }`}
          >
            {handle === "header"
              ? "Header Menu"
              : handle === "footer"
              ? "Footer Links"
              : "Mobile Drawer"}
          </button>
        ))}
      </div>

      {/* Navigation Tree */}
      <div className="bg-[#141416] border border-[#242426]">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[#B9B9B4]">
            Loading navigation tree...
          </div>
        ) : rootItems.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[#B9B9B4]">
            No items in this menu yet. Click "Add Root Link" to begin.
          </div>
        ) : (
          <div className="divide-y divide-[#242426]">
            {rootItems.map((item, idx) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[#71717A] w-6">
                      {idx + 1}.
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.openNewTab && (
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#242426] text-[#B9B9B4]">
                            New Tab
                          </span>
                        )}
                        {!item.isActive && (
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-neutral-800 text-neutral-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-daxul-lime">
                        {item.url}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAddModal(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#1C1C1E] border border-[#242426] text-xs font-mono text-[#B9B9B4] hover:text-white"
                      title="Add child dropdown item"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-daxul-lime" />
                      <span>+ Dropdown</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(item)}
                      className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-white"
                      title={item.isActive ? "Disable" : "Enable"}
                    >
                      {item.isActive ? (
                        <Eye className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.id, item.label)}
                      className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Submenu Children */}
                {item.children && item.children.length > 0 && (
                  <div className="pl-10 space-y-2 pt-2 border-l-2 border-[#242426] ml-4">
                    {item.children.map((child, cIdx) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between p-2.5 bg-[#101012] border border-[#242426]"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-daxul-lime" />
                          <span className="text-xs font-semibold text-white">
                            {child.label}
                          </span>
                          <span className="font-mono text-[11px] text-[#71717A]">
                            → {child.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(child)}
                            className="p-1 text-[#B9B9B4] hover:text-white"
                          >
                            {child.isActive ? (
                              <Eye className="w-3 h-3 text-green-400" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-neutral-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteItem(child.id, child.label)}
                            className="p-1 text-[#B9B9B4] hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#242426] max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[#242426] pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                {parentItemForChild
                  ? `Add Submenu to "${parentItemForChild.label}"`
                  : `Add Link to ${activeMenu} menu`}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#B9B9B4] hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-mono uppercase tracking-wider text-[#B9B9B4] mb-1.5">
                  Label *
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Desk Objects"
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                />
              </div>

              <div>
                <label className="block font-mono uppercase tracking-wider text-[#B9B9B4] mb-1.5">
                  URL / Route *
                </label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. /collections/desk or /our-story"
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="navOpenNewTab"
                  checked={openNewTab}
                  onChange={(e) => setOpenNewTab(e.target.checked)}
                  className="rounded bg-[#1C1C1E]"
                />
                <label htmlFor="navOpenNewTab" className="font-mono text-xs text-[#B9B9B4]">
                  Open in new tab
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-daxul-lime text-daxul-black font-semibold uppercase tracking-wider hover:bg-[#b8eb2f] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
