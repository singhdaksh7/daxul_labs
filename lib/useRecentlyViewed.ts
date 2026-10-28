"use client";

import { useState, useEffect, useCallback } from "react";
import type { StoreProduct } from "./types";

const RECENTLY_VIEWED_KEY = "daxul_recently_viewed_v2";
const MAX_RECENT = 8;

interface StoredView {
  id: string;
  timestamp: number;
}

export function useRecentlyViewed(currentProductId?: string) {
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Record view of current product
  useEffect(() => {
    if (!isMounted || !currentProductId) return;

    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      let list: StoredView[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      // Remove any existing entry for this product and add to front
      list = [
        { id: currentProductId, timestamp: Date.now() },
        ...list.filter((x) => x && typeof x.id === "string" && x.id !== currentProductId),
      ].slice(0, MAX_RECENT);

      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch {
      // localStorage unavailable or restricted
    }
  }, [currentProductId, isMounted]);

  // Load and hydrate items from live DB
  const loadItems = useCallback(async () => {
    if (!isMounted) return;

    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (!raw) {
        setItems([]);
        return;
      }

      const list: StoredView[] = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) {
        setItems([]);
        return;
      }

      // Filter out current product from the display list if on PDP
      const idsToFetch = list
        .map((x) => x.id)
        .filter((id) => id && id !== currentProductId)
        .slice(0, MAX_RECENT);

      if (idsToFetch.length === 0) {
        setItems([]);
        return;
      }

      setLoading(true);
      const res = await fetch("/api/products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToFetch }),
      });

      if (!res.ok) throw new Error("Failed to hydrate recently viewed");
      const data = await res.json();
      setItems(data.products || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentProductId, isMounted]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const clearRecentlyViewed = useCallback(() => {
    try {
      localStorage.removeItem(RECENTLY_VIEWED_KEY);
    } catch {
      // ignore
    }
    setItems([]);
  }, []);

  return {
    items,
    loading,
    isMounted,
    clearRecentlyViewed,
  };
}
