"use client";

import { useState, useEffect, useCallback } from "react";

const WISHLIST_STORAGE_KEY = "daxul_wishlist";
const WISHLIST_EVENT = "daxul_wishlist_updated";

function getLocalWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalWishlist(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(WISHLIST_EVENT));
  } catch {
    // ignore
  }
}

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    setWishlistIds(getLocalWishlist());
  }, []);

  useEffect(() => {
    refresh();
    setIsLoaded(true);

    const onUpdate = () => refresh();
    window.addEventListener(WISHLIST_EVENT, onUpdate);

    // Sync with DB if logged in
    fetch("/api/account/wishlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.wishlist && Array.isArray(data.wishlist)) {
          const dbIds: string[] = data.wishlist.map((p: any) => p.id);
          const localIds = getLocalWishlist();
          // Merge local into DB
          const missingInDb = localIds.filter((id) => !dbIds.includes(id));
          missingInDb.forEach((id) => {
            fetch("/api/account/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: id }),
            }).catch(() => {});
          });
          const merged = Array.from(new Set([...dbIds, ...localIds]));
          saveLocalWishlist(merged);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener(WISHLIST_EVENT, onUpdate);
  }, [refresh]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const current = getLocalWishlist();
      const exists = current.includes(productId);
      const next = exists ? current.filter((id) => id !== productId) : [...current, productId];

      saveLocalWishlist(next);

      // Best effort DB sync if authenticated
      if (exists) {
        fetch(`/api/account/wishlist?productId=${encodeURIComponent(productId)}`, {
          method: "DELETE",
        }).catch(() => {});
      } else {
        fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        }).catch(() => {});
      }

      return !exists;
    },
    []
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  return { wishlistIds, isWishlisted, toggleWishlist, isLoaded };
}
