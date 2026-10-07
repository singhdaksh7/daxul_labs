export type CmsSectionKey =
  | 'HEADER'
  | 'HERO'
  | 'FEATURED_PRODUCT'
  | 'COLLECTIONS'
  | 'CUSTOMIZATION'
  | 'LAB'
  | 'BUILDING_DAXUL'
  | 'FOOTER';

export interface CmsHeaderContent {
  logoText: string;
  logoSubtext: string;
  logoImage?: string;
  navItems: { label: string; url: string; isLab?: boolean }[];
  showStatusDot: boolean;
  ctaLabel: string;
  ctaUrl: string;
}

export interface CmsMediaConfig {
  mediaType: 'image' | 'video';
  url: string;
  altText?: string;
  focalPosition?: string; // "center", "top", "bottom"
  fitMode?: 'cover' | 'contain';
  posterUrl?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
}

export interface CmsHeroContent {
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  headlineLine3: string;
  supportingCopy: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  media: CmsMediaConfig;
}

export interface CmsFeaturedProductContent {
  badge: string;
  productSlug: string;
  customOverrideTitle?: string;
  subtitle: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  media: CmsMediaConfig;
  showPricing: boolean;
  showProductOptions: boolean;
}

export interface CmsCollectionTile {
  id: string;
  title: string;
  slug: string;
  descriptor: string;
  destinationUrl: string;
  media: CmsMediaConfig;
}

export interface CmsCollectionsContent {
  sectionHeading: string;
  eyebrow: string;
  tiles: CmsCollectionTile[];
}

export interface CmsCustomizationStep {
  id: string;
  num: string;
  title: string;
  desc: string;
}

export interface CmsCustomizationContent {
  headline: string;
  supportingCopy: string;
  ctaLabel: string;
  ctaUrl: string;
  steps: CmsCustomizationStep[];
  media: CmsMediaConfig;
}

export interface CmsLabContent {
  heading: string;
  copy: string;
  ctaLabel: string;
  ctaUrl: string;
  badgeText: string;
  media: CmsMediaConfig;
}

export interface CmsBuildingDaxulTile {
  id: string;
  tag: string;
  title: string;
  description: string;
  media: CmsMediaConfig;
}

export interface CmsBuildingDaxulContent {
  heading: string;
  supportingCopy: string;
  socialHandle: string;
  handleUrl: string;
  tiles: CmsBuildingDaxulTile[];
}

export interface CmsFooterLink {
  label: string;
  url: string;
}

export interface CmsFooterColumn {
  id: string;
  heading: string;
  links: CmsFooterLink[];
}

export interface CmsFooterContent {
  wordmarkText: string;
  tagline: string;
  copyrightLine: string;
  madeInIndiaText: string;
  whatsAppUrl: string;
  instagramUrl: string;
  columns: CmsFooterColumn[];
}

export interface CmsSectionRecord {
  id: string;
  sectionKey: CmsSectionKey;
  sectionType: string;
  name: string;
  visible: boolean;
  sortOrder: number;
  draftContent: any;
  publishedContent: any;
  draftSettings?: any;
  publishedSettings?: any;
  createdAt: string;
  updatedAt: string;
}
