"use client";

import React, { useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  Eye,
  EyeOff,
  Edit,
} from "lucide-react";

interface BannerItem {
  id: string;
  name: string;
  placement: string;
  text: string;
  buttonText?: string | null;
  linkUrl?: string | null;
  desktopImage?: string | null;
  mobileImage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority: number;
  visible: boolean;
  updatedAt: string;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState("ANNOUNCEMENT");
  const [text, setText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [desktopImage, setDesktopImage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState(0);
  const [visible, setVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
  }, []);

  const openCreateModal = () => {
    setEditingBanner(null);
    setName("");
    setPlacement("ANNOUNCEMENT");
    setText("");
    setButtonText("");
    setLinkUrl("");
    setDesktopImage("");
    setStartDate("");
    setEndDate("");
    setPriority(0);
    setVisible(true);
    setModalOpen(true);
  };

  const openEditModal = (b: BannerItem) => {
    setEditingBanner(b);
    setName(b.name);
    setPlacement(b.placement);
    setText(b.text);
    setButtonText(b.buttonText || "");
    setLinkUrl(b.linkUrl || "");
    setDesktopImage(b.desktopImage || "");
    setStartDate(b.startDate ? b.startDate.slice(0, 10) : "");
    setEndDate(b.endDate ? b.endDate.slice(0, 10) : "");
    setPriority(b.priority);
    setVisible(b.visible);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBanner?.id,
          name,
          placement,
          text,
          buttonText: buttonText || null,
          linkUrl: linkUrl || null,
          desktopImage: desktopImage || null,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          priority: Number(priority),
          visible,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisible = async (b: BannerItem) => {
    try {
      await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: b.id,
          name: b.name,
          text: b.text,
          visible: !b.visible,
        }),
      });
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete banner "${name}"?`)) return;
    try {
      await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-daxul-lime" />
            <span>Banners & Announcements</span>
          </h1>
          <p className="font-mono text-xs text-[#B9B9B4] tracking-wide mt-1">
            Manage top announcement bars, seasonal promos, and countdown banners with start/end schedules.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-[#b8eb2f] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Banner</span>
        </button>
      </div>

      {/* Banners List */}
      <div className="bg-[#141416] border border-[#242426]">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[#B9B9B4]">
            Loading banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[#B9B9B4]">
            No banners created yet. Click "New Banner" to create one.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#242426] font-mono uppercase tracking-widest text-[#B9B9B4] bg-[#101012]">
                <th className="p-4">Name & Placement</th>
                <th className="p-4">Content Text</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242426]">
              {banners.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{b.name}</div>
                    <span className="font-mono text-[10px] text-daxul-lime uppercase">
                      {b.placement}
                    </span>
                  </td>

                  <td className="p-4 max-w-xs">
                    <div className="text-white truncate">{b.text}</div>
                    {b.linkUrl && (
                      <span className="font-mono text-[10px] text-[#71717A] truncate block">
                        → {b.linkUrl}
                      </span>
                    )}
                  </td>

                  <td className="p-4 font-mono text-white">
                    {b.priority}
                  </td>

                  <td className="p-4 font-mono text-[11px] text-[#B9B9B4]">
                    {b.startDate || b.endDate ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#71717A]" />
                        <span>
                          {b.startDate ? new Date(b.startDate).toLocaleDateString() : "Always"}
                          {" — "}
                          {b.endDate ? new Date(b.endDate).toLocaleDateString() : "Ongoing"}
                        </span>
                      </div>
                    ) : (
                      "Always Active"
                    )}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => handleToggleVisible(b)}
                      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase px-2.5 py-1 ${
                        b.visible
                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                          : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                      }`}
                    >
                      {b.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{b.visible ? "Visible" : "Hidden"}</span>
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(b)}
                        className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-white"
                        title="Edit Banner"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-red-400"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#242426] max-w-lg w-full p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[#242426] pb-4">
              <h2 className="text-base font-bold uppercase tracking-wider text-white">
                {editingBanner ? "Edit Banner" : "Create New Banner"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#B9B9B4] hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    Banner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Free Shipping Promo"
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                  />
                </div>
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    Placement *
                  </label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime font-mono"
                  >
                    <option value="ANNOUNCEMENT">Announcement Bar (Top)</option>
                    <option value="HOMEPAGE_TOP">Homepage Top</option>
                    <option value="PROMO_BAR">Promo Bar</option>
                    <option value="PAGE_HERO">Page Hero Banner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                  Banner Text *
                </label>
                <input
                  type="text"
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. FREE SHIPPING ON ALL ORDERS OVER ₹1999"
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. SHOP NOW"
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                  />
                </div>
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    Link URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="/shop"
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono uppercase text-[#B9B9B4] mb-1">
                    Priority (Higher = Displayed first)
                  </label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="bannerVisibleToggle"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                    className="rounded bg-[#1C1C1E]"
                  />
                  <label htmlFor="bannerVisibleToggle" className="font-mono text-[#B9B9B4]">
                    Visible immediately
                  </label>
                </div>
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
                  {submitting ? "Saving..." : "Save Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
