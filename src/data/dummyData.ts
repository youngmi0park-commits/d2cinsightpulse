export interface Review {
  id: string;
  source: "reddit" | "amazon";
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
    ],
  },
  "52G930B-B": {
    name: "52G930B-B",
    reviews: [
      { id: "ug-1", source: "reddit", author: "u/pcmr_elite", text: "The world's largest 5K2K gaming monitor lives up to the hype. 52 inches of curved immersion at 240Hz. This thing is absolutely incredible for sim racing and RPGs.", date: "2026-02-10", sentiment: "positive", score: 0.94 },
      { id: "ug-2", source: "reddit", author: "u/fps_addict", text: "240Hz at this size is buttery smooth. Response time is excellent. The OLED panel delivers perfect blacks. Best gaming monitor I've ever used, period.", date: "2026-01-28", sentiment: "positive", score: 0.92 },
      { id: "ug-3", source: "amazon", author: "DeskSetupKing", text: "This monitor is massive. Make sure you have a desk that can handle it. The stand is sturdy but takes up a lot of space. Picture quality is amazing though.", date: "2026-01-15", rating: 4, sentiment: "neutral", score: 0.55 },
      { id: "ug-4", source: "amazon", author: "BudgetGamer", text: "Way too expensive for most people. The price is absolutely insane. Great monitor but hard to justify unless you're a hardcore enthusiast.", date: "2025-12-20", rating: 3, sentiment: "negative", score: 0.22 },
      { id: "ug-5", source: "reddit", author: "u/ultrawide_fan", text: "5K2K resolution gives you so much screen real estate for productivity too. I use it for coding during the day and gaming at night. Dual purpose perfection.", date: "2026-02-05", sentiment: "positive", score: 0.89 },
      { id: "ug-6", source: "amazon", author: "DigitalTrendsReader", text: "Digital Trends Readers' Choice winner for good reason. The curve is immersive without being disorienting. HDR gaming on this is next level.", date: "2026-01-08", rating: 5, sentiment: "positive", score: 0.93 },
    ],
  },
  "17Z90TL-H.AUB9U1": {
    name: "17Z90TL-H.AUB9U1",
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
    reviews: [
      { id: "wt-1", source: "reddit", author: "u/laundry_pro", text: "The LG WashTower is a space saver and performs incredibly well. AI Wash and Dry actually works — it detects fabric type and adjusts automatically. Super quiet too.", date: "2026-01-05", sentiment: "positive", score: 0.93 },
      { id: "wt-2", source: "amazon", author: "ApartmentDweller", text: "Perfect for small spaces. The single-unit design fits where a traditional washer-dryer stack wouldn't. Wash quality is excellent.", date: "2025-12-20", rating: 5, sentiment: "positive", score: 0.9 },
      { id: "wt-3", source: "reddit", author: "u/smart_home_fan", text: "ThinQ app integration is convenient. I can start loads remotely and get notifications when done. Works great with Google Home.", date: "2026-02-01", sentiment: "positive", score: 0.87 },
      { id: "wt-4", source: "amazon", author: "DisappointedBuyer", text: "The dryer doesn't fully dry heavy loads. Need to run an extra cycle for towels and jeans. Frustrating for a machine at this price.", date: "2025-11-15", rating: 2, sentiment: "negative", score: 0.15 },
      { id: "wt-5", source: "reddit", author: "u/eco_warrior", text: "Energy efficient and uses significantly less water than our old machines. The steam cycle is great for allergen removal. Highly recommended for families.", date: "2026-01-28", sentiment: "positive", score: 0.91 },
      { id: "wt-6", source: "amazon", author: "RepairNightmare", text: "Broke down after 14 months. Service took 3 weeks to schedule. When it works it's great, but reliability is a concern.", date: "2025-10-10", rating: 2, sentiment: "negative", score: 0.12 },
    ],
  },
  "PU615U": {
    name: "PU615U",
    reviews: [
      { id: "cb-1", source: "reddit", author: "u/home_cinema", text: "The LG CineBeam is a fantastic projector. 4K HDR with incredible color accuracy. Replaced my 75-inch TV and never looked back. 120-inch screen in my living room!", date: "2026-01-20", sentiment: "positive", score: 0.94 },
      { id: "cb-2", source: "amazon", author: "MovieNight", text: "Easy setup with auto keystone and screen fit. WebOS built in so no need for a streaming stick. Great image quality even in moderate ambient light.", date: "2025-12-10", rating: 5, sentiment: "positive", score: 0.91 },
      { id: "cb-3", source: "reddit", author: "u/projector_snob", text: "Fan noise is noticeable in quiet scenes. Not deal-breaking but if you're sensitive to noise it could bother you. Image quality is great otherwise.", date: "2025-11-25", sentiment: "neutral", score: 0.48 },
      { id: "cb-4", source: "amazon", author: "BrightRoomUser", text: "Not great in bright rooms. You really need blackout curtains for the best experience. Colors wash out with ambient light.", date: "2025-10-18", rating: 3, sentiment: "negative", score: 0.25 },
      { id: "cb-5", source: "reddit", author: "u/audiophile_too", text: "Built-in speakers are surprisingly decent for casual viewing. But for movie night, pair it with a soundbar. The free soundbar bundle deal is amazing!", date: "2026-02-05", sentiment: "positive", score: 0.82 },
      { id: "cb-6", source: "amazon", author: "ValueHunter", text: "Expensive compared to competitors like Epson and BenQ. You're paying a premium for the LG brand and webOS. Worth it if you're in the LG ecosystem.", date: "2025-11-30", rating: 3, sentiment: "neutral", score: 0.42 },
    ],
  },
};

export const getProductNames = (): string[] => Object.keys(dummyProducts);

export const searchProducts = (query: string): ProductData | null => {
  const normalizedQuery = query.toLowerCase().trim();
  for (const [key, value] of Object.entries(dummyProducts)) {
    if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
      return value;
    }
  }
  return null;
};
