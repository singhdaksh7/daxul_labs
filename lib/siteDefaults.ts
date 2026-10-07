/** Client-safe defaults (no DB imports). Used as fallbacks when the database is unavailable. */
import type { PublicSiteSettings, StorefrontTheme } from './types';

export const DEFAULT_THEME: StorefrontTheme = {
  carbonColor: '#0B0B0C',
  boneColor: '#F3F0E9',
  graphiteColor: '#242426',
  accentColor: '#C8FF35',
  buttonRadius: 'md',
  borderRadius: 'md',
};

export const DEFAULT_TEXT = {
  brandDescription:
    'DAXUL LABS is an independent 3D design studio in India creating minimal lighting objects, personalized monoliths, devotional altars, and workspace decor.',
  seoDescription:
    'Independent Indian design brand crafting shadow projection lamps, personalized couple monoliths, devotional altars, and minimal desk objects.',
  shippingPolicyText:
    'All DAXUL LABS products are manufactured on-demand. Production takes 2-4 business days. Standard courier delivery takes 3-5 business days across India.',
  returnPolicyText:
    'We offer a 7-day replacement guarantee for items damaged in transit or defective electronic LED components. Personalized custom products are eligible for replacement if defective.',
  privacyPolicyText:
    'Customer uploaded photos and custom inscriptions are strictly processed for order fulfillment and stored securely.',
  termsConditionsText:
    'By ordering from DAXUL LABS, you agree to our custom on-demand production schedules and handcrafted tolerance guidelines.',
  cancellationPolicyText:
    'Orders can be cancelled within 6 hours of placement before 3D slicing begins. Custom orders in active 3D printing cannot be cancelled.',
};

export const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  announcementBarText: 'ON-DEMAND PRODUCTION • FREE SHIPPING ON ORDERS OVER ₹1999',
  announcementBarEnabled: true,
  brandName: 'DAXUL LABS',
  brandTagline: 'Objects Made Differently.',
  brandDescription: DEFAULT_TEXT.brandDescription,
  contactEmail: 'studio@daxullabs.com',
  contactPhone: '+91 98765 43210',
  whatsAppNumber: '+919876543210',
  instagramUrl: 'https://instagram.com/daxullabs',
  whatsAppUrl: null,
  youtubeUrl: null,
  facebookUrl: null,
  footerText: '© 2026 DAXUL LABS. CRAFTED ON-DEMAND IN INDIA.',
  standardShippingFee: 99,
  expressShippingFee: 199,
  freeShippingThreshold: 1999,
  codFee: 50,
  codFeeEnabled: true,
  globalCodEnabled: true,
  customProductsPrepaidOnly: true,
  currencySymbol: '₹',
  currencyCode: 'INR',
  supportHours: null,
  seoTitle: 'DAXUL LABS | Designed 3D Printed Objects & Projection Lamps',
  seoDescription: DEFAULT_TEXT.seoDescription,
  defaultOgImage: null,
  searchIndexingEnabled: true,
  customizationStep1Title: '1. Upload & Input',
  customizationStep1Desc: 'Upload a portrait photo, logo, or enter custom names and dates.',
  customizationStep2Title: '2. 3D Design Proof',
  customizationStep2Desc: 'Our studio generates a 3D light-refracting model proof.',
  customizationStep3Title: '3. Precision Printing',
  customizationStep3Desc: 'Crafted layer-by-layer using high-density organic biopolymers.',
  customizationStep4Title: '4. Finishing & Delivery',
  customizationStep4Desc: 'Hand-finished, LED electronics tested, and dispatched to your door.',
};
