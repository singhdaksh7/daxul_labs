export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'photo'
  | 'image'
  | 'file'
  | 'date'
  | 'color'
  | 'select'
  | 'radio';

/** A priced choice for select/radio custom fields (from CustomField.choices). */
export interface FieldChoice {
  label: string;
  value: string;
  priceAdjustment: number;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[]; // For select dropdown or color options
  fee: number;
  placeholder?: string;
  helpText?: string;
  choices?: FieldChoice[]; // select/radio: priced choices (derived from options when absent)
}

export interface BusinessCosts {
  filamentGrams: number;
  printHours: number;
  filamentCostPerGram: number; // e.g. 0.03 ($ or ₹)
  hardwareCost: number;       // e.g. LED module, acrylic, magnets
  packagingCost: number;      // e.g. custom foam, box
  otherMaterialCost: number;   // e.g. box, stickers
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string; // e.g. "Shadow Objects", "Personalized", "Couples", "Devotional", "Desk Objects", "Collectibles"
  price: number;
  compareAtPrice?: number;
  description: string;
  story: string;
  specs: { label: string; value: string }[];
  careInstructions: string[];
  faq: { question: string; answer: string }[];
  images: string[];
  videoUrl?: string;
  badge?: string; // e.g. "Flagship", "Bestseller", "New Drop", "Limited Edition"
  stock: number;
  productionTimeDays: number;
  estimatedDispatchDays: number;
  prepaidOnly: boolean;
  codEnabled: boolean;
  finishes: string[];
  colors: string[];
  sizes: string[];
  customFields: CustomFieldConfig[];
  businessCosts: BusinessCosts;
  isArchived?: boolean;
  isFeatured?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  badge?: string;
  featured: boolean;
}

export type ManufacturingStatus =
  | 'new'
  | 'design_pending'
  | 'design_approved'
  | 'printing'
  | 'finishing'
  | 'qc'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  selectedFinish?: string;
  selectedColor?: string;
  selectedSize?: string;
  customizations: Record<string, string>;
  customizationFee: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  codFee: number;
  paymentMethod: 'prepaid' | 'cod';
  paymentStatus: 'paid' | 'pending' | 'failed';
  status: ManufacturingStatus;
  statusHistory: { status: ManufacturingStatus; timestamp: string; note?: string }[];
  qcNotes?: string;
  trackingNumber?: string;
  courierName?: string;
  proofImageUrl?: string;
}

export interface HomepageSection {
  id: string;
  type:
    | 'hero'
    | 'flagship'
    | 'collections'
    | 'customize'
    | 'lab_spotlight'
    | 'how_it_works'
    | 'new_drops'
    | 'reviews'
    | 'instagram'
    | 'newsletter';
  title: string;
  subtitle: string;
  badgeText: string;
  content: string;
  ctaText: string;
  ctaUrl: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  mediaUrl: string;
  secondaryMediaUrl?: string;
  isVisible: boolean;
  order: number;
}

export interface ThemeSettings {
  backgroundColor: string;
  cardBackgroundColor: string;
  accentColor: string;
  textColor: string;
  secondaryTextColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  headingSizeMultiplier: number;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  cardStyle: 'minimal' | 'glass' | 'bordered';
}

export interface SiteSettings {
  announcementBarText: string;
  announcementBarEnabled: boolean;
  brandName: string;
  brandTagline: string;
  brandDescription: string;
  contactEmail: string;
  contactPhone: string;
  whatsAppNumber: string;
  instagramUrl: string;
  footerText: string;
  standardShippingFee: number;
  expressShippingFee: number;
  freeShippingThreshold: number;
  codFee: number;
  globalCodEnabled: boolean;
  currencySymbol: string;
  currencyCode: string;
  seoTitle: string;
  seoDescription: string;
  shippingPolicyText: string;
  returnPolicyText: string;
  privacyPolicyText: string;
  termsConditionsText: string;
  cancellationPolicyText: string;
  customizationStep1Title: string;
  customizationStep1Desc: string;
  customizationStep2Title: string;
  customizationStep2Desc: string;
  customizationStep3Title: string;
  customizationStep3Desc: string;
  customizationStep4Title: string;
  customizationStep4Desc: string;
  orderStatusLabels: Record<ManufacturingStatus, string>;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  isActive: boolean;
}

export interface CustomerReview {
  id: string;
  author: string;
  location: string;
  rating: number;
  productName: string;
  comment: string;
  date: string;
  verified: boolean;
}

// ---------------------------------------------------------------------------
// Storefront (database-backed, customer-safe) shapes. These NEVER carry
// businessCosts or any other internal data.
// ---------------------------------------------------------------------------

export interface StoreVariant {
  id: string;
  name: string;
  sku?: string;
  priceAdjustment: number;
  inStock: boolean;
}

export interface StoreVariantGroup {
  id: string;
  name: string;
  variants: StoreVariant[];
}

export interface StoreProduct extends Omit<Product, 'businessCosts'> {
  subtitle?: string;
  sku?: string;
  customizable: boolean;
  trackInventory: boolean;
  inStock: boolean;
  materials?: string;
  dimensions?: string;
  leadTimeText?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  collectionId?: string;
  collectionSlug?: string;
  collectionName?: string;
  variantGroups: StoreVariantGroup[];
  updatedAt?: string;
}

export interface StoreCollection extends Collection {
  heroMedia?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  productCount: number;
}

export interface StorePolicyDoc {
  slug: string;
  title: string;
  content: string;
  updatedAt?: string;
}

/** Public subset of SiteSettings that is safe to ship to the browser. */
export interface PublicSiteSettings {
  announcementBarText: string;
  announcementBarEnabled: boolean;
  brandName: string;
  brandTagline: string;
  brandDescription: string;
  contactEmail: string;
  contactPhone: string;
  whatsAppNumber: string;
  instagramUrl: string;
  whatsAppUrl: string | null;
  youtubeUrl: string | null;
  facebookUrl: string | null;
  footerText: string;
  standardShippingFee: number;
  expressShippingFee: number;
  standardShippingEnabled: boolean;
  expressShippingEnabled: boolean;
  freeShippingThreshold: number;
  codFee: number;
  codFeeEnabled: boolean;
  globalCodEnabled: boolean;
  customProductsPrepaidOnly: boolean;
  currencySymbol: string;
  currencyCode: string;
  supportHours: string | null;
  seoTitle: string;
  seoDescription: string;
  defaultOgImage: string | null;
  searchIndexingEnabled: boolean;
  customizationStep1Title: string;
  customizationStep1Desc: string;
  customizationStep2Title: string;
  customizationStep2Desc: string;
  customizationStep3Title: string;
  customizationStep3Desc: string;
  customizationStep4Title: string;
  customizationStep4Desc: string;
}

export type RadiusPreset = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface StorefrontTheme {
  carbonColor: string;
  boneColor: string;
  graphiteColor: string;
  accentColor: string;
  buttonRadius: RadiusPreset;
  borderRadius: RadiusPreset;
}
