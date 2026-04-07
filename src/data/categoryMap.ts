export interface CategoryMeta {
  group: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORY_MAP: Record<string, CategoryMeta> = {
  // TV & Entertainment
  "OLED TV":        { group: "TV & Entertainment", icon: "🖥", color: "#15803D", bgColor: "#F0FDF4" },
  "QNED TV":        { group: "TV & Entertainment", icon: "📺", color: "#C2410C", bgColor: "#FFF7ED" },
  "4K UHD TV":      { group: "TV & Entertainment", icon: "🔲", color: "#1D4ED8", bgColor: "#EFF6FF" },
  "NanoCell TV":    { group: "TV & Entertainment", icon: "💠", color: "#4338CA", bgColor: "#EEF2FF" },
  "8K TV":          { group: "TV & Entertainment", icon: "✨", color: "#7C3AED", bgColor: "#F5F3FF" },
  "StanbyME":       { group: "TV & Entertainment", icon: "🖱", color: "#B45309", bgColor: "#FFF7ED" },
  "Soundbar":       { group: "TV & Entertainment", icon: "🔊", color: "#6D28D9", bgColor: "#F5F3FF" },
  "Smart Monitor":  { group: "TV & Entertainment", icon: "🖥", color: "#0D9488", bgColor: "#F0FDFA" },
  // Refrigerators
  "French Door Refrigerator": { group: "Refrigerators", icon: "🧊", color: "#0369A1", bgColor: "#F0F9FF" },
  "Side-by-Side Refrigerator":{ group: "Refrigerators", icon: "🧊", color: "#0369A1", bgColor: "#F0F9FF" },
  "Top Freezer Refrigerator": { group: "Refrigerators", icon: "🧊", color: "#0369A1", bgColor: "#F0F9FF" },
  "Bottom Freezer Refrigerator":{ group: "Refrigerators", icon: "🧊", color: "#0369A1", bgColor: "#F0F9FF" },
  "Column Refrigerator":      { group: "Refrigerators", icon: "🧊", color: "#0369A1", bgColor: "#F0F9FF" },
  "Refrigerator":             { group: "Refrigerators", icon: "🧊", color: "#0369A1", bgColor: "#F0F9FF" },
  // Laundry
  "Washer":    { group: "Laundry", icon: "👕", color: "#0F766E", bgColor: "#F0FDFA" },
  "Dryer":     { group: "Laundry", icon: "🌀", color: "#0F766E", bgColor: "#F0FDFA" },
  "WashTower": { group: "Laundry", icon: "🗼", color: "#0F766E", bgColor: "#F0FDFA" },
  "Styler":    { group: "Laundry", icon: "👔", color: "#0F766E", bgColor: "#F0FDFA" },
  // Kitchen
  "Range":      { group: "Kitchen", icon: "🍳", color: "#B45309", bgColor: "#FFFBEB" },
  "Cooktop":    { group: "Kitchen", icon: "🔥", color: "#B45309", bgColor: "#FFFBEB" },
  "Dishwasher": { group: "Kitchen", icon: "🍽", color: "#B45309", bgColor: "#FFFBEB" },
  "Microwave":  { group: "Kitchen", icon: "📡", color: "#B45309", bgColor: "#FFFBEB" },
  "Wall Oven":  { group: "Kitchen", icon: "🫙", color: "#B45309", bgColor: "#FFFBEB" },
  // Air Solutions
  "Air Conditioner":{ group: "Air Solutions", icon: "❄️", color: "#0284C7", bgColor: "#F0F9FF" },
  "Air Purifier":   { group: "Air Solutions", icon: "🌿", color: "#059669", bgColor: "#ECFDF5" },
  "Dehumidifier":   { group: "Air Solutions", icon: "💧", color: "#0284C7", bgColor: "#F0F9FF" },
  // Computers
  "Laptop":  { group: "Computers", icon: "💻", color: "#374151", bgColor: "#F9FAFB" },
  "Monitor": { group: "Computers", icon: "🖥", color: "#374151", bgColor: "#F9FAFB" },
  "Desktop": { group: "Computers", icon: "🖥", color: "#374151", bgColor: "#F9FAFB" },
  // Home Care
  "Vacuum":       { group: "Home Care", icon: "🧹", color: "#6B21A8", bgColor: "#FAF5FF" },
  "Robot Vacuum": { group: "Home Care", icon: "🤖", color: "#6B21A8", bgColor: "#FAF5FF" },
  // Smart Home & Other
  "Smart Home Hub": { group: "Smart Home & Other", icon: "📱", color: "#6366F1", bgColor: "#EEF2FF" },
  "Phone / Tablet": { group: "Smart Home & Other", icon: "📱", color: "#6366F1", bgColor: "#EEF2FF" },
  // TV fallback
  "TV": { group: "TV & Entertainment", icon: "📺", color: "#1D4ED8", bgColor: "#EFF6FF" },
};

/** Resolve category from product category + subCategory fields */
export function resolveCategoryMeta(category: string, subCategory?: string): CategoryMeta {
  // Try exact match on subCategory first
  if (subCategory) {
    const subLower = subCategory.toLowerCase();
    if (subLower.includes("oled")) return CATEGORY_MAP["OLED TV"];
    if (subLower.includes("qned")) return CATEGORY_MAP["QNED TV"];
    if (subLower.includes("nanocell") || subLower.includes("nano")) return CATEGORY_MAP["NanoCell TV"];
    if (subLower.includes("8k")) return CATEGORY_MAP["8K TV"];
    if (subLower.includes("stanbyme") || subLower.includes("stanby")) return CATEGORY_MAP["StanbyME"];
    if (subLower.includes("washtower")) return CATEGORY_MAP["WashTower"];
    if (subLower.includes("gram") || subLower.includes("laptop")) return CATEGORY_MAP["Laptop"];
    if (subLower.includes("ultragear") || subLower.includes("ultrawide") || subLower.includes("ultrafine") || subLower.includes("dualup") || subLower.includes("myview")) return CATEGORY_MAP["Monitor"];
    if (subLower.includes("soundbar") || subLower.includes("s-series") || subLower.includes("sp-series")) return CATEGORY_MAP["Soundbar"];
    if (subLower.includes("smart monitor")) return CATEGORY_MAP["Smart Monitor"];
    if (subLower.includes("instaview") || subLower.includes("french door") || subLower.includes("craft ice") || subLower.includes("counter-depth")) return CATEGORY_MAP["French Door Refrigerator"];
    if (subLower.includes("side-by-side")) return CATEGORY_MAP["Side-by-Side Refrigerator"];
    if (subLower.includes("column")) return CATEGORY_MAP["Column Refrigerator"];
    if (subLower.includes("top freezer")) return CATEGORY_MAP["Top Freezer Refrigerator"];
    if (subLower.includes("bottom freezer")) return CATEGORY_MAP["Bottom Freezer Refrigerator"];
    if (subLower.includes("cordzero") || subLower.includes("kompressor")) return CATEGORY_MAP["Vacuum"];
    if (subLower.includes("robot") || subLower.includes("thinq robot")) return CATEGORY_MAP["Robot Vacuum"];
    if (subLower.includes("puricare") || subLower.includes("aerotower") || subLower.includes("aero furniture")) return CATEGORY_MAP["Air Purifier"];
    if (subLower.includes("dehumidifier")) return CATEGORY_MAP["Dehumidifier"];
    if (subLower.includes("quadwash") || subLower.includes("front control") || subLower.includes("top control")) return CATEGORY_MAP["Dishwasher"];
    if (subLower.includes("heat pump") || subLower.includes("electric dryer") || subLower.includes("gas dryer")) return CATEGORY_MAP["Dryer"];
    if (subLower.includes("styler")) return CATEGORY_MAP["Styler"];
    if (subLower.includes("combo") || subLower.includes("front load") || subLower.includes("turbowash") || subLower.includes("top load")) return CATEGORY_MAP["Washer"];
    if (subLower.includes("window ac") || subLower.includes("dual inverter") || subLower.includes("portable ac") || subLower.includes("mini split") || subLower.includes("artcool")) return CATEGORY_MAP["Air Conditioner"];
    if (subLower.includes("gas range") || subLower.includes("electric range") || subLower.includes("induction range") || subLower.includes("wall oven")) return CATEGORY_MAP["Range"];
    if (subLower.includes("cooktop")) return CATEGORY_MAP["Cooktop"];
    if (subLower.includes("over-the-range") || subLower.includes("countertop") || subLower.includes("built-in")) return CATEGORY_MAP["Microwave"];
    if (subLower.includes("desktop")) return CATEGORY_MAP["Desktop"];
    if (subLower.includes("thinq")) return CATEGORY_MAP["Smart Home Hub"];
    if (subLower.includes("uq") || subLower.includes("ur-series") || subLower.includes("4k uhd")) return CATEGORY_MAP["4K UHD TV"];
  }

  // Direct match on category
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];

  // Fuzzy match
  const catLower = category.toLowerCase();
  if (catLower.includes("tv") || catLower.includes("television")) return CATEGORY_MAP["TV"];
  if (catLower.includes("refrigerator") || catLower.includes("fridge")) return CATEGORY_MAP["Refrigerator"];
  if (catLower.includes("washer") && !catLower.includes("dish")) return CATEGORY_MAP["Washer"];
  if (catLower.includes("dryer")) return CATEGORY_MAP["Dryer"];
  if (catLower.includes("dishwasher")) return CATEGORY_MAP["Dishwasher"];
  if (catLower.includes("vacuum")) return CATEGORY_MAP["Vacuum"];
  if (catLower.includes("air purifier")) return CATEGORY_MAP["Air Purifier"];
  if (catLower.includes("air conditioner")) return CATEGORY_MAP["Air Conditioner"];
  if (catLower.includes("dehumidifier")) return CATEGORY_MAP["Dehumidifier"];
  if (catLower.includes("laptop")) return CATEGORY_MAP["Laptop"];
  if (catLower.includes("monitor")) return CATEGORY_MAP["Monitor"];
  if (catLower.includes("desktop")) return CATEGORY_MAP["Desktop"];
  if (catLower.includes("soundbar") || catLower.includes("audio")) return CATEGORY_MAP["Soundbar"];
  if (catLower.includes("range") || catLower.includes("oven")) return CATEGORY_MAP["Range"];
  if (catLower.includes("cooktop")) return CATEGORY_MAP["Cooktop"];
  if (catLower.includes("microwave")) return CATEGORY_MAP["Microwave"];
  if (catLower.includes("smart home") || catLower.includes("thinq")) return CATEGORY_MAP["Smart Home Hub"];
  if (catLower.includes("phone") || catLower.includes("tablet")) return CATEGORY_MAP["Phone / Tablet"];

  return { group: "Other", icon: "📦", color: "#6B7280", bgColor: "#F9FAFB" };
}

