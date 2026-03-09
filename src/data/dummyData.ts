export interface Review {
  id: string;
  source: "reddit" | "amazon" | "rtings" | "trusted_reviews" | "consumer_reports" | "cnet" | "trustpilot" | "bestreviews";
  author: string;
  text: string;
  date: string;
  rating?: number;
  sentiment?: "positive" | "negative" | "neutral";
  score?: number;
}

export type ProductCategory = "TV" | "Monitor" | "Laptop" | "Home Appliance" | "Projector";

export interface ProductData {
  name: string;
  displayName: string;
  category: ProductCategory;
  reviews: Review[];
}

export const dummyProducts: Record<string, ProductData> = {
  "OLED97G5WUA": {
    name: "OLED97G5WUA",
    displayName: "LG OLED evo AI G5 97\"",
    category: "TV",
    reviews: [
      { id: "g5-1", source: "reddit", author: "u/tv_enthusiast", text: "The LG OLED evo G5 is absolutely stunning. The picture quality with Hyper Radiant Color Tech is unreal. HDR content looks amazing and the blacks are truly infinite. Best TV I've ever owned!", date: "2026-02-15", sentiment: "positive", score: 0.95 },
      { id: "g5-2", source: "reddit", author: "u/home_theater_guy", text: "Gaming on the G5 is incredible. 4K 144Hz with VRR and near-zero input lag. The α11 AI processor upscaling is noticeably better than previous gen. Worth every penny.", date: "2026-01-20", sentiment: "positive", score: 0.91 },
      { id: "g5-3", source: "amazon", author: "TechReviewer99", text: "Great TV overall but I'm worried about burn-in. Had my previous OLED for 3 years and started seeing some retention. LG says they improved it but time will tell.", date: "2025-12-05", rating: 4, sentiment: "neutral", score: 0.45 },
      { id: "g5-4", source: "amazon", author: "MovieBuff2025", text: "The webOS interface is slow and bloated. Too many ads on the home screen. The picture is great but the software experience is frustrating.", date: "2025-11-18", rating: 3, sentiment: "negative", score: 0.2 },
      { id: "g5-5", source: "reddit", author: "u/budget_buyer", text: "Reflection Free Premium coating is a game changer. No more glare from windows. At this price point, absolutely no competition for bright room viewing.", date: "2026-01-01", sentiment: "positive", score: 0.88 },
      { id: "g5-6", source: "amazon", author: "SoundLover", text: "Built-in speakers are disappointing for a TV at this price. Had to buy a separate soundbar. The TV itself is gorgeous though.", date: "2025-10-22", rating: 3, sentiment: "negative", score: 0.25 },
      { id: "g5-7", source: "reddit", author: "u/color_accurate", text: "Color accuracy out of the box is phenomenal. Filmmaker mode is perfect. The 3.9x brightness improvement over last gen really shows in HDR highlights.", date: "2026-02-01", sentiment: "positive", score: 0.93 },
      { id: "g5-8", source: "amazon", author: "EarlyAdopter", text: "Absolutely love this TV. Setup was easy, picture is breathtaking, and the ultra-thin Gallery design looks amazing on the wall. Five stars!", date: "2025-12-30", rating: 5, sentiment: "positive", score: 0.96 },
      { id: "g5-9", source: "rtings", author: "RTINGS.com", text: "The LG G5 earns our highest score for an OLED TV. Outstanding HDR peak brightness, near-perfect color accuracy, and excellent reflection handling make it the best choice for most viewing environments.", date: "2026-02-20", rating: 5, sentiment: "positive", score: 0.97 },
      { id: "g5-10", source: "trusted_reviews", author: "Trusted Reviews", text: "LG's G5 is the pinnacle of OLED technology. The Hyper Radiant Color Tech delivers stunning HDR highlights, though the webOS interface still feels cluttered with ads.", date: "2026-01-25", rating: 4, sentiment: "positive", score: 0.85 },
      { id: "g5-11", source: "consumer_reports", author: "Consumer Reports", text: "Top-rated in our TV testing. Exceptional picture quality across all content types. The anti-reflection coating is the best we've tested. Loses points for mediocre built-in audio.", date: "2026-02-10", rating: 5, sentiment: "positive", score: 0.92 },
    ],
  },
  "52G930B-B": {
    name: "52G930B-B",
    displayName: "LG UltraGear evo G9 52\"",
    category: "Monitor",
    reviews: [
      { id: "ug-1", source: "reddit", author: "u/pcmr_elite", text: "The world's largest 5K2K gaming monitor lives up to the hype. 52 inches of curved immersion at 240Hz. This thing is absolutely incredible for sim racing and RPGs.", date: "2026-02-10", sentiment: "positive", score: 0.94 },
      { id: "ug-2", source: "reddit", author: "u/fps_addict", text: "240Hz at this size is buttery smooth. Response time is excellent. The OLED panel delivers perfect blacks. Best gaming monitor I've ever used, period.", date: "2026-01-28", sentiment: "positive", score: 0.92 },
      { id: "ug-3", source: "amazon", author: "DeskSetupKing", text: "This monitor is massive. Make sure you have a desk that can handle it. The stand is sturdy but takes up a lot of space. Picture quality is amazing though.", date: "2026-01-15", rating: 4, sentiment: "neutral", score: 0.55 },
      { id: "ug-4", source: "amazon", author: "BudgetGamer", text: "Way too expensive for most people. The price is absolutely insane. Great monitor but hard to justify unless you're a hardcore enthusiast.", date: "2025-12-20", rating: 3, sentiment: "negative", score: 0.22 },
      { id: "ug-5", source: "reddit", author: "u/ultrawide_fan", text: "5K2K resolution gives you so much screen real estate for productivity too. I use it for coding during the day and gaming at night. Dual purpose perfection.", date: "2026-02-05", sentiment: "positive", score: 0.89 },
      { id: "ug-6", source: "amazon", author: "DigitalTrendsReader", text: "Digital Trends Readers' Choice winner for good reason. The curve is immersive without being disorienting. HDR gaming on this is next level.", date: "2026-01-08", rating: 5, sentiment: "positive", score: 0.93 },
      { id: "ug-7", source: "rtings", author: "RTINGS.com", text: "Best gaming monitor we've tested. Exceptional motion handling at 240Hz, near-instant response times, and perfect blacks. The 52-inch size is ideal for immersive gaming from couch distance.", date: "2026-02-18", rating: 5, sentiment: "positive", score: 0.96 },
      { id: "ug-8", source: "trusted_reviews", author: "Trusted Reviews", text: "A remarkable feat of engineering. The UltraGear G9 52\" delivers console-quality immersion with PC-grade performance. Only downside is the steep price tag.", date: "2026-01-30", rating: 4, sentiment: "positive", score: 0.88 },
      { id: "ug-9", source: "cnet", author: "CNET", text: "LG's 52-inch OLED gaming monitor is a dream for enthusiasts. 240Hz refresh rate with HDMI 2.1 and DisplayPort 2.1 covers all bases. Editor's Choice award.", date: "2026-02-12", rating: 5, sentiment: "positive", score: 0.94 },
    ],
  },
  "17Z90TL-H.AUB9U1": {
    name: "17Z90TL-H.AUB9U1",
    displayName: "LG gram 17\" Copilot+ PC",
    category: "Laptop",
    reviews: [
      { id: "gr-1", source: "reddit", author: "u/ultralight_fan", text: "At 1.35kg for a 17-inch laptop, the gram 17 is engineering magic. I carry it everywhere and my back thanks me. Battery lasts all day too.", date: "2026-01-10", sentiment: "positive", score: 0.92 },
      { id: "gr-2", source: "amazon", author: "BusinessPro", text: "Perfect for productivity. The large 16:10 screen is great for spreadsheets. Keyboard feel is decent but trackpad could be better.", date: "2025-12-15", rating: 4, sentiment: "positive", score: 0.72 },
      { id: "gr-3", source: "reddit", author: "u/gamer_lite", text: "Don't buy this for gaming. The integrated graphics can barely handle basic games. It's a productivity machine, not an entertainment device.", date: "2025-11-28", sentiment: "negative", score: 0.18 },
      { id: "gr-4", source: "amazon", author: "FrequentFlyer", text: "Build quality feels a bit plasticky. At this price I expected more premium materials. Screen flexes when you press on it.", date: "2025-10-05", rating: 3, sentiment: "negative", score: 0.22 },
      { id: "gr-5", source: "reddit", author: "u/battery_life_matters", text: "20 hours of real-world battery life. Not exaggerating. This thing just keeps going. Best battery life of any laptop I've used.", date: "2026-02-08", sentiment: "positive", score: 0.94 },
      { id: "gr-6", source: "amazon", author: "StudentUser", text: "Great laptop for school. Lightweight, long battery, nice screen. Only complaint is the speaker quality is quite poor.", date: "2025-12-22", rating: 4, sentiment: "positive", score: 0.78 },
    ],
  },
  "WKHC252HBA": {
    name: "WKHC252HBA",
    displayName: "LG WashTower™ Center Control",
    category: "Home Appliance",
    reviews: [
      { id: "wt-1", source: "reddit", author: "u/laundry_pro", text: "The LG WashTower is a space saver and performs incredibly well. AI Wash and Dry actually works — it detects fabric type and adjusts automatically. Super quiet too.", date: "2026-01-05", sentiment: "positive", score: 0.93 },
      { id: "wt-2", source: "amazon", author: "ApartmentDweller", text: "Perfect for small spaces. The single-unit design fits where a traditional washer-dryer stack wouldn't. Wash quality is excellent.", date: "2025-12-20", rating: 5, sentiment: "positive", score: 0.9 },
      { id: "wt-3", source: "reddit", author: "u/smart_home_fan", text: "ThinQ app integration is convenient. I can start loads remotely and get notifications when done. Works great with Google Home.", date: "2026-02-01", sentiment: "positive", score: 0.87 },
      { id: "wt-4", source: "amazon", author: "DisappointedBuyer", text: "The dryer doesn't fully dry heavy loads. Need to run an extra cycle for towels and jeans. Frustrating for a machine at this price.", date: "2025-11-15", rating: 2, sentiment: "negative", score: 0.15 },
      { id: "wt-5", source: "reddit", author: "u/eco_warrior", text: "Energy efficient and uses significantly less water than our old machines. The steam cycle is great for allergen removal. Highly recommended for families.", date: "2026-01-28", sentiment: "positive", score: 0.91 },
      { id: "wt-6", source: "amazon", author: "RepairNightmare", text: "Broke down after 14 months. Service took 3 weeks to schedule. When it works it's great, but reliability is a concern.", date: "2025-10-10", rating: 2, sentiment: "negative", score: 0.12 },
      { id: "wt-7", source: "consumer_reports", author: "Consumer Reports", text: "Top pick in our combo washer-dryer category. Excellent wash performance, good energy efficiency, and the single-unit design saves significant space. Drying performance is average for heavy loads.", date: "2026-02-15", rating: 4, sentiment: "positive", score: 0.86 },
      { id: "wt-8", source: "trustpilot", author: "JaneDoe_Home", text: "Love the WashTower! Easy to use, quiet operation, and the AI features actually make a difference. Delivery and installation were smooth. 5 stars!", date: "2026-01-12", rating: 5, sentiment: "positive", score: 0.92 },
      { id: "wt-9", source: "trustpilot", author: "FrustratedCustomer22", text: "Customer service is terrible. Machine started making loud noises after 6 months. Took forever to get a technician. Product itself is okay but support is awful.", date: "2025-11-20", rating: 2, sentiment: "negative", score: 0.15 },
      { id: "wt-10", source: "bestreviews", author: "BestReviews", text: "The LG WashTower stands out for its space-saving design and smart features. AI-powered wash cycles adapt to fabric types effectively. A solid choice for apartments and small homes.", date: "2026-01-25", rating: 4, sentiment: "positive", score: 0.87 },
      { id: "wt-11", source: "cnet", author: "CNET", text: "LG's WashTower is the best all-in-one laundry solution we've tested. The center control panel is intuitive, and wash results rival standalone machines. Drying could be better for bulky items.", date: "2026-02-08", rating: 4, sentiment: "positive", score: 0.84 },
    ],
  },
  "PU615U": {
    name: "PU615U",
    displayName: "LG CineBeam S 4K UST Projector",
    category: "Projector",
    reviews: [
      { id: "cb-1", source: "reddit", author: "u/home_cinema", text: "The LG CineBeam is a fantastic projector. 4K HDR with incredible color accuracy. Replaced my 75-inch TV and never looked back. 120-inch screen in my living room!", date: "2026-01-20", sentiment: "positive", score: 0.94 },
      { id: "cb-2", source: "amazon", author: "MovieNight", text: "Easy setup with auto keystone and screen fit. WebOS built in so no need for a streaming stick. Great image quality even in moderate ambient light.", date: "2025-12-10", rating: 5, sentiment: "positive", score: 0.91 },
      { id: "cb-3", source: "reddit", author: "u/projector_snob", text: "Fan noise is noticeable in quiet scenes. Not deal-breaking but if you're sensitive to noise it could bother you. Image quality is great otherwise.", date: "2025-11-25", sentiment: "neutral", score: 0.48 },
      { id: "cb-4", source: "amazon", author: "BrightRoomUser", text: "Not great in bright rooms. You really need blackout curtains for the best experience. Colors wash out with ambient light.", date: "2025-10-18", rating: 3, sentiment: "negative", score: 0.25 },
      { id: "cb-5", source: "reddit", author: "u/audiophile_too", text: "Built-in speakers are surprisingly decent for casual viewing. But for movie night, pair it with a soundbar. The free soundbar bundle deal is amazing!", date: "2026-02-05", sentiment: "positive", score: 0.82 },
      { id: "cb-6", source: "amazon", author: "ValueHunter", text: "Expensive compared to competitors like Epson and BenQ. You're paying a premium for the LG brand and webOS. Worth it if you're in the LG ecosystem.", date: "2025-11-30", rating: 3, sentiment: "neutral", score: 0.42 },
      { id: "cb-7", source: "rtings", author: "RTINGS.com", text: "Solid UST projector with excellent color accuracy and good HDR performance. Input lag is low enough for casual gaming. Fan noise is slightly above average.", date: "2026-02-14", rating: 4, sentiment: "positive", score: 0.85 },
      { id: "cb-8", source: "cnet", author: "CNET", text: "The CineBeam S is a premium UST projector that delivers on picture quality. WebOS integration is a huge plus. Best suited for dedicated home theater rooms with light control.", date: "2026-01-18", rating: 4, sentiment: "positive", score: 0.83 },
    ],
  },
};

