import {
  Product,
  Collection,
  HomepageSection,
  ThemeSettings,
  SiteSettings,
  Coupon,
  CustomerReview,
  Order,
  BusinessCosts,
} from './types';

export function calculateUnitCost(costs: BusinessCosts): number {
  const filamentCost = (costs.filamentGrams || 0) * (costs.filamentCostPerGram || 0);
  return Number(
    (filamentCost + (costs.hardwareCost || 0) + (costs.packagingCost || 0) + (costs.otherMaterialCost || 0)).toFixed(2)
  );
}

export function calculateProfit(price: number, costs: BusinessCosts): number {
  const unitCost = calculateUnitCost(costs);
  return Number((price - unitCost).toFixed(2));
}

export function calculateMargin(price: number, costs: BusinessCosts): number {
  if (!price || price === 0) return 0;
  const profit = calculateProfit(price, costs);
  return Number(((profit / price) * 100).toFixed(1));
}

export const INITIAL_THEME_SETTINGS: ThemeSettings = {
  backgroundColor: '#0B0B0C',
  cardBackgroundColor: '#151515',
  accentColor: '#C8FF35',
  textColor: '#FFFFFF',
  secondaryTextColor: '#B9B9B4',
  buttonColor: '#C8FF35',
  buttonTextColor: '#0B0B0C',
  fontFamily: 'var(--font-geist-sans), sans-serif',
  headingSizeMultiplier: 1,
  borderRadius: 'md',
  cardStyle: 'glass',
};

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  announcementBarText: 'ON-DEMAND PRODUCTION • FREE SHIPPING ON ORDERS OVER ₹1999',
  announcementBarEnabled: true,
  brandName: 'DAXUL LABS',
  brandTagline: 'Objects Made Differently.',
  brandDescription:
    'DAXUL LABS is an independent 3D design studio in India creating minimal lighting objects, personalized monoliths, devotional altars, and workspace decor.',
  contactEmail: 'studio@daxullabs.com',
  contactPhone: '+91 98765 43210',
  whatsAppNumber: '+919876543210',
  instagramUrl: 'https://instagram.com/daxullabs',
  footerText: '© 2026 DAXUL LABS. CRAFTED ON-DEMAND IN INDIA.',
  standardShippingFee: 99,
  expressShippingFee: 199,
  freeShippingThreshold: 1999,
  codFee: 50,
  globalCodEnabled: true,
  currencySymbol: '₹',
  currencyCode: 'INR',
  seoTitle: 'DAXUL LABS | Designed 3D Printed Objects & Projection Lamps',
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
  customizationStep1Title: '1. Upload & Input',
  customizationStep1Desc: 'Upload a portrait photo, logo, or enter custom names and dates.',
  customizationStep2Title: '2. 3D Design Proof',
  customizationStep2Desc: 'Our studio generates a 3D light-refracting model proof.',
  customizationStep3Title: '3. Precision Printing',
  customizationStep3Desc: 'Crafted layer-by-layer using high-density organic biopolymers.',
  customizationStep4Title: '4. Finishing & Delivery',
  customizationStep4Desc: 'Hand-finished, LED electronics tested, and dispatched to your door.',
  orderStatusLabels: {
    new: 'Order Placed',
    design_pending: 'Design Pending',
    design_approved: 'Design Approved',
    printing: '3D Printing',
    finishing: 'Hand Finishing',
    qc: 'Quality Control',
    packed: 'Packed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  },
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'DAXUL SHADOW 01',
    slug: 'daxul-shadow-01',
    category: 'Shadow Objects',
    price: 2499,
    compareAtPrice: 2999,
    description:
      'Warm ambient shadow projection lamp. When illuminated, inner micro-structured walls project sharp geometric shadows across your room.',
    story:
      'Designed in-house. Features a 360-degree rotating cylinder core with a warm 2700K COB LED module for atmospheric night lighting.',
    specs: [
      { label: 'Dimensions', value: '120mm x 120mm x 220mm' },
      { label: 'Material', value: 'Matte Charcoal Bio-PETG & Warm Brass' },
      { label: 'Light Source', value: 'Warm 2700K Dimmable COB LED' },
      { label: 'Power', value: 'USB-C Cable (Included)' },
      { label: 'Production Time', value: '2-3 Days' },
    ],
    careInstructions: [
      'Wipe clean with dry microfiber cloth.',
      'Keep away from heat sources above 65°C.',
      'Use included USB-C cable for optimal power.',
    ],
    faq: [
      {
        question: 'How far does the shadow project?',
        answer: 'The projection stays crisp up to 3 meters in dark rooms.',
      },
      {
        question: 'Is the LED dimmable?',
        answer: 'Yes, it features a capacitive touch dimmer on the base.',
      },
    ],
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1000&auto=format&fit=crop',
    ],
    badge: 'Flagship Object',
    stock: 24,
    productionTimeDays: 2,
    estimatedDispatchDays: 3,
    prepaidOnly: false,
    codEnabled: true,
    finishes: ['Matte Charcoal', 'Obsidian Black', 'Chalk White'],
    colors: ['Warm Gold LED (2700K)', 'Amber Neon LED (2200K)'],
    sizes: ['Standard (220mm)', 'Grand (300mm)'],
    customFields: [
      {
        id: 'field-lamp-photo',
        label: 'Photo / Silhouette Upload',
        type: 'photo',
        required: true,
        fee: 300,
        helpText: 'Upload a portrait photo to engrave into the projection lithophane.',
      },
      {
        id: 'field-lamp-name1',
        label: 'First Name',
        type: 'text',
        required: true,
        fee: 0,
        placeholder: 'e.g. ROHAN',
      },
      {
        id: 'field-lamp-name2',
        label: 'Second Name',
        type: 'text',
        required: true,
        fee: 0,
        placeholder: 'e.g. PRIYA',
      },
      {
        id: 'field-lamp-date',
        label: 'Special Date',
        type: 'date',
        required: false,
        fee: 0,
      },
      {
        id: 'field-lamp-msg',
        label: 'Base Inscription',
        type: 'textarea',
        required: false,
        fee: 150,
        placeholder: 'Enter up to 50 characters for base etching...',
      },
    ],
    businessCosts: {
      filamentGrams: 320,
      printHours: 18,
      filamentCostPerGram: 1.5,
      hardwareCost: 350,
      packagingCost: 120,
      otherMaterialCost: 50,
    },
    isFeatured: true,
  },
  {
    id: 'prod-2',
    name: 'DAXUL CUSTOM Couple Monolith',
    slug: 'daxul-custom-couple-monolith',
    category: 'Couples',
    price: 1899,
    compareAtPrice: 2299,
    description:
      'Dual personalized names blended into a single 3D infinity ribbon sculpture reading Name A from the left and Name B from the right.',
    story:
      'Generative design sculpture calculated from overlapping perspective vectors of two partner names.',
    specs: [
      { label: 'Dimensions', value: '180mm x 60mm x 80mm' },
      { label: 'Material', value: 'High-Density Architectural PLA Black' },
      { label: 'Weight', value: '240g' },
    ],
    careInstructions: ['Wipe clean with dry cloth.', 'Keep away from direct high heat.'],
    faq: [
      {
        question: 'What is the maximum name length?',
        answer: 'Up to 10 characters per name work best.',
      },
    ],
    images: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop',
    ],
    badge: 'Popular Gift',
    stock: 40,
    productionTimeDays: 1,
    estimatedDispatchDays: 2,
    prepaidOnly: true,
    codEnabled: false,
    finishes: ['Volcanic Black', 'Graphite Sand', 'Chalk White'],
    colors: ['Charcoal Black', 'Bone White'],
    sizes: ['Compact (180mm)', 'Desk Statement (240mm)'],
    customFields: [
      {
        id: 'field-cpl-namea',
        label: 'Partner A Name',
        type: 'text',
        required: true,
        fee: 0,
        placeholder: 'e.g. ROHAN',
      },
      {
        id: 'field-cpl-nameb',
        label: 'Partner B Name',
        type: 'text',
        required: true,
        fee: 0,
        placeholder: 'e.g. PRIYA',
      },
      {
        id: 'field-cpl-date',
        label: 'Anniversary Date',
        type: 'date',
        required: false,
        fee: 0,
      },
    ],
    businessCosts: {
      filamentGrams: 210,
      printHours: 12,
      filamentCostPerGram: 1.5,
      hardwareCost: 50,
      packagingCost: 90,
      otherMaterialCost: 35,
    },
    isFeatured: true,
  },
  {
    id: 'prod-3',
    name: 'DAXUL DEVOTION Mahadev Pillar',
    slug: 'daxul-devotion-mahadev-pillar',
    category: 'Devotional',
    price: 2799,
    compareAtPrice: 3499,
    description:
      'A multi-layered 3D light pillar featuring concentric yantra geometries and glowing backlit deity silhouette.',
    story:
      'Designed with traditional sacred proportions and rendered with 3D additive lattice layers for soft sanctuary light.',
    specs: [
      { label: 'Dimensions', value: '140mm x 140mm x 260mm' },
      { label: 'Material', value: 'Satin Dark Polymer' },
      { label: 'Lighting', value: 'Soft Amber LED (2200K)' },
    ],
    careInstructions: ['Dust gently with soft brush.', 'Do not submerge in water.'],
    faq: [
      {
        question: 'Can I add a custom family nameplate?',
        answer: 'Yes, add text to the optional nameplate field below.',
      },
    ],
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
    ],
    badge: 'Popular',
    stock: 18,
    productionTimeDays: 3,
    estimatedDispatchDays: 4,
    prepaidOnly: false,
    codEnabled: true,
    finishes: ['Midnight Black', 'Slate Gray'],
    colors: ['Amber Sanctuary (2200K)', 'Warm Gold (2700K)'],
    sizes: ['Altar Size (260mm)'],
    customFields: [
      {
        id: 'field-dev-nameplate',
        label: 'Optional Family Nameplate',
        type: 'text',
        required: false,
        fee: 200,
        placeholder: 'e.g. SHARMA FAMILY',
      },
    ],
    businessCosts: {
      filamentGrams: 380,
      printHours: 22,
      filamentCostPerGram: 1.5,
      hardwareCost: 380,
      packagingCost: 150,
      otherMaterialCost: 60,
    },
    isFeatured: true,
  },
  {
    id: 'prod-4',
    name: 'DAXUL KEY RING Gyroid',
    slug: 'daxul-key-ring-gyroid',
    category: 'Keychains',
    price: 499,
    compareAtPrice: 699,
    description:
      'Durable 3D printed keychain with an open gyroid structure for lightweight tactile feel.',
    story:
      'Engineered from high-impact flexible polymer. Weighs 14g while providing extreme durability.',
    specs: [
      { label: 'Weight', value: '14g' },
      { label: 'Material', value: 'Impact Tough TPU / PETG' },
      { label: 'Hardware', value: 'Black Anodized Ring' },
    ],
    careInstructions: ['Washable with warm water.'],
    faq: [{ question: 'Is it scratch resistant?', answer: 'Yes, printed in high impact tough polymer.' }],
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
    ],
    badge: 'New Release',
    stock: 150,
    productionTimeDays: 1,
    estimatedDispatchDays: 2,
    prepaidOnly: false,
    codEnabled: true,
    finishes: ['Stealth Black', 'Electric Lime', 'Graphite Gray'],
    colors: ['Stealth Black', 'Electric Lime'],
    sizes: ['Compact (50mm)'],
    customFields: [
      {
        id: 'field-kc-namea',
        label: 'Custom Name / Monogram',
        type: 'text',
        required: true,
        fee: 0,
        placeholder: 'e.g. DAX',
      },
    ],
    businessCosts: {
      filamentGrams: 22,
      printHours: 1.5,
      filamentCostPerGram: 1.5,
      hardwareCost: 25,
      packagingCost: 20,
      otherMaterialCost: 10,
    },
    isFeatured: true,
  },
  {
    id: 'prod-5',
    name: 'DAXUL DESK Wave Organiser',
    slug: 'daxul-desk-wave-organiser',
    category: 'Desk Objects',
    price: 1499,
    compareAtPrice: 1899,
    description:
      'Parametric desk tray with magnetic cable slots, pen docks, and smartphone rest.',
    story:
      'Organizes desk clutter with organic wave ridges printed in renewable bio-polymer.',
    specs: [
      { label: 'Dimensions', value: '220mm x 100mm x 75mm' },
      { label: 'Cable Slots', value: '3x Slots (up to 6mm cables)' },
    ],
    careInstructions: ['Wipe clean with damp cloth.'],
    faq: [{ question: 'Does it fit thick braided cables?', answer: 'Yes, supports cables up to 6mm.' }],
    images: [
      'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1000&auto=format&fit=crop',
    ],
    badge: 'Workspace',
    stock: 32,
    productionTimeDays: 2,
    estimatedDispatchDays: 3,
    prepaidOnly: false,
    codEnabled: true,
    finishes: ['Matte Charcoal', 'Bone White'],
    colors: ['Obsidian Black', 'Chalk White'],
    sizes: ['Standard Desk (220mm)'],
    customFields: [],
    businessCosts: {
      filamentGrams: 310,
      printHours: 14,
      filamentCostPerGram: 1.5,
      hardwareCost: 80,
      packagingCost: 80,
      otherMaterialCost: 30,
    },
    isFeatured: false,
  },
  {
    id: 'prod-6',
    name: 'DAXUL LAB Kinetic Sphere',
    slug: 'daxul-lab-kinetic-sphere',
    category: 'Collectibles',
    price: 3299,
    compareAtPrice: 3999,
    description:
      'A non-assembly print-in-place kinetic sculpture. Concentric lattice rings spin fluidly around a central axis.',
    story:
      'Printed as a single continuous mechanical object with 0.2mm internal mechanical clearances.',
    specs: [
      { label: 'Dimensions', value: '140mm x 140mm x 140mm' },
      { label: 'Technique', value: 'Print-in-Place Mechanics' },
    ],
    careInstructions: ['Do not drop on hard stone surfaces.'],
    faq: [{ question: 'Is it assembled by hand?', answer: 'No, printed as 1 continuous moving object.' }],
    images: [
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1000&auto=format&fit=crop',
    ],
    badge: 'Limited Run',
    stock: 12,
    productionTimeDays: 3,
    estimatedDispatchDays: 4,
    prepaidOnly: true,
    codEnabled: false,
    finishes: ['Dual-Tone Lime/Black', 'Satin Black'],
    colors: ['Stealth Black & Lime'],
    sizes: ['140mm Sphere'],
    customFields: [],
    businessCosts: {
      filamentGrams: 290,
      printHours: 20,
      filamentCostPerGram: 1.5,
      hardwareCost: 220,
      packagingCost: 140,
      otherMaterialCost: 65,
    },
    isFeatured: true,
  },
];

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: 'Shadow Objects',
    slug: 'shadow-objects',
    description: 'Precision lamps that project geometric shadows across dark rooms.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
    badge: 'Flagship Series',
    featured: true,
  },
  {
    id: 'col-2',
    name: 'Personalized & Couples',
    slug: 'personalized-couples',
    description: 'Dual-perspective name monoliths and custom photo lithophanes.',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop',
    badge: 'Bespoke Gifts',
    featured: true,
  },
  {
    id: 'col-3',
    name: 'Devotional Altars',
    slug: 'devotional-altars',
    description: 'Sacred geometry pillars and backlit mantra sanctuaries.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
    badge: 'Sacred Series',
    featured: true,
  },
  {
    id: 'col-4',
    name: 'Desk Objects',
    slug: 'desk-objects',
    description: 'Architectural organizers, cable docks, and desk sculptures.',
    image: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1000&auto=format&fit=crop',
    badge: 'Workspace',
    featured: true,
  },
  {
    id: 'col-5',
    name: 'Collectibles & Kinetic',
    slug: 'collectibles-kinetic',
    description: 'Non-assembly print-in-place kinetic sculptures and mathematical art.',
    image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
    badge: 'Limited Runs',
    featured: true,
  },
  {
    id: 'col-6',
    name: 'Custom Keychains',
    slug: 'custom-keychains',
    description: 'Parametric key rings and tactile everyday items.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    badge: 'Everyday Carry',
    featured: true,
  },
];

