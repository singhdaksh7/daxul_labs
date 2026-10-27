import { CmsMediaConfig } from '@/lib/cmsTypes';

export type PageSectionType =
  | 'HERO'
  | 'HERO_CAROUSEL'
  | 'BANNER'
  | 'TEXT'
  | 'IMAGE_TEXT'
  | 'PRODUCT_GRID'
  | 'COLLECTION_GRID'
  | 'FEATURED_PRODUCT'
  | 'GALLERY'
  | 'VIDEO'
  | 'CTA'
  | 'STATS'
  | 'TABS'
  | 'FAQ'
  | 'TESTIMONIALS'
  | 'CUSTOMIZATION'
  | 'BRAND_STATEMENT'
  | 'INSTAGRAM'
  | 'NEWSLETTER'
  | 'CONTACT'
  | 'SPACER';

export interface HeroBannerSlide {
  id: string;
  name: string;
  placement: string;
  text: string;
  eyebrow?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  body?: string | null;
  buttonText?: string | null;
  linkUrl?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  desktopImage?: string | null;
  mobileImage?: string | null;
  videoUrl?: string | null;
  desktopImageMediaId?: string | null;
  mobileImageMediaId?: string | null;
  videoMediaId?: string | null;
  textAlign?: 'left' | 'center' | 'right';
  textMode?: 'dark' | 'light';
  overlay?: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  startDate?: string | null;
  endDate?: string | null;
  priority?: number;
  visible?: boolean;
}

export interface HeroCarouselSectionContent {
  eyebrow?: string;
  heading?: string;
  autoplay?: boolean;
  interval?: number; // ms, default 5500
  showArrows?: boolean;
  showDots?: boolean;
  transitionStyle?: 'subtle';
  heightPreset?: 'default' | 'tall' | 'compact' | 'fullscreen';
  selectedBannerIds?: string[];
  fallbackToStatic?: boolean;
}

export interface HeroSectionContent {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  body?: string;
  desktopImage?: string;
  mobileImage?: string;
  videoUrl?: string;
  overlay?: boolean;
  textAlignment?: 'left' | 'center' | 'right';
  cta1Label?: string;
  cta1Link?: string;
  cta2Label?: string;
  cta2Link?: string;
}

export interface BannerSectionContent {
  text: string;
  subtext?: string;
  desktopImage?: string;
  mobileImage?: string;
  linkUrl?: string;
  buttonText?: string;
  accentStyle?: 'graphite' | 'lime' | 'bone' | 'black';
}

export interface TextSectionContent {
  heading?: string;
  eyebrow?: string;
  body: string; // Safe markdown
  align?: 'left' | 'center' | 'right';
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
}

export interface ImageTextSectionContent {
  eyebrow?: string;
  heading: string;
  description: string; // Safe markdown
  image: string;
  imageAlt?: string;
  imagePosition?: 'left' | 'right';
  ctaLabel?: string;
  ctaLink?: string;
  secondaryCtaLabel?: string;
  secondaryCtaLink?: string;
}

export interface ProductGridSectionContent {
  heading: string;
  description?: string;
  productIds?: string[]; // IDs chosen by Admin
  sortMode?: 'featured' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number;
  ctaLabel?: string;
  ctaLink?: string;
}

export interface CollectionGridSectionContent {
  heading: string;
  description?: string;
  collectionIds?: string[];
  layout?: '2-col' | '3-col' | '4-col';
  ctaLabel?: string;
  ctaLink?: string;
}

export interface FeaturedProductSectionContent {
  productId?: string;
  badge?: string;
  overrideHeadline?: string;
  overrideSubtitle?: string;
  overrideDescription?: string;
  ctaLabel?: string;
  ctaLink?: string;
  mediaOverride?: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  type?: 'image' | 'video';
  altText?: string;
  caption?: string;
  linkUrl?: string;
}

export interface GallerySectionContent {
  heading?: string;
  description?: string;
  items: GalleryItem[];
  layout?: 'grid' | 'masonry' | 'carousel' | '2-col' | '3-col' | '4-col';
}

export interface VideoSectionContent {
  heading?: string;
  caption?: string;
  videoUrl: string;
  posterImage?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
}

export interface CtaSectionContent {
  heading: string;
  text?: string;
  backgroundMode?: 'graphite' | 'carbon' | 'bone' | 'lime';
  image?: string;
  buttonLabel: string;
  buttonUrl: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
  description?: string;
}

export interface StatsSectionContent {
  heading?: string;
  eyebrow?: string;
  items: StatItem[];
}

export interface TabItem {
  id: string;
  label: string;
  content: string; // Safe markdown
  image?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export interface TabsSectionContent {
  heading?: string;
  description?: string;
  tabs: TabItem[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string; // Safe markdown
}

export interface FaqSectionContent {
  heading: string;
  eyebrow?: string;
  items: FaqItem[];
}

export interface TestimonialItem {
  id: string;
  name: string;
  quote: string;
  image?: string;
  location?: string;
  rating?: number;
}

export interface TestimonialsSectionContent {
  heading?: string;
  eyebrow?: string;
  items: TestimonialItem[];
}

export interface CustomizationStepItem {
  id: string;
  num: string;
  title: string;
  desc: string;
}

export interface CustomizationSectionContent {
  headline: string;
  supportingCopy?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  steps: CustomizationStepItem[];
  media?: CmsMediaConfig;
}

export interface BrandStatementSectionContent {
  accentTag?: string;
  headline: string;
  paragraph?: string;
  quoteAuthor?: string;
  quoteRole?: string;
}

export interface InstagramImage {
  id: string;
  url: string;
  link?: string;
  caption?: string;
}

export interface InstagramSectionContent {
  heading: string;
  handle: string;
  handleUrl: string;
  images: InstagramImage[];
}

export interface NewsletterSectionContent {
  heading: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
}

export interface ContactSectionContent {
  heading: string;
  description?: string;
  email?: string;
  phone?: string;
  whatsApp?: string;
  address?: string;
  mapLink?: string;
  showForm?: boolean;
}

export interface SpacerSectionContent {
  heightDesktop?: number; // pixels
  heightMobile?: number; // pixels
  showDivider?: boolean;
}

export type AnySectionContent =
  | HeroSectionContent
  | HeroCarouselSectionContent
  | BannerSectionContent
  | TextSectionContent
  | ImageTextSectionContent
  | ProductGridSectionContent
  | CollectionGridSectionContent
  | FeaturedProductSectionContent
  | GallerySectionContent
  | VideoSectionContent
  | CtaSectionContent
  | StatsSectionContent
  | TabsSectionContent
  | FaqSectionContent
  | TestimonialsSectionContent
  | CustomizationSectionContent
  | BrandStatementSectionContent
  | InstagramSectionContent
  | NewsletterSectionContent
  | ContactSectionContent
  | SpacerSectionContent;

export interface CmsSectionData {
  id: string;
  pageId: string;
  type: PageSectionType;
  name?: string | null;
  sortOrder: number;
  visible: boolean;
  draftContent: AnySectionContent;
  publishedContent: AnySectionContent;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CmsPageData {
  id: string;
  title: string;
  slug: string;
  parentPageId?: string | null;
  isSystem: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  noIndex: boolean;
  sections?: CmsSectionData[];
  createdAt: string;
  updatedAt: string;
}

export interface NavigationItemData {
  id: string;
  menuId: string;
  parentId?: string | null;
  label: string;
  url: string;
  pageId?: string | null;
  openNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
  children?: NavigationItemData[];
}

export interface NavigationMenuData {
  id: string;
  handle: string;
  name: string;
  items: NavigationItemData[];
}
