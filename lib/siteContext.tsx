"use client";

import React, { createContext, useContext } from 'react';
import type { PublicSiteSettings } from './types';
import { DEFAULT_PUBLIC_SETTINGS } from './siteDefaults';

export interface SearchIndexItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string;
}

interface SiteContextType {
  settings: PublicSiteSettings;
  searchIndex: SearchIndexItem[];
}

const SiteContext = createContext<SiteContextType>({
  settings: DEFAULT_PUBLIC_SETTINGS,
  searchIndex: [],
});

/** Hydrated by app/layout.tsx (server) with DB-backed settings. */
export function SiteProvider({
  settings,
  searchIndex,
  children,
}: {
  settings: PublicSiteSettings;
  searchIndex: SearchIndexItem[];
  children: React.ReactNode;
}) {
  return <SiteContext.Provider value={{ settings, searchIndex }}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextType {
  return useContext(SiteContext);
}

export function useSiteSettings(): PublicSiteSettings {
  return useContext(SiteContext).settings;
}
