export type CustomFieldType = 'text' | 'textarea' | 'photo' | 'date' | 'color' | 'select';

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[]; // For select dropdown or color options
  fee: number;
  placeholder?: string;
  helpText?: string;
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