export const getProductNames = (): string[] => Object.keys(dummyProducts);

export const getProductList = (): { name: string; displayName: string; category: ProductCategory }[] =>
  Object.values(dummyProducts).map(({ name, displayName, category }) => ({ name, displayName, category }));

export const getCategories = (): ProductCategory[] =>
  [...new Set(Object.values(dummyProducts).map((p) => p.category))];

// Search keywords mapping for category/brand name matching
const searchAliases: Record<string, string[]> = {
  "oled": ["OLED97G5WUA"],
  "g5": ["OLED97G5WUA"],
  "ultragear": ["52G930B-B"],
  "g9": ["52G930B-B"],
  "gram": ["17Z90TL-H.AUB9U1"],
  "laptop": ["17Z90TL-H.AUB9U1"],
  "washtower": ["WKHC252HBA"],
  "wash tower": ["WKHC252HBA"],
  "washer": ["WKHC252HBA"],
  "laundry": ["WKHC252HBA"],
  "cinebeam": ["PU615U"],
  "projector": ["PU615U"],
};

export const searchProducts = (query: string): ProductData | null => {
  const normalizedQuery = query.toLowerCase().trim();
  // Direct model number match
  for (const [key, value] of Object.entries(dummyProducts)) {
    if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
      return value;
    }
  }
  // Alias match (return first match)
  for (const [alias, modelNumbers] of Object.entries(searchAliases)) {
    if (normalizedQuery.includes(alias)) {
      const modelKey = modelNumbers[0];
      if (dummyProducts[modelKey]) return dummyProducts[modelKey];
    }
  }
  return null;
};

export const searchProductsMulti = (query: string): ProductData[] => {
  const normalizedQuery = query.toLowerCase().trim();
  const results: Set<string> = new Set();

  // Direct model number match
  for (const [key] of Object.entries(dummyProducts)) {
    if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
      results.add(key);
    }
  }

  // Alias match
  for (const [alias, modelNumbers] of Object.entries(searchAliases)) {
    if (normalizedQuery.includes(alias)) {
      modelNumbers.forEach((m) => results.add(m));
    }
  }

  // Display name match
  for (const [key, value] of Object.entries(dummyProducts)) {
    if (value.displayName.toLowerCase().includes(normalizedQuery)) {
      results.add(key);
    }
  }

  // Category match
  for (const [key, value] of Object.entries(dummyProducts)) {
    if (value.category.toLowerCase().includes(normalizedQuery)) {
      results.add(key);
    }
  }

  return [...results].map((k) => dummyProducts[k]).filter(Boolean);
};
