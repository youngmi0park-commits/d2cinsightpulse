/**
 * LG Dotcom Banner Copy Reference Library
 * Sourced from lge.com/us and lge.com/uk hero banners (March 2026)
 * Used as style/tone references for AI-generated marketing copy
 */

export interface BannerReference {
  region: "US" | "UK";
  category: string;
  kicker: string;
  headline: string;
  subCopy: string;
  cta: string;
  tone: "promotional" | "aspirational" | "technical" | "emotional" | "playful";
}

export const BANNER_COPY_REFERENCES: BannerReference[] = [
  // ─── US Banners ───
  {
    region: "US",
    category: "TV",
    kicker: "INTRODUCING",
    headline: "Our brightest OLED ever, the new G6 powered by Hyper Radiant Color Tech",
    subCopy: "Now 3.9x brighter, with reflection free premium, perfect black and perfect color, all powered by our advanced α11 Dual engine AI processor.",
    cta: "Preorder Now",
    tone: "technical",
  },
  {
    region: "US",
    category: "Home Appliances",
    kicker: "HOME APPLIANCES TOP DEALS",
    headline: "Save 30-53% on America's Most Reliable & #1 Appliance Brand",
    subCopy: "Designed for modern living and built to last, explore our Top Deals on select appliances. Plus, enjoy free installation on select dishwashers, cooking appliances and laundry.",
    cta: "Shop Now",
    tone: "promotional",
  },
  {
    region: "US",
    category: "Monitor",
    kicker: "SPRING SAVINGS",
    headline: "Step into the future of gaming with a top-performing UltraGear™",
    subCopy: "Give your gaming a spring refresh with up to 40% off vivid picture quality and breakneck speeds up to 480Hz.",
    cta: "Shop Now",
    tone: "aspirational",
  },
  {
    region: "US",
    category: "Washer",
    kicker: "ONLINE EXCLUSIVE",
    headline: "Premium performance for king-sized loads",
    subCopy: "Complete with advanced features like AI Wash and Dry, experience next-level care with LG laundry appliances.",
    cta: "Shop Now",
    tone: "aspirational",
  },
  {
    region: "US",
    category: "Home Appliances",
    kicker: "",
    headline: "Buy more & save up to $800 on an all-star appliance bundle",
    subCopy: "Buy more and save on America's Most Reliable and #1 Appliance Brand. Plus, free installation on select cooking appliances, dishwashers and laundry.",
    cta: "Shop Now",
    tone: "promotional",
  },
  {
    region: "US",
    category: "Monitor",
    kicker: "",
    headline: "Introducing the World's Largest 5K2K Gaming Monitor",
    subCopy: "",
    cta: "Preorder Now",
    tone: "technical",
  },

  // ─── UK Banners ───
  {
    region: "UK",
    category: "Washer",
    kicker: "Dirty Happens. Cleaning is on us.",
    headline: "6 months free Ecover products",
    subCopy: "Claim free detergent and softener or dish tablets when you buy selected washing machines, washer dryers or dishwashers.",
    cta: "Buy Now",
    tone: "playful",
  },
  {
    region: "UK",
    category: "TV",
    kicker: "Limited time only!",
    headline: "Up to £500 cashback on selected LG TVs",
    subCopy: "Enjoy 6 or 12 months interest-free financing on all orders over £1000.",
    cta: "Buy Now",
    tone: "promotional",
  },
  {
    region: "UK",
    category: "Monitor",
    kicker: "Pre-Order LG UltraGear OLED G7",
    headline: "Race towards the Horizon at 720Hz",
    subCopy: "Get set for Forza Horizon 6 with the new LG UltraGear OLED G7 and get a second monitor free.",
    cta: "Pre-Order",
    tone: "aspirational",
  },
  {
    region: "UK",
    category: "Home Appliances",
    kicker: "Save up to £100 on Trade-up",
    headline: "Elevate your home space",
    subCopy: "with Black Edition's appliances. Selected models including AI-powered washers and InstaView fridges.",
    cta: "Buy Now",
    tone: "aspirational",
  },
  {
    region: "UK",
    category: "TV",
    kicker: "",
    headline: "Up to 50% off Soundbars when you buy an LG TV",
    subCopy: "",
    cta: "Buy Now",
    tone: "promotional",
  },
  {
    region: "UK",
    category: "General",
    kicker: "",
    headline: "Upgrade your tech with LG Flex",
    subCopy: "Premium LG products on a flexible, cancel anytime subscription, powered by Raylo.",
    cta: "Subscribe Now",
    tone: "aspirational",
  },
  {
    region: "UK",
    category: "TV",
    kicker: "",
    headline: "The most reliable TV brand",
    subCopy: "awarded by Which?",
    cta: "Buy Now",
    tone: "emotional",
  },
  {
    region: "UK",
    category: "General",
    kicker: "",
    headline: "Refer-a-friend",
    subCopy: "Give 10% off, Get 10% off",
    cta: "Learn More",
    tone: "playful",
  },
  {
    region: "UK",
    category: "General",
    kicker: "",
    headline: "Great offers",
    subCopy: "Exclusive offers only on LG.com",
    cta: "Buy Now",
    tone: "promotional",
  },
];

