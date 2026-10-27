"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Copy,
  Trash2,
  Archive,
  ArrowUpRight,
  Search,
  ExternalLink,
  RefreshCw,
  GitFork,
} from "lucide-react";

interface CmsPageSummary {
  id: string;
  title: string;
  slug: string;
  isSystem: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  seoTitle?: string | null;
  updatedAt: string;
  _count: { sections: number };
}

interface CmsRedirectItem {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  updatedAt: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<CmsPageSummary[]>([]);
  const [redirects, setRedirects] = useState<CmsRedirectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [redirectsModalOpen, setRedirectsModalOpen] = useState(false);

  // New Page form
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSeoTitle, setNewSeoTitle] = useState("");
  const [newSeoDesc, setNewSeoDesc] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms/pages?archived=true");
      const data = await res.json();
      if (data.pages) setPages(data.pages);
    } catch (err) {
      console.error("fetchPages error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRedirects = async () => {
    try {
      const res = await fetch("/api/admin/redirects");
      const data = await res.json();
      if (data.redirects) setRedirects(data.redirects);
    } catch (err) {
      console.error("fetchRedirects error:", err);
    }
  };

  useEffect(() => {
    fetchPages();
    fetchRedirects();
  }, []);

  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    if (!newSlug || newSlug === newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
      setNewSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/cms/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug,
          seoTitle: newSeoTitle || undefined,
          seoDescription: newSeoDesc || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create page");
      }
      setCreateModalOpen(false);
      setNewTitle("");
      setNewSlug("");
      setNewSeoTitle("");
      setNewSeoDesc("");
      fetchPages();
    } catch (err: any) {
      setFormError(err.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!confirm("Duplicate this page and all its sections?")) return;
    try {
      const res = await fetch(`/api/admin/cms/pages/${id}/duplicate`, { method: "POST" });
      if (res.ok) fetchPages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ARCHIVED" ? "DRAFT" : "ARCHIVED";
    try {
      const res = await fetch(`/api/admin/cms/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchPages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/cms/pages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Cannot delete page");
        return;
      }
      fetchPages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRedirect = async (id: string) => {
    try {
      await fetch(`/api/admin/redirects?id=${id}`, { method: "DELETE" });
      fetchRedirects();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = pages.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
            Pages & Builder
          </h1>
          <p className="font-mono text-xs text-[#B9B9B4] tracking-wide mt-1">
            Manage dynamic pages, slugs, sections, redirects, and SEO metadata without touching code.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRedirectsModalOpen(true)}
            className="flex items-center gap-2 bg-[#1C1C1E] border border-[#242426] text-white hover:border-white/40 font-mono text-xs px-4 py-2.5 transition-colors"
          >
            <GitFork className="w-3.5 h-3.5 text-daxul-lime" />
            <span>Redirects ({redirects.length})</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 bg-daxul-lime text-daxul-black font-semibold text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-[#b8eb2f] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Page</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#141416] p-4 border border-[#242426]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#B9B9B4]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages by title or slug..."
            className="w-full bg-[#1C1C1E] border border-[#242426] text-xs text-white pl-9 pr-4 py-2.5 focus:outline-none focus:border-daxul-lime"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs">
          {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 transition-colors uppercase ${
                statusFilter === s
                  ? "bg-daxul-lime text-daxul-black font-bold"
                  : "bg-[#1C1C1E] text-[#B9B9B4] hover:text-white border border-[#242426]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-[#141416] border border-[#242426] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#242426] font-mono uppercase tracking-widest text-[#B9B9B4] bg-[#101012]">
              <th className="p-4">Title & Route</th>
              <th className="p-4">Status</th>
              <th className="p-4">Sections</th>
              <th className="p-4">Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242426]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center font-mono text-[#B9B9B4]">
                  Loading pages...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center font-mono text-[#B9B9B4]">
                  No pages match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((page) => (
                <tr key={page.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-daxul-lime shrink-0" />
                      <div>
                        <Link
                          href={`/admin/pages/${page.id}`}
                          className="font-bold text-sm text-white hover:text-daxul-lime transition-colors block"
                        >
                          {page.title}
                        </Link>
                        <div className="font-mono text-[11px] text-[#B9B9B4] flex items-center gap-2 mt-0.5">
                          <span>/{page.slug}</span>
                          {page.isSystem && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#242426] text-white">
                              System
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 ${
                        page.status === "PUBLISHED"
                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                          : page.status === "DRAFT"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                      }`}
                    >
                      {page.status}
                    </span>
                  </td>

                  <td className="p-4 font-mono text-[#B9B9B4]">
                    {page._count.sections} section{page._count.sections === 1 ? "" : "s"}
                  </td>

                  <td className="p-4 font-mono text-[11px] text-[#B9B9B4]">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/pages/${page.id}`}
                        className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-white hover:border-daxul-lime transition-colors text-xs font-mono uppercase px-3"
                      >
                        Edit
                      </Link>

                      {page.status === "PUBLISHED" && (
                        <a
                          href={page.slug === "home" ? "/" : `/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-white transition-colors"
                          title="View Live Page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDuplicate(page.id)}
                        className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-white transition-colors"
                        title="Duplicate Page"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!page.isSystem && (
                        <>
                          <button
                            onClick={() => handleArchive(page.id, page.status)}
                            className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-amber-400 transition-colors"
                            title={page.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(page.id, page.title)}
                            className="p-1.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-red-400 transition-colors"
                            title="Delete Page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Page Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#242426] max-w-lg w-full p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[#242426] pb-4">
              <h2 className="text-base font-bold uppercase tracking-wider text-white">
                Create New CMS Page
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-[#B9B9B4] hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/50 border border-red-500/30 text-red-400 text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-mono uppercase tracking-wider text-[#B9B9B4] mb-1.5">
                  Page Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Our Craft & Workshop"
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                />
              </div>

              <div>
                <label className="block font-mono uppercase tracking-wider text-[#B9B9B4] mb-1.5">
                  Slug Route *
                </label>
                <div className="flex items-center bg-[#1C1C1E] border border-[#242426] px-3.5">
                  <span className="font-mono text-[#71717A]">/</span>
                  <input
                    type="text"
                    required
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\/-]/g, ""))}
                    placeholder="our-craft"
                    className="w-full bg-transparent py-2.5 pl-1 text-white focus:outline-none"
                  />
                </div>
                <p className="font-mono text-[10px] text-[#71717A] mt-1">
                  Will render at /{newSlug || "your-slug"}
                </p>
              </div>

              <div>
                <label className="block font-mono uppercase tracking-wider text-[#B9B9B4] mb-1.5">
                  SEO Title (Optional)
                </label>
                <input
                  type="text"
                  value={newSeoTitle}
                  onChange={(e) => setNewSeoTitle(e.target.value)}
                  placeholder="DAXUL LABS | Studio Craft"
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                />
              </div>

              <div>
                <label className="block font-mono uppercase tracking-wider text-[#B9B9B4] mb-1.5">
                  Meta Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newSeoDesc}
                  onChange={(e) => setNewSeoDesc(e.target.value)}
                  placeholder="Explore our bespoke additive manufacturing philosophy..."
                  className="w-full bg-[#1C1C1E] border border-[#242426] px-3.5 py-2.5 text-white focus:outline-none focus:border-daxul-lime"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-[#1C1C1E] border border-[#242426] text-[#B9B9B4] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-daxul-lime text-daxul-black font-semibold uppercase tracking-wider hover:bg-[#b8eb2f] disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redirects Modal */}
      {redirectsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#242426] max-w-2xl w-full p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[#242426] pb-4">
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider text-white">
                  301 Permanent Redirects
                </h2>
                <p className="font-mono text-xs text-[#B9B9B4] mt-0.5">
                  Automatically preserved when page slugs change to avoid broken links.
                </p>
              </div>
              <button
                onClick={() => setRedirectsModalOpen(false)}
                className="text-[#B9B9B4] hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {redirects.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-[#B9B9B4]">
                  No redirects registered. Slug changes will automatically log here.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#242426] font-mono text-[#B9B9B4] uppercase">
                      <th className="p-2">From Route</th>
                      <th className="p-2">To Route</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242426]">
                    {redirects.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 font-mono text-amber-400">{r.fromPath}</td>
                        <td className="p-2 font-mono text-green-400">{r.toPath}</td>
                        <td className="p-2 font-mono text-[#B9B9B4]">{r.statusCode}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => handleDeleteRedirect(r.id)}
                            className="text-red-400 hover:text-red-300 font-mono text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#242426]">
              <button
                onClick={() => setRedirectsModalOpen(false)}
                className="px-4 py-2 bg-[#1C1C1E] border border-[#242426] text-white hover:border-white/40 font-mono text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
