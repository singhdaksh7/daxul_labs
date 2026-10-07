"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CmsHeaderContent,
  CmsHeroContent,
  CmsFeaturedProductContent,
  CmsCollectionsContent,
  CmsCustomizationContent,
  CmsLabContent,
  CmsBuildingDaxulContent,
  CmsFooterContent,
} from './cmsTypes';
import {
  DEFAULT_CMS_HEADER,
  DEFAULT_CMS_HERO,
  DEFAULT_CMS_FEATURED_PRODUCT,
  DEFAULT_CMS_COLLECTIONS,
  DEFAULT_CMS_CUSTOMIZATION,
  DEFAULT_CMS_LAB,
  DEFAULT_CMS_BUILDING_DAXUL,
  DEFAULT_CMS_FOOTER,
} from './cmsDefaults';

export interface CmsVisibilityMap {
  HEADER: boolean;
  HERO: boolean;
  FEATURED_PRODUCT: boolean;
  COLLECTIONS: boolean;
  CUSTOMIZATION: boolean;
  LAB: boolean;
  BUILDING_DAXUL: boolean;
  FOOTER: boolean;
}

export interface CmsContextType {
  header: CmsHeaderContent;
  hero: CmsHeroContent;
  featuredProduct: CmsFeaturedProductContent;
  collections: CmsCollectionsContent;
  customization: CmsCustomizationContent;
  lab: CmsLabContent;
  buildingDaxul: CmsBuildingDaxulContent;
  footer: CmsFooterContent;
  visibility: CmsVisibilityMap;
  sectionsList: { id: string; sectionKey: string; name: string; visible: boolean; sortOrder: number }[];
  isLoading: boolean;
  refetchCmsData: () => Promise<void>;
  setDraftOverrideData?: (data: any) => void;
}

const CmsContext = createContext<CmsContextType | undefined>(undefined);

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [header, setHeader] = useState<CmsHeaderContent>(DEFAULT_CMS_HEADER);
  const [hero, setHero] = useState<CmsHeroContent>(DEFAULT_CMS_HERO);
  const [featuredProduct, setFeaturedProduct] = useState<CmsFeaturedProductContent>(DEFAULT_CMS_FEATURED_PRODUCT);
  const [collections, setCollections] = useState<CmsCollectionsContent>(DEFAULT_CMS_COLLECTIONS);
  const [customization, setCustomization] = useState<CmsCustomizationContent>(DEFAULT_CMS_CUSTOMIZATION);
  const [lab, setLab] = useState<CmsLabContent>(DEFAULT_CMS_LAB);
  const [buildingDaxul, setBuildingDaxul] = useState<CmsBuildingDaxulContent>(DEFAULT_CMS_BUILDING_DAXUL);
  const [footer, setFooter] = useState<CmsFooterContent>(DEFAULT_CMS_FOOTER);
  const [visibility, setVisibility] = useState<CmsVisibilityMap>({
    HEADER: true,
    HERO: true,
    FEATURED_PRODUCT: true,
    COLLECTIONS: true,
    CUSTOMIZATION: true,
    LAB: true,
    BUILDING_DAXUL: true,
    FOOTER: true,
  });
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCmsData = async () => {
    try {
      const res = await fetch('/api/cms/published');
      if (res.ok) {
        const data = await res.json();
        if (data.header) setHeader(data.header);
        if (data.hero) setHero(data.hero);
        if (data.featuredProduct) setFeaturedProduct(data.featuredProduct);
        if (data.collections) setCollections(data.collections);
        if (data.customization) setCustomization(data.customization);
        if (data.lab) setLab(data.lab);
        if (data.buildingDaxul) setBuildingDaxul(data.buildingDaxul);
        if (data.footer) setFooter(data.footer);
        if (data.visibility) setVisibility(data.visibility);
        if (data.sectionsList) setSectionsList(data.sectionsList);
      }
    } catch (e) {
      console.warn('CmsProvider fetch warning (using standard templates):', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCmsData();
  }, []);

  const setDraftOverrideData = (data: any) => {
    if (data.header) setHeader(data.header);
    if (data.hero) setHero(data.hero);
    if (data.featuredProduct) setFeaturedProduct(data.featuredProduct);
    if (data.collections) setCollections(data.collections);
    if (data.customization) setCustomization(data.customization);
    if (data.lab) setLab(data.lab);
    if (data.buildingDaxul) setBuildingDaxul(data.buildingDaxul);
    if (data.footer) setFooter(data.footer);
    if (data.visibility) setVisibility(data.visibility);
    if (data.sectionsList) setSectionsList(data.sectionsList);
  };

  return (
    <CmsContext.Provider
      value={{
        header,
        hero,
        featuredProduct,
        collections,
        customization,
        lab,
        buildingDaxul,
        footer,
        visibility,
        sectionsList,
        isLoading,
        refetchCmsData: fetchCmsData,
        setDraftOverrideData,
      }}
    >
      {children}
    </CmsContext.Provider>
  );
};

export const useCms = () => {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return context;
};