/** Get marketing-friendly category label */
export function getCategoryLabel(category: string, subCategory?: string): string {
  if (subCategory) {
    const subLower = subCategory.toLowerCase();
    if (subLower.includes("oled")) return "OLED TV";
    if (subLower.includes("qned")) return "QNED TV";
    if (subLower.includes("nanocell") || subLower.includes("nano")) return "NanoCell TV";
    if (subLower.includes("8k")) return "8K TV";
    if (subLower.includes("stanbyme") || subLower.includes("stanby")) return "StanbyME";
    if (subLower.includes("washtower")) return "WashTower";
    if (subLower.includes("soundbar") || subLower.includes("s-series") || subLower.includes("sp-series")) return "Soundbar";
    if (subLower.includes("smart monitor")) return "Smart Monitor";
    if (subLower.includes("instaview") || subLower.includes("french door") || subLower.includes("craft ice") || subLower.includes("counter-depth")) return "French Door Refrigerator";
    if (subLower.includes("side-by-side")) return "Side-by-Side Refrigerator";
    if (subLower.includes("bottom freezer")) return "Bottom Freezer Refrigerator";
    if (subLower.includes("top freezer")) return "Top Freezer Refrigerator";
    if (subLower.includes("column")) return "Column Refrigerator";
    if (subLower.includes("gram") || subLower.includes("laptop")) return "Laptop";
    if (subLower.includes("ultragear") || subLower.includes("ultrawide") || subLower.includes("ultrafine") || subLower.includes("dualup")) return "Monitor";
    if (subLower.includes("cordzero") || subLower.includes("kompressor")) return "Vacuum";
    if (subLower.includes("robot") || subLower.includes("thinq robot")) return "Robot Vacuum";
    if (subLower.includes("puricare") || subLower.includes("aerotower") || subLower.includes("aero furniture")) return "Air Purifier";
    if (subLower.includes("dehumidifier")) return "Dehumidifier";
    if (subLower.includes("quadwash") || subLower.includes("front control") || subLower.includes("top control")) return "Dishwasher";
    if (subLower.includes("heat pump") || subLower.includes("electric dryer") || subLower.includes("gas dryer")) return "Dryer";
    if (subLower.includes("styler")) return "Styler";
    if (subLower.includes("combo") || subLower.includes("front load") || subLower.includes("turbowash") || subLower.includes("top load")) return "Washer";
    if (subLower.includes("window ac") || subLower.includes("dual inverter") || subLower.includes("portable ac") || subLower.includes("mini split") || subLower.includes("artcool")) return "Air Conditioner";
    if (subLower.includes("gas range") || subLower.includes("electric range") || subLower.includes("induction range") || subLower.includes("wall oven")) return "Range";
    if (subLower.includes("cooktop")) return "Cooktop";
    if (subLower.includes("over-the-range") || subLower.includes("countertop") || subLower.includes("built-in")) return "Microwave";
    if (subLower.includes("desktop")) return "Desktop";
    if (subLower.includes("thinq")) return "Smart Home Hub";
    if (subLower.includes("uq") || subLower.includes("ur-series") || subLower.includes("4k uhd")) return "4K UHD TV";
  }
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
