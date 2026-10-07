import {
  CmsSectionKey,
  CmsHeaderContent,
  CmsHeroContent,
  CmsFeaturedProductContent,
  CmsCollectionsContent,
  CmsCustomizationContent,
  CmsLabContent,
  CmsBuildingDaxulContent,
  CmsFooterContent,
} from './cmsTypes';

export const DEFAULT_CMS_HEADER: CmsHeaderContent = {
  logoText: 'DAXUL LABS',
  logoSubtext: 'OBJECTS MADE DIFFERENTLY',
  navItems: [
    { label: 'Shop', url: '/shop' },
    { label: 'Collections', url: '/collections' },
    { label: 'Customize', url: '/customize' },
    { label: 'Lab', url: '/lab', isLab: true },
    { label: 'About', url: '/about' },
  ],
  showStatusDot: true,
  ctaLabel: 'EXPLORE CATALOG',
  ctaUrl: '/shop',
};

export const DEFAULT_CMS_HERO: CmsHeroContent = {
  eyebrow: '01 / STUDIO EXHIBIT',
  headlineLine1: 'OBJECTS',
  headlineLine2: 'MADE',
  headlineLine3: 'DIFFERENTLY.',
  supportingCopy: 'Experimental objects, lighting and personalized design. Made in India.',
  primaryCtaLabel: 'EXPLORE OBJECTS',
  primaryCtaUrl: '/shop',
  secondaryCtaLabel: 'CREATE YOURS',
  secondaryCtaUrl: '/customize',
  media: {
    mediaType: 'image',
    url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
    altText: 'DAXUL LABS Flagship Display',
    focalPosition: 'center',
    fitMode: 'cover',
  },
};

export const DEFAULT_CMS_FEATURED_PRODUCT: CmsFeaturedProductContent = {
  badge: '02 / FEATURED DROP — DAXUL SHADOW 01 (Projection Lamp)',
  productSlug: 'daxul-shadow-01',
  customOverrideTitle: 'DAXUL SHADOW 01',
  subtitle: 'MODULAR SHADOW MONOLITH',
  headline: 'LIGHT BECOMES THE OBJECT.',
  description:
    'Casts geometric shadow patterns across dark rooms while emitting warm 2700K ambient illumination.',
  ctaLabel: 'DISCOVER SHADOW',
  ctaUrl: '/shop/daxul-shadow-01',
  media: {
    mediaType: 'image',
    url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
    altText: 'DAXUL Shadow Projection Lamp',
    focalPosition: 'center',
    fitMode: 'cover',
  },
  showPricing: true,
  showProductOptions: true,
};

export const DEFAULT_CMS_COLLECTIONS: CmsCollectionsContent = {
  sectionHeading: 'SHOP COLLECTIONS',
  eyebrow: '03 / CATALOG ARCHIVE',
  tiles: [
    {
      id: 'tile-shadow',
      title: 'SHADOW',
      slug: 'shadow-objects',
      descriptor: 'Precision lamps projecting geometric shadows.',
      destinationUrl: '/collections/shadow-objects',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
        altText: 'Shadow Collection',
      },
    },
    {
      id: 'tile-custom',
      title: 'CUSTOM',
      slug: 'personalized-couples',
      descriptor: 'Bespoke dual-perspective name monoliths & photo lithophanes.',
      destinationUrl: '/collections/personalized-couples',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop',
        altText: 'Custom Collection',
      },
    },
    {
      id: 'tile-devotion',
      title: 'DEVOTION',
      slug: 'devotional-altars',
      descriptor: 'Sacred geometry pillars and illuminated sanctuaries.',
      destinationUrl: '/collections/devotional-altars',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
        altText: 'Devotion Collection',
      },
    },
    {
      id: 'tile-desk',
      title: 'DESK',
      slug: 'desk-objects',
      descriptor: 'Architectural cable docks, trays & workspace artifacts.',
      destinationUrl: '/collections/desk-objects',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1000&auto=format&fit=crop',
        altText: 'Desk Collection',
      },
    },
    {
      id: 'tile-lab',
      title: 'LAB',
      slug: 'collectibles-kinetic',
      descriptor: 'Experimental print-in-place kinetic sculptures & limited runs.',
      destinationUrl: '/collections/collectibles-kinetic',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
        altText: 'Lab Collection',
      },
    },
  ],
};

export const DEFAULT_CMS_CUSTOMIZATION: CmsCustomizationContent = {
  headline: 'MAKE IT YOURS.',
  supportingCopy: 'Upload a photo, silhouette, logo or idea. We turn it into a physical object.',
  ctaLabel: 'START CUSTOMIZING',
  ctaUrl: '/customize',
  steps: [
    {
      id: 'step-1',
      num: '01',
      title: 'Upload',
      desc: 'Provide your portrait photo, vector silhouette, or raw concept.',
    },
    {
      id: 'step-2',
      num: '02',
      title: 'Customize',
      desc: 'Configure finish textures, LED light output, and base inscriptions.',
    },
    {
      id: 'step-3',
      num: '03',
      title: 'We Design',
      desc: 'Our studio converts your input into 3D light-refracting geometry.',
    },
    {
      id: 'step-4',
      num: '04',
      title: 'We Make',
      desc: 'Layer-by-layer 3D additive build, hand-finished in India.',
    },
  ],
  media: {
    mediaType: 'image',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop',
    altText: 'Bespoke Custom Monolith Proof',
  },
};

