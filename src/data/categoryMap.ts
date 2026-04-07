export interface CategoryMeta {
  group: string;
  icon: string;
  color: string;
  bgColor: string;
  subSeries?: string[];
}

// LG 브랜드 그레이 톤 통일 컬러
const LG_GRAY = "#4B5563";       // text color (gray-600)
const LG_GRAY_BG = "#F3F4F6";   // bg color (gray-100)

export const CATEGORY_MAP: Record<string, CategoryMeta> = {
  // TV & Entertainment
  "OLED TV":        { group: "TV & Entertainment", icon: "🖥", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["OLED evo AI (C/G/Z-series)", "OLED Gallery", "OLED Flex", "OLED evo"] },
  "QNED TV":        { group: "TV & Entertainment", icon: "📺", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["QNED90", "QNED85", "QNED80", "QNED75", "QNED70"] },
  "4K UHD TV":      { group: "TV & Entertainment", icon: "🔲", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["UQ-series", "UR-series"] },
  "NanoCell TV":    { group: "TV & Entertainment", icon: "💠", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["NANO75", "NANO80", "NANO90"] },
  "8K TV":          { group: "TV & Entertainment", icon: "✨", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Z-series 8K"] },
  "StanbyME":       { group: "TV & Entertainment", icon: "🖱", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["StanbyME Go", "StanbyME Closet"] },
  "Soundbar":       { group: "TV & Entertainment", icon: "🔊", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["S-series", "SP-series"] },
  "Smart Monitor":  { group: "TV & Entertainment", icon: "🖥", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["MyView", "DualUp"] },
  // Refrigerators
  "French Door Refrigerator": { group: "Refrigerators", icon: "🧊", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["InstaView Door-in-Door", "Craft Ice", "Counter-depth"] },
  "Side-by-Side Refrigerator":{ group: "Refrigerators", icon: "🧊", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Side-by-Side"] },
  "Top Freezer Refrigerator": { group: "Refrigerators", icon: "🧊", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Top Freezer"] },
  "Bottom Freezer Refrigerator":{ group: "Refrigerators", icon: "🧊", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Bottom Freezer"] },
  "Column Refrigerator":      { group: "Refrigerators", icon: "🧊", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Column Refrigerator", "Column Freezer"] },
  "Refrigerator":             { group: "Refrigerators", icon: "🧊", color: LG_GRAY, bgColor: LG_GRAY_BG },
  // Laundry
  "Washer":    { group: "Laundry", icon: "👕", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Front Load (TurboWash)", "Top Load", "Combo"] },
  "Dryer":     { group: "Laundry", icon: "🌀", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Electric Dryer", "Gas Dryer", "Heat Pump Dryer"] },
  "WashTower": { group: "Laundry", icon: "🗼", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["WashTower (all-in-one)"] },
  "Styler":    { group: "Laundry", icon: "👔", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["LG Styler (clothing care)"] },
  // Kitchen
  "Range":      { group: "Kitchen", icon: "🍳", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Gas Range", "Electric Range", "Induction Range", "Wall Oven"] },
  "Cooktop":    { group: "Kitchen", icon: "🔥", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Gas Cooktop", "Electric Cooktop", "Induction Cooktop"] },
  "Dishwasher": { group: "Kitchen", icon: "🍽", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["QuadWash", "Front Control", "Top Control"] },
  "Microwave":  { group: "Kitchen", icon: "📡", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Over-the-Range", "Countertop", "Built-in"] },
  "Wall Oven":  { group: "Kitchen", icon: "🫙", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Single Wall Oven", "Double Wall Oven"] },
  // Air Solutions
  "Air Conditioner":{ group: "Air Solutions", icon: "❄️", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Window AC (Dual Inverter)", "Portable AC", "Mini Split"] },
  "Air Purifier":   { group: "Air Solutions", icon: "🌿", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["PuriCare AeroTower", "PuriCare 360", "HEPA"] },
  "Dehumidifier":   { group: "Air Solutions", icon: "💧", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["PuriCare Dehumidifier"] },
  // Computers
  "Laptop":  { group: "Computers", icon: "💻", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["gram14", "gram16", "gram17", "gram+", "gram Style", "gram Ultra"] },
  "Monitor": { group: "Computers", icon: "🖥", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["UltraWide", "UltraGear (Gaming)", "UltraFine", "DualUp", "StanbyME (Monitor)"] },
  "Desktop": { group: "Computers", icon: "🖥", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["Desktop PC"] },
  // Home Care
  "Vacuum":       { group: "Home Care", icon: "🧹", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["CordZero A9", "CordZero ThinQ", "Kompressor"] },
  "Robot Vacuum": { group: "Home Care", icon: "🤖", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["CordZero R9", "ThinQ Robot"] },
  // Smart Home & Other
  "Smart Home Hub": { group: "Smart Home & Other", icon: "📱", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["LG ThinQ App"] },
  "Phone / Tablet": { group: "Smart Home & Other", icon: "📱", color: LG_GRAY, bgColor: LG_GRAY_BG, subSeries: ["(legacy)"] },
  // TV fallback
  "TV": { group: "TV & Entertainment", icon: "📺", color: LG_GRAY, bgColor: LG_GRAY_BG },
};

/** Resolve category from product category + subCategory fields */
export function resolveCategoryMeta(category: string, subCategory?: string): CategoryMeta {
  // Try exact match on subCategory first
  if (subCategory) {
    const subLower = subCategory.toLowerCase();
    // TV sub-categories
    if (subLower.includes("oled")) return CATEGORY_MAP["OLED TV"];
    if (subLower.includes("qned")) return CATEGORY_MAP["QNED TV"];
    if (subLower.includes("nanocell") || subLower.includes("nano7") || subLower.includes("nano8") || subLower.includes("nano9")) return CATEGORY_MAP["NanoCell TV"];
    if (subLower.includes("uhd") || subLower.includes("4k") || subLower.includes("uq") || subLower.includes("ur-") || subLower.includes("ur series") || subLower.includes("ur7") || subLower.includes("ur8") || subLower.includes("ur9")) return CATEGORY_MAP["4K UHD TV"];
    if (subLower.includes("8k") || subLower.includes("z-series")) return CATEGORY_MAP["8K TV"];
    if (subLower.includes("stanbyme") || subLower.includes("stanby")) return CATEGORY_MAP["StanbyME"];
    if (subLower.includes("soundbar") || subLower.includes("s-series") || subLower.includes("sp-series") || subLower.includes("sp7") || subLower.includes("sp9") || subLower.includes("s95") || subLower.includes("s80")) return CATEGORY_MAP["Soundbar"];
    if (subLower.includes("smart monitor") || subLower.includes("myview") || subLower.includes("dualup")) return CATEGORY_MAP["Smart Monitor"];
    // Refrigerators
    if (subLower.includes("instaview") || subLower.includes("french door") || subLower.includes("craft ice") || subLower.includes("counter-depth") || subLower.includes("counter depth")) return CATEGORY_MAP["French Door Refrigerator"];
    if (subLower.includes("side-by-side") || subLower.includes("side by side")) return CATEGORY_MAP["Side-by-Side Refrigerator"];
    if (subLower.includes("column")) return CATEGORY_MAP["Column Refrigerator"];
    if (subLower.includes("top freezer")) return CATEGORY_MAP["Top Freezer Refrigerator"];
    if (subLower.includes("bottom freezer")) return CATEGORY_MAP["Bottom Freezer Refrigerator"];
    // Laundry
    if (subLower.includes("washtower")) return CATEGORY_MAP["WashTower"];
    if (subLower.includes("turbowash") || subLower.includes("front load")) return CATEGORY_MAP["Washer"];
    if (subLower.includes("heat pump") || subLower.includes("electric dryer") || subLower.includes("gas dryer")) return CATEGORY_MAP["Dryer"];
    if (subLower.includes("styler")) return CATEGORY_MAP["Styler"];
    // Kitchen
    if (subLower.includes("quadwash")) return CATEGORY_MAP["Dishwasher"];
    if (subLower.includes("wall oven")) return CATEGORY_MAP["Wall Oven"];
    if (subLower.includes("induction cooktop") || subLower.includes("gas cooktop") || subLower.includes("electric cooktop")) return CATEGORY_MAP["Cooktop"];
    // Air
    if (subLower.includes("puricare") || subLower.includes("aerotower") || subLower.includes("aero furniture") || subLower.includes("hepa")) return CATEGORY_MAP["Air Purifier"];
    if (subLower.includes("dehumidifier")) return CATEGORY_MAP["Dehumidifier"];
    if (subLower.includes("dual inverter") || subLower.includes("mini split") || subLower.includes("portable ac") || subLower.includes("artcool")) return CATEGORY_MAP["Air Conditioner"];
    // Computers
    if (subLower.includes("gram")) return CATEGORY_MAP["Laptop"];
    if (subLower.includes("ultragear") || subLower.includes("ultrawide") || subLower.includes("ultrafine")) return CATEGORY_MAP["Monitor"];
    if (subLower.includes("desktop")) return CATEGORY_MAP["Desktop"];
    // Home Care
    if (subLower.includes("cordzero") || subLower.includes("kompressor")) return CATEGORY_MAP["Vacuum"];
    if (subLower.includes("robot")) return CATEGORY_MAP["Robot Vacuum"];
    // Smart Home
    if (subLower.includes("thinq")) return CATEGORY_MAP["Smart Home Hub"];
  }

  // Direct match on category
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];

  // Fuzzy match on category field
  const catLower = category.toLowerCase();
  if (catLower.includes("oled")) return CATEGORY_MAP["OLED TV"];
  if (catLower.includes("qned")) return CATEGORY_MAP["QNED TV"];
  if (catLower.includes("nanocell") || catLower.includes("nano cell")) return CATEGORY_MAP["NanoCell TV"];
  if (catLower.includes("4k") || catLower.includes("uhd")) return CATEGORY_MAP["4K UHD TV"];
  if (catLower.includes("8k")) return CATEGORY_MAP["8K TV"];
  if (catLower.includes("stanbyme") || catLower.includes("stanby")) return CATEGORY_MAP["StanbyME"];
  if (catLower.includes("soundbar") || catLower.includes("audio")) return CATEGORY_MAP["Soundbar"];
  if (catLower.includes("tv") || catLower.includes("television")) return CATEGORY_MAP["TV"];
  if (catLower.includes("french door")) return CATEGORY_MAP["French Door Refrigerator"];
  if (catLower.includes("side-by-side") || catLower.includes("side by side")) return CATEGORY_MAP["Side-by-Side Refrigerator"];
  if (catLower.includes("refrigerator") || catLower.includes("fridge")) return CATEGORY_MAP["Refrigerator"];
  if (catLower.includes("washer") && !catLower.includes("dish")) return CATEGORY_MAP["Washer"];
  if (catLower.includes("dryer")) return CATEGORY_MAP["Dryer"];
  if (catLower.includes("washtower")) return CATEGORY_MAP["WashTower"];
  if (catLower.includes("dishwasher")) return CATEGORY_MAP["Dishwasher"];
  if (catLower.includes("vacuum")) return CATEGORY_MAP["Vacuum"];
  if (catLower.includes("air purifier") || catLower.includes("puricare")) return CATEGORY_MAP["Air Purifier"];
  if (catLower.includes("air conditioner") || catLower.includes("artcool")) return CATEGORY_MAP["Air Conditioner"];
  if (catLower.includes("dehumidifier")) return CATEGORY_MAP["Dehumidifier"];
  if (catLower.includes("laptop") || catLower.includes("gram")) return CATEGORY_MAP["Laptop"];
  if (catLower.includes("monitor")) return CATEGORY_MAP["Monitor"];
  if (catLower.includes("desktop")) return CATEGORY_MAP["Desktop"];
  if (catLower.includes("range") || catLower.includes("oven")) return CATEGORY_MAP["Range"];
  if (catLower.includes("cooktop")) return CATEGORY_MAP["Cooktop"];
  if (catLower.includes("microwave")) return CATEGORY_MAP["Microwave"];

  return { group: "Other", icon: "📦", color: "#6B7280", bgColor: "#F9FAFB" };
}

/** Get marketing-friendly category label — must mirror resolveCategoryMeta */
export function getCategoryLabel(category: string, subCategory?: string): string {
  if (subCategory) {
    const subLower = subCategory.toLowerCase();
    if (subLower.includes("oled")) return "OLED TV";
    if (subLower.includes("qned")) return "QNED TV";
    if (subLower.includes("nanocell") || subLower.includes("nano7") || subLower.includes("nano8") || subLower.includes("nano9")) return "NanoCell TV";
    if (subLower.includes("uhd") || subLower.includes("4k") || subLower.includes("uq") || subLower.includes("ur-") || subLower.includes("ur series") || subLower.includes("ur7") || subLower.includes("ur8") || subLower.includes("ur9")) return "4K UHD TV";
    if (subLower.includes("8k") || subLower.includes("z-series")) return "8K TV";
    if (subLower.includes("stanbyme") || subLower.includes("stanby")) return "StanbyME";
    if (subLower.includes("soundbar") || subLower.includes("s-series") || subLower.includes("sp-series") || subLower.includes("sp7") || subLower.includes("sp9") || subLower.includes("s95") || subLower.includes("s80")) return "Soundbar";
    if (subLower.includes("smart monitor") || subLower.includes("myview") || subLower.includes("dualup")) return "Smart Monitor";
    if (subLower.includes("instaview") || subLower.includes("french door") || subLower.includes("craft ice") || subLower.includes("counter-depth") || subLower.includes("counter depth")) return "French Door Refrigerator";
    if (subLower.includes("side-by-side") || subLower.includes("side by side")) return "Side-by-Side Refrigerator";
    if (subLower.includes("column")) return "Column Refrigerator";
    if (subLower.includes("top freezer")) return "Top Freezer Refrigerator";
    if (subLower.includes("bottom freezer")) return "Bottom Freezer Refrigerator";
    if (subLower.includes("washtower")) return "WashTower";
    if (subLower.includes("turbowash") || subLower.includes("front load")) return "Washer";
    if (subLower.includes("heat pump") || subLower.includes("electric dryer") || subLower.includes("gas dryer")) return "Dryer";
    if (subLower.includes("styler")) return "Styler";
    if (subLower.includes("quadwash")) return "Dishwasher";
    if (subLower.includes("wall oven")) return "Wall Oven";
    if (subLower.includes("induction cooktop") || subLower.includes("gas cooktop") || subLower.includes("electric cooktop")) return "Cooktop";
    if (subLower.includes("puricare") || subLower.includes("aerotower") || subLower.includes("aero furniture") || subLower.includes("hepa")) return "Air Purifier";
    if (subLower.includes("dehumidifier")) return "Dehumidifier";
    if (subLower.includes("dual inverter") || subLower.includes("mini split") || subLower.includes("portable ac") || subLower.includes("artcool")) return "Air Conditioner";
    if (subLower.includes("gram")) return "Laptop";
    if (subLower.includes("ultragear") || subLower.includes("ultrawide") || subLower.includes("ultrafine")) return "Monitor";
    if (subLower.includes("desktop")) return "Desktop";
    if (subLower.includes("cordzero") || subLower.includes("kompressor")) return "Vacuum";
    if (subLower.includes("robot")) return "Robot Vacuum";
    if (subLower.includes("thinq")) return "Smart Home Hub";
  }

  // Fuzzy match on category itself
  const catLower = category.toLowerCase();
  if (catLower.includes("oled")) return "OLED TV";
  if (catLower.includes("qned")) return "QNED TV";
  if (catLower.includes("nanocell") || catLower.includes("nano cell")) return "NanoCell TV";
  if (catLower.includes("4k") || catLower.includes("uhd")) return "4K UHD TV";
  if (catLower.includes("8k")) return "8K TV";
  if (catLower.includes("stanbyme") || catLower.includes("stanby")) return "StanbyME";
  if (catLower.includes("soundbar") || catLower.includes("audio")) return "Soundbar";
  if (catLower.includes("french door")) return "French Door Refrigerator";
  if (catLower.includes("side-by-side") || catLower.includes("side by side")) return "Side-by-Side Refrigerator";
  if (catLower.includes("washtower")) return "WashTower";
  if (catLower.includes("dehumidifier")) return "Dehumidifier";
  if (catLower.includes("air purifier") || catLower.includes("puricare")) return "Air Purifier";
  if (catLower.includes("air conditioner") || catLower.includes("artcool")) return "Air Conditioner";

  if (CATEGORY_MAP[category]) return category;
  return category;
}

/** Group key for categories */
export const GROUP_ORDER = [
  "TV & Entertainment",
  "Refrigerators",
  "Laundry",
  "Kitchen",
  "Air Solutions",
  "Computers",
  "Home Care",
  "Smart Home & Other",
  "Other",
];

export const GROUP_ICONS: Record<string, string> = {
  "TV & Entertainment": "📺",
  "Refrigerators": "🧊",
  "Laundry": "👕",
  "Kitchen": "🍽",
  "Air Solutions": "❄️",
  "Computers": "💻",
  "Home Care": "🧹",
  "Smart Home & Other": "📱",
  "Other": "📦",
};
