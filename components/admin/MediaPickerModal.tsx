"use client";

import React, { useState, useEffect } from "react";
import { CmsMediaConfig } from "@/lib/cmsTypes";
import { Upload, X, Check, Image as ImageIcon, Film, Trash2, Search } from "lucide-react";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: CmsMediaConfig) => void;
  currentMedia?: CmsMediaConfig;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelectMedia,
  currentMedia,
}: MediaPickerModalProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video">("all");

  // Custom URL inputs
  const [selectedUrl, setSelectedUrl] = useState(currentMedia?.url || "");
  const [mediaType, setMediaType] = useState<"image" | "video">(currentMedia?.mediaType || "image");
  const [altText, setAltText] = useState(currentMedia?.altText || "");
  const [posterUrl, setPosterUrl] = useState(currentMedia?.posterUrl || "");

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms/media");
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) {
      console.error("Error fetching media assets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
      setSelectedUrl(currentMedia?.url || "");
      setMediaType(currentMedia?.mediaType || "image");
      setAltText(currentMedia?.altText || "");
      setPosterUrl(currentMedia?.posterUrl || "");
    }
  }, [isOpen, currentMedia]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("altText", file.name);

      const res = await fetch("/api/admin/cms/media", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedUrl(data.url);
        setMediaType(data.asset.type);
        fetchAssets();
      } else {
        const errData = await res.json();
        alert(errData.error || "Upload failed");
      }
    } catch (err: any) {
      alert("Error uploading file: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this media asset?")) return;
    try {
      const res = await fetch(`/api/admin/cms/media?id=${assetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAssets();
      }
    } catch (e) {
      console.error("Error deleting asset:", e);
    }
  };

  const handleConfirmSelect = () => {
    if (!selectedUrl) {
      alert("Please select or enter a valid media URL.");
      return;
    }
    onSelectMedia({
      mediaType,
      url: selectedUrl,
      altText,
      posterUrl,
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true,
      fitMode: "cover",
    });
    onClose();
  };

  if (!isOpen) return null;

  const filteredAssets = assets.filter((a) => {
    const matchesType = filterType === "all" || a.type === filterType;
    const matchesSearch =
      !searchQuery ||
      a.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.altText && a.altText.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#151515] border border-[#242426] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#242426] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#C8FF35] rounded-full" />
            <h3 className="font-bold text-base uppercase tracking-wider text-white">
              CMS Media Library & Picker
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#242426]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Upload & Direct URL Controls */}
          <div className="bg-[#0B0B0C] border border-[#242426] p-4 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <label className="cursor-pointer inline-flex items-center gap-2 bg-[#C8FF35] text-[#0B0B0C] font-mono text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-white transition-colors">
                <Upload className="w-4 h-4" />
                <span>{uploading ? "Uploading..." : "Upload Image / Video"}</span>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
                <span>Max 50MB (Images: JPEG/PNG/WEBP/GIF • Videos: MP4/WEBM)</span>
              </div>
            </div>

            {/* Direct URL Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-gray-400 font-mono text-[10px] uppercase">Media URL / Path</label>
                <input
                  type="text"
                  placeholder="https://... or /uploads/filename.jpg"
                  value={selectedUrl}
                  onChange={(e) => setSelectedUrl(e.target.value)}
                  className="w-full bg-[#151515] border border-[#242426] p-2.5 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#C8FF35]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-mono text-[10px] uppercase">Media Type</label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as any)}
                  className="w-full bg-[#151515] border border-[#242426] p-2.5 rounded-xl text-white font-mono text-xs focus:outline-none"
                >
                  <option value="image">Image</option>
                  <option value="video">Video (Muted Autoplay)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-gray-400 font-mono text-[10px] uppercase">Alt Text / Description</label>
                <input
                  type="text"
                  placeholder="Descriptive alt text for accessibility & SEO"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full bg-[#151515] border border-[#242426] p-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#C8FF35]"
                />
              </div>

              {mediaType === "video" && (
                <div className="space-y-1">
                  <label className="text-gray-400 font-mono text-[10px] uppercase">Video Poster Image URL</label>
                  <input
                    type="text"
                    placeholder="Poster image URL..."
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    className="w-full bg-[#151515] border border-[#242426] p-2.5 rounded-xl text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Library Gallery Search & Filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search uploaded assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0B0C] border border-[#242426] focus:border-white pl-9 pr-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase ${
                    filterType === "all" ? "bg-[#C8FF35] text-[#0B0B0C] font-bold" : "bg-[#0B0B0C] text-gray-400"
                  }`}
                >
                  All ({assets.length})
                </button>
                <button
                  onClick={() => setFilterType("image")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase ${
                    filterType === "image" ? "bg-[#C8FF35] text-[#0B0B0C] font-bold" : "bg-[#0B0B0C] text-gray-400"
                  }`}
                >
                  Images
                </button>
                <button
                  onClick={() => setFilterType("video")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase ${
                    filterType === "video" ? "bg-[#C8FF35] text-[#0B0B0C] font-bold" : "bg-[#0B0B0C] text-gray-400"
                  }`}
                >
                  Videos
                </button>
              </div>
            </div>

            {/* Asset Grid */}
            {loading ? (
              <div className="text-center py-12 text-gray-500 text-xs font-mono">Loading assets...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 bg-[#0B0B0C] rounded-2xl border border-[#242426] text-gray-500 text-xs font-mono">
                No uploaded assets found matching search criteria.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[35vh] overflow-y-auto pr-2">
                {filteredAssets.map((asset) => {
                  const assetUrl = `/api/uploads/file/${asset.filename}`;
                  const isSelected = selectedUrl === assetUrl || selectedUrl.includes(asset.filename);

                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        setSelectedUrl(assetUrl);
                        setMediaType(asset.type);
                        setAltText(asset.altText || asset.filename);
                      }}
                      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all aspect-square bg-[#0B0B0C] ${
                        isSelected ? "border-[#C8FF35] ring-2 ring-[#C8FF35]/30" : "border-[#242426] hover:border-white"
                      }`}
                    >
                      {asset.type === "video" ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#151515]">
                          <Film className="w-8 h-8 text-[#C8FF35]" />
                        </div>
                      ) : (
                        <img
                          src={assetUrl}
                          alt={asset.filename}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Selection Overlay Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-[#C8FF35] text-[#0B0B0C] p-1 rounded-full shadow">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/80 text-red-400 hover:text-red-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute bottom-0 inset-x-0 bg-black/80 p-1.5 text-[9px] font-mono text-gray-300 truncate">
                        {asset.filename}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#242426] bg-[#0B0B0C] flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#242426] text-gray-300 rounded-xl text-xs font-mono uppercase hover:bg-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmSelect}
            className="px-6 py-2.5 bg-[#C8FF35] text-[#0B0B0C] rounded-xl text-xs font-mono font-bold uppercase hover:bg-white transition-colors"
          >
            Apply Selected Media
          </button>
        </div>

      </div>
    </div>
  );
}
