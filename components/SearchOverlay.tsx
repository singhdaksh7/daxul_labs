"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Clock, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/cartPricing";
import { useSiteSettings } from "@/lib/siteContext";

interface SearchResultProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  category: string;
  sku?: string | null;
  image: string;
  stock: number;
  inStock: boolean;
  badge?: string | null;
  customizable: boolean;
}

interface SearchResultCollection {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_SEARCHES_KEY = "daxul_recent_searches_v2";

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const settings = useSiteSettings();
  const money = (n: number) => formatMoney(settings.currencySymbol, n);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SearchResultProduct[]>([]);
  const [collections, setCollections] = useState<SearchResultCollection[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 5));
      }
    } catch {
      // Storage unavailable
    }
  }, [isOpen]);

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecentSearches((prev) => {
      const updated = [clean, ...prev.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

  // Debounce query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute Search V2 against live API
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setProducts([]);
      setCollections([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    let isCancelled = false;

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!isCancelled) {
          setProducts(data.products || []);
          setCollections(data.collections || []);
          setSelectedIndex(-1);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setProducts([]);
          setCollections([]);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setDebouncedQuery("");
      setProducts([]);
      setCollections([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Global / Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Keyboard navigation within search items
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = products.length + collections.length;
    if (totalItems === 0) {
      if (e.key === "Enter" && query.trim().length >= 2) {
        saveRecentSearch(query);
        onClose();
        router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < products.length) {
        const item = products[selectedIndex];
        saveRecentSearch(item.name);
        onClose();
        router.push(`/shop/${item.slug}`);
      } else if (selectedIndex >= products.length) {
        const col = collections[selectedIndex - products.length];
        saveRecentSearch(col.name);
        onClose();
        router.push(`/collections/${col.slug}`);
      } else if (query.trim().length >= 2) {
        saveRecentSearch(query);
        onClose();
        router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleItemClick = (name: string) => {
    saveRecentSearch(name);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-daxul-black/60 backdrop-blur-sm flex flex-col items-center justify-start pt-16 sm:pt-24 px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-daxul-bone border border-daxul-black/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-daxul-black/10 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-daxul-black/60 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search objects, lithophane lamps, materials, SKU..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-daxul-black placeholder:text-[#71717A]/60 focus:outline-none"
            aria-label="Search Catalog"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-daxul-black/20 border-t-daxul-black rounded-full animate-spin shrink-0" />
          )}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-daxul-black/40 hover:text-daxul-black"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-1 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-daxul-black/60 hover:text-daxul-black border border-daxul-black/15 hover:border-daxul-black rounded-md transition-colors"
          >
            Esc
          </button>
        </div>

        {/* Results / Empty / Recent Search Tray */}
        <div ref={resultsRef} className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Query < 2 chars: Show Recent & Popular Suggestions */}
          {debouncedQuery.length < 2 && (
            <div className="space-y-6">
              {recentSearches.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="hover:text-daxul-black underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(term)}
                        className="px-3 py-1.5 bg-white border border-daxul-black/10 hover:border-daxul-black text-xs font-medium text-daxul-black rounded-full transition-colors flex items-center gap-1.5"
                      >
                        <span>{term}</span>
                        <ArrowRight className="w-3 h-3 text-[#71717A]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-daxul-black" />
                  Popular Categories
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Shadow Lamps", "Custom Lithophanes", "Desk Objects", "Biopolymers", "Projection"].map(
                    (tag) => (
                      <button
                        key={tag}
                        onClick={() => setQuery(tag)}
                        className="px-3 py-1.5 bg-white border border-daxul-black/10 hover:border-daxul-black text-xs font-medium text-daxul-black rounded-full transition-colors"
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Query: Zero Results */}
          {debouncedQuery.length >= 2 && !loading && products.length === 0 && collections.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-semibold uppercase text-daxul-black">
                No objects found matching &ldquo;{debouncedQuery}&rdquo;
              </p>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Check your spelling or explore all objects in our catalog.
              </p>
              <div className="pt-2">
                <Link
                  href="/shop"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-daxul-black text-daxul-bone text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-daxul-black/85 transition-colors"
                >
                  <span>Browse Full Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Active Query: Results */}
          {(products.length > 0 || collections.length > 0) && (
            <div className="space-y-5">
              {/* Matching Collections */}
              {collections.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A] font-semibold">
                    Collections ({collections.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {collections.map((col, idx) => {
                      const isSelected = selectedIndex === products.length + idx;
                      return (
                        <Link
                          key={col.id}
                          href={`/collections/${col.slug}`}
                          onClick={() => handleItemClick(col.name)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-daxul-black text-daxul-bone border-daxul-black"
                              : "bg-white border-daxul-black/10 hover:border-daxul-black text-daxul-black"
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wide truncate">{col.name}</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching Products */}
              {products.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A] font-semibold flex items-center justify-between">
                    <span>Objects ({products.length})</span>
                    <span className="text-[10px] lowercase text-[#71717A]/80 font-normal">navigate with ↑ ↓ ↵</span>
                  </div>
                  <div className="divide-y divide-daxul-black/10 border border-daxul-black/10 rounded-xl overflow-hidden bg-white">
                    {products.map((item, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <Link
                          key={item.id}
                          href={`/shop/${item.slug}`}
                          onClick={() => handleItemClick(item.name)}
                          className={`flex items-center gap-3.5 p-3 transition-colors ${
                            isSelected ? "bg-daxul-lime/25" : "hover:bg-[#FAF8F5]"
                          }`}
                        >
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-lg bg-[#EAE5DA] shrink-0 border border-daxul-black/10"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#EAE5DA] shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider truncate">
                                {item.category}
                              </span>
                              {item.sku && (
                                <span className="text-[9px] font-mono text-[#71717A]/70 uppercase">
                                  SKU: {item.sku}
                                </span>
                              )}
                              {!item.inStock && (
                                <span className="text-[9px] font-mono uppercase text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                  Out of Stock
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-daxul-black truncate">
                              {item.name}
                            </h4>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-black text-daxul-black">
                              {money(item.price)}
                            </div>
                            {item.compareAtPrice && item.compareAtPrice > item.price && (
                              <div className="text-[10px] text-[#71717A] line-through">
                                {money(item.compareAtPrice)}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="p-3 bg-[#EAE5DA] border-t border-daxul-black/10 flex items-center justify-between text-[11px] font-mono text-[#71717A]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Select
            </span>
            <span className="hidden sm:inline">↑↓ Navigate</span>
            <span>Esc Close</span>
          </div>
          {debouncedQuery.length >= 2 && (
            <Link
              href={`/shop?q=${encodeURIComponent(debouncedQuery)}`}
              onClick={() => {
                saveRecentSearch(debouncedQuery);
                onClose();
              }}
              className="text-daxul-black font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all results</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