export const INITIAL_SECTIONS: HomepageSection[] = [
  {
    id: 'sec-hero',
    type: 'hero',
    title: 'Objects made differently.',
    subtitle: 'ON-DEMAND 3D PRINTING • INDEPENDENT DESIGN STUDIO',
    badgeText: 'DAXUL LABS STUDIO',
    content:
      'Design-led light objects, projection lamps, customized monoliths, and minimal desk objects crafted on-demand in India.',
    ctaText: 'Explore Objects',
    ctaUrl: '/shop',
    secondaryCtaText: 'Customize Yours',
    secondaryCtaUrl: '/customize',
    mediaUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
    isVisible: true,
    order: 1,
  },
  {
    id: 'sec-flagship',
    type: 'flagship',
    title: 'DAXUL SHADOW 01',
    subtitle: 'PROJECTION LAMP',
    badgeText: 'FLAGSHIP OBJECT',
    content:
      'Casts geometric shadow patterns across dark rooms while emitting warm 2700K ambient illumination.',
    ctaText: 'View Details',
    ctaUrl: '/shop/daxul-shadow-01',
    secondaryCtaText: 'Customize',
    secondaryCtaUrl: '/shop/daxul-shadow-01',
    mediaUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
    isVisible: true,
    order: 2,
  },
  {
    id: 'sec-collections',
    type: 'collections',
    title: 'SHOP COLLECTIONS',
    subtitle: 'CURATED CATEGORIES',
    badgeText: 'TAXONOMY',
    content: 'Select from our specialized 3D printing series.',
    ctaText: 'View All Collections',
    ctaUrl: '/collections',
    mediaUrl: '',
    isVisible: true,
    order: 3,
  },
  {
    id: 'sec-customize',
    type: 'customize',
    title: 'Customize Your Object.',
    subtitle: 'BESPOKE 3D PRINTING',
    badgeText: 'CUSTOM STUDIO',
    content:
      'Upload a photo, custom names, or anniversaries — we translate your input into a physical light object.',
    ctaText: 'Start Custom Builder',
    ctaUrl: '/customize',
    mediaUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop',
    isVisible: true,
    order: 4,
  },
  {
    id: 'sec-lab',
    type: 'lab_spotlight',
    title: 'Inside DAXUL LAB',
    subtitle: 'R&D & PROCESS',
    badgeText: 'LAB DISPATCH',
    content:
      'We experiment with gyroid infill geometry, print-in-place mechanics, and bio-polymers.',
    ctaText: 'Enter The Lab',
    ctaUrl: '/lab',
    mediaUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
    isVisible: true,
    order: 5,
  },
  {
    id: 'sec-drops',
    type: 'new_drops',
    title: 'New Drops & Popular Objects',
    subtitle: 'ACTIVE CATALOG',
    badgeText: 'RELEASED',
    content: 'Explore our latest releases and popular personalized objects.',
    ctaText: 'Browse All Objects',
    ctaUrl: '/shop',
    mediaUrl: '',
    isVisible: true,
    order: 6,
  },
  {
    id: 'sec-newsletter',
    type: 'newsletter',
    title: 'Join The Studio Dispatch',
    subtitle: 'NEW DROPS & LAB DISPATCHES',
    badgeText: 'DISPATCH',
    content: 'Subscribe to receive updates on limited edition object drops.',
    ctaText: 'Subscribe',
    ctaUrl: '#subscribe',
    mediaUrl: '',
    isVisible: true,
    order: 7,
  },
];

export const INITIAL_REVIEWS: CustomerReview[] = [];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'DAXUL10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 999,
    isActive: true,
  },
];

export const INITIAL_ORDERS: Order[] = [];