export const DEFAULT_CMS_LAB: CmsLabContent = {
  heading: 'DAXUL LAB',
  copy: "Experiments. Prototypes. Things that probably shouldn't exist — until they do.",
  ctaLabel: 'ENTER THE LAB',
  ctaUrl: '/lab',
  badgeText: '05 / R&D DISPATCH',
  media: {
    mediaType: 'image',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
    altText: 'DAXUL LAB Kinetic Sphere',
  },
};

export const DEFAULT_CMS_BUILDING_DAXUL: CmsBuildingDaxulContent = {
  heading: 'BUILDING DAXUL LABS',
  supportingCopy: 'From our first machine to our first objects.',
  socialHandle: '@daxul.labs',
  handleUrl: 'https://instagram.com/daxullabs',
  tiles: [
    {
      id: 'b-tile-1',
      tag: '01 / MACHINES',
      title: 'First Machine',
      description: 'Custom multi-axis FDM printer setup and bed thermal calibration.',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1000&auto=format&fit=crop',
        altText: 'First Machine',
      },
    },
    {
      id: 'b-tile-2',
      tag: '02 / EXPERIMENTS',
      title: 'Prototype 001',
      description: 'Initial light diffraction test using internal 3D printed lithophane lattice.',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop',
        altText: 'Prototype 001',
      },
    },
    {
      id: 'b-tile-3',
      tag: '03 / PROCESS',
      title: 'Behind the Build',
      description: 'Hand assembly of COB LED modules, brass fittings, and final optical QC.',
      media: {
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
        altText: 'Behind the Build',
      },
    },
  ],
};

export const DEFAULT_CMS_FOOTER: CmsFooterContent = {
  wordmarkText: 'DAXUL LABS',
  tagline: 'Objects made differently.',
  copyrightLine: '© 2026 DAXUL LABS',
  madeInIndiaText: 'Made in India.',
  whatsAppUrl: 'https://wa.me/919876543210',
  instagramUrl: 'https://instagram.com/daxullabs',
  columns: [
    {
      id: 'col-shop',
      heading: 'SHOP',
      links: [
        { label: 'Shadow', url: '/collections/shadow-objects' },
        { label: 'Custom', url: '/collections/personalized-couples' },
        { label: 'Devotion', url: '/collections/devotional-altars' },
        { label: 'Desk', url: '/collections/desk-objects' },
        { label: 'Lab', url: '/lab' },
      ],
    },
    {
      id: 'col-daxul',
      heading: 'DAXUL',
      links: [
        { label: 'About', url: '/about' },
        { label: 'Journal', url: '/lab' },
        { label: 'Contact', url: 'mailto:studio@daxullabs.com' },
      ],
    },
    {
      id: 'col-help',
      heading: 'HELP',
      links: [
        { label: 'Shipping', url: '/policies/shipping' },
        { label: 'Returns', url: '/policies/return' },
        { label: 'FAQ', url: '/about#faq' },
        { label: 'Track Order', url: '/track' },
      ],
    },
    {
      id: 'col-social',
      heading: 'SOCIAL',
      links: [
        { label: 'Instagram', url: 'https://instagram.com/daxullabs' },
        { label: 'WhatsApp', url: 'https://wa.me/919876543210' },
      ],
    },
  ],
};

export const DEFAULT_HOMEPAGE_SECTIONS_LIST = [
  {
    sectionKey: 'HEADER' as CmsSectionKey,
    sectionType: 'HEADER',
    name: 'Header & Navigation',
    sortOrder: 1,
    visible: true,
    content: DEFAULT_CMS_HEADER,
  },
  {
    sectionKey: 'HERO' as CmsSectionKey,
    sectionType: 'HERO',
    name: 'Hero Showcase',
    sortOrder: 2,
    visible: true,
    content: DEFAULT_CMS_HERO,
  },
  {
    sectionKey: 'FEATURED_PRODUCT' as CmsSectionKey,
    sectionType: 'FEATURED_PRODUCT',
    name: 'Featured Flagship Drop',
    sortOrder: 3,
    visible: true,
    content: DEFAULT_CMS_FEATURED_PRODUCT,
  },
  {
    sectionKey: 'COLLECTIONS' as CmsSectionKey,
    sectionType: 'COLLECTIONS',
    name: 'Shop Collections Archive',
    sortOrder: 4,
    visible: true,
    content: DEFAULT_CMS_COLLECTIONS,
  },
  {
    sectionKey: 'CUSTOMIZATION' as CmsSectionKey,
    sectionType: 'CUSTOMIZATION',
    name: 'Customization Studio',
    sortOrder: 5,
    visible: true,
    content: DEFAULT_CMS_CUSTOMIZATION,
  },
  {
    sectionKey: 'LAB' as CmsSectionKey,
    sectionType: 'LAB',
    name: 'DAXUL Lab R&D Dispatch',
    sortOrder: 6,
    visible: true,
    content: DEFAULT_CMS_LAB,
  },
  {
    sectionKey: 'BUILDING_DAXUL' as CmsSectionKey,
    sectionType: 'BUILDING_DAXUL',
    name: 'Building DAXUL Chronicles',
    sortOrder: 7,
    visible: true,
    content: DEFAULT_CMS_BUILDING_DAXUL,
  },
  {
    sectionKey: 'FOOTER' as CmsSectionKey,
    sectionType: 'FOOTER',
    name: 'Footer',
    sortOrder: 8,
    visible: true,
    content: DEFAULT_CMS_FOOTER,
  },
];