/** Headline pattern templates inspired by dotcom banners */
export const HEADLINE_PATTERNS = {
  technical: [
    (product: string, feature: string) => `${product}. Powered by ${feature}.`,
    (product: string, feature: string) => `Introducing ${product} — ${feature} Redefined.`,
    (product: string, feature: string) => `${product}. Next-gen ${feature} technology.`,
    (product: string, feature: string) => `Experience ${feature} with the new ${product}.`,
  ],
  aspirational: [
    (product: string, feature: string) => `${product}. ${feature} You'll Love.`,
    (product: string, feature: string) => `Step into the future with ${product}.`,
    (product: string, feature: string) => `Elevate your space with ${product}.`,
    (product: string, feature: string) => `${product}. ${feature} That Stands Out.`,
  ],
  promotional: [
    (product: string, feature: string) => `${product}. Loved for ${feature}.`,
    (product: string, feature: string) => `Discover why users choose ${product}.`,
    (product: string, feature: string) => `${product} — ${feature} Delivered.`,
    (product: string, feature: string) => `${product}. Users praise ${feature}.`,
  ],
  emotional: [
    (product: string, feature: string) => `${product}. ${feature} comprovada.`,
    (product: string, feature: string) => `${product}. Trusted for ${feature}.`,
    (product: string, feature: string) => `Why users love the ${product}.`,
    (product: string, feature: string) => `${product}. Real reviews, real ${feature}.`,
  ],
  playful: [
    (product: string, feature: string) => `${product} — Because ${feature} matters.`,
    (product: string, feature: string) => `Meet your new favorite: ${product}.`,
    (product: string, feature: string) => `${product}. ${feature}, simplified.`,
    (product: string, feature: string) => `Life's good with ${product}.`,
  ],
};

/** Get a random headline from a tone pattern */
export function getPatternHeadline(
  tone: BannerReference["tone"],
  product: string,
  feature: string,
  seed?: number
): string {
  const patterns = HEADLINE_PATTERNS[tone];
  const idx = seed !== undefined ? seed % patterns.length : Math.floor(Math.random() * patterns.length);
  return patterns[idx](product, feature);
}

/** Get reference banners filtered by category */
export function getReferencesByCategory(category: string): BannerReference[] {
  const normalized = category.toLowerCase();
  return BANNER_COPY_REFERENCES.filter(
    (b) => b.category.toLowerCase() === normalized || b.category === "General"
  );
}

/** Get reference banners filtered by region */
export function getReferencesByRegion(region: "US" | "UK"): BannerReference[] {
  return BANNER_COPY_REFERENCES.filter((b) => b.region === region);
}
