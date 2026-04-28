import type { Review } from "@/data/dummyData";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface SentimentSignal {
  product: string;
  sentiment: "positive" | "negative" | "mixed";
  score: number; // -1.0 to +1.0
  evidencePhrase: string;
  category?: string;
  type?: "competitive_win" | "competitive_loss" | "brand_erosion" | "price_value" | "general";
}

export interface CompetitiveMention {
  brand: string;
  win: boolean;
}

/** Explicit "vs Brand" / "than Brand" / "compared to Brand" comparison flag */
export interface CompetitorComparisonFlag {
  brand: string;            // canonical brand (e.g. "Samsung")
  maskedBrand: string;      // privacy-masked label (e.g. "SS")
  pattern: string;          // matched phrase, e.g. "vs Samsung"
  outcome: "win" | "loss" | "neutral";
  evidence: string;         // sentence excerpt
}

/** 6-emotion classifier result (Beta) */
export type EmotionLabel =
  | "satisfaction"   // 만족
  | "disappointment" // 실망
  | "expectation"    // 기대
  | "anxiety"        // 불안
  | "anger"          // 분노
  | "trust";         // 신뢰

export interface EmotionDistribution {
  satisfaction: number;
  disappointment: number;
  expectation: number;
  anxiety: number;
  anger: number;
  trust: number;
  dominant: EmotionLabel | "none";
  beta: true;
}

export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
  compositeScore: number; // 0–100 normalized
  keywords: { positive: string[]; negative: string[] };
  phrases: { positive: string[]; negative: string[] };
  usageScenes: string[];
  // New multi-layer fields
  topPositivePhrase: string;
  topNegativePhrase: string;
  dominantIssueCategory: string;
  priceSensitivityFlag: boolean;
  competitiveMentions: CompetitiveMention[];
  signals: SentimentSignal[];
  // Privacy-aware flags
  hasTextData: boolean;
  ratingOnlyMode: boolean;
  // Subject-bound FCO fields
  primarySubject: string;
  hasCrossProductMention: boolean;
  confidence: number; // 0–1, lower when cross-product comparisons detected
  // ── Roadmap v2 additions ─────────────────────────────────────
  /** Explicit "vs Samsung" style comparisons surfaced for marketing */
  competitorComparisons: CompetitorComparisonFlag[];
  /** 6-emotion distribution (Beta — rule-based v1, EN/KO/DE/FR/ES) */
  emotions: EmotionDistribution;
  /** Languages detected across reviews (rough ISO codes) */
  detectedLanguages: string[];
}

// ═══════════════════════════════════════════════════════════════════
// DICTIONARIES
// ═══════════════════════════════════════════════════════════════════

const POSITIVE_WORDS: Record<string, number> = {
  stunning: 0.85, amazing: 0.8, incredible: 0.85, perfect: 0.9, great: 0.7,
  excellent: 0.85, phenomenal: 0.9, gorgeous: 0.85, breathtaking: 0.9,
  brilliant: 0.8, impressive: 0.8, beautiful: 0.8, smooth: 0.6, sharp: 0.6,
  vivid: 0.65, crisp: 0.65, reliable: 0.7, intuitive: 0.65, responsive: 0.6,
  quiet: 0.55, efficient: 0.6, convenient: 0.6, comfortable: 0.6,
  durable: 0.65, lightweight: 0.5, sleek: 0.6, fast: 0.6, satisfied: 0.65,
  impressed: 0.7, delighted: 0.8, premium: 0.6, fantastic: 0.8,
  superior: 0.75, unmatched: 0.8, flawless: 0.9, recommend: 0.7,
  love: 0.8, good: 0.5, outstanding: 0.85, best: 0.8, "top-notch": 0.8,
  "well-built": 0.7, "well-designed": 0.7, "cutting-edge": 0.75,
  "must-have": 0.75, "class-leading": 0.8, "worth it": 0.7,
  // ── German ──
  hervorragend: 0.85, ausgezeichnet: 0.85, perfekt: 0.9, super: 0.7,
  toll: 0.7, fantastisch: 0.8, wunderbar: 0.8, leise: 0.55, schnell: 0.6,
  zuverlässig: 0.7, empfehlenswert: 0.75, zufrieden: 0.65, "sehr gut": 0.8,
  einfach: 0.4, bequem: 0.6, preiswert: 0.6, hochwertig: 0.7,
  // ── French ──
  excellent_fr: 0.85, parfait: 0.9, magnifique: 0.85, génial: 0.8,
  superbe: 0.8, fiable: 0.7, rapide: 0.6, silencieux: 0.55, pratique: 0.6,
  satisfait: 0.65, recommande: 0.7, agréable: 0.6, robuste: 0.65,
  // ── Spanish ──
  excelente: 0.85, perfecto: 0.9, increíble: 0.85, fantástico: 0.8,
  estupendo: 0.8, fiable_es: 0.7, rápido: 0.6, silencioso: 0.55,
  cómodo: 0.6, satisfecho: 0.65, recomiendo: 0.7, "muy bueno": 0.7,
  duradero: 0.65, ligero: 0.5,
};

const NEGATIVE_WORDS: Record<string, number> = {
  slow: -0.6, bloated: -0.65, frustrating: -0.75, disappointing: -0.7,
  poor: -0.7, cheap: -0.55, plasticky: -0.5, noisy: -0.55, dim: -0.5,
  blurry: -0.6, laggy: -0.65, bulky: -0.45, flimsy: -0.6, unreliable: -0.75,
  uncomfortable: -0.55, complicated: -0.5, fragile: -0.6, defective: -0.85,
  overpriced: -0.7, mediocre: -0.5, annoying: -0.6, clunky: -0.55,
  buggy: -0.7, inconsistent: -0.55, incomplete: -0.5, unstable: -0.65,
  glitchy: -0.65, unresponsive: -0.7, outdated: -0.55, inferior: -0.65,
  disappointed: -0.7, terrible: -0.9, awful: -0.9, worst: -0.95,
  regret: -0.8, waste: -0.75, avoid: -0.8, broken: -0.85, unusable: -0.9,
  "do not buy": -0.9,
  // ── German ──
  schlecht: -0.7, enttäuscht: -0.7, enttäuschend: -0.7, langsam: -0.55,
  laut: -0.55, kaputt: -0.85, mangelhaft: -0.7, unzuverlässig: -0.75,
  teuer: -0.5, defekt: -0.85, schwach: -0.55, fehlerhaft: -0.7,
  unbrauchbar: -0.9, ärgerlich: -0.6,
  // ── French ──
  mauvais: -0.7, déçu: -0.7, décevant: -0.7, lent: -0.55, bruyant: -0.55,
  cassé: -0.85, défectueux: -0.85, fragile_fr: -0.6, cher: -0.5,
  inutilisable: -0.9, médiocre: -0.55, nul: -0.7, "pas fiable": -0.75,
  // ── Spanish ──
  malo: -0.7, decepcionado: -0.7, decepcionante: -0.7, lento: -0.55,
  ruidoso: -0.55, roto: -0.85, defectuoso: -0.85, caro: -0.5,
  inútil: -0.85, mediocre_es: -0.55, frágil: -0.6, "no funciona": -0.85,
};

const NEGATION_TOKENS = [
  "not", "never", "no", "isn't", "wasn't", "don't", "can't",
  "won't", "barely", "hardly", "fails to", "unable to",
  "doesn't", "didn't", "couldn't", "shouldn't", "wouldn't",
  "neither", "nor", "without",
  // German
  "nicht", "kein", "keine", "nie", "niemals", "ohne",
  // French
  "ne", "pas", "jamais", "aucun", "aucune", "sans",
  // Spanish
  "no", "nunca", "ningún", "ninguna", "sin",
];

// ── Contrastive conjunctions that flip sentiment weight ──
const CONTRASTIVE_CONJUNCTIONS = /\b(but|however|although|though|yet|unfortunately|except|still|nevertheless|on the other hand|only complaint|only issue|only problem|one downside|downside is)\b/i;

// ── "too + adjective" pattern → negative override ──
const TOO_PATTERN = /\btoo\s+(loud|heavy|bulky|big|small|slow|dim|bright|hot|cold|noisy|expensive|thick|thin|large|warm|soft|hard|tight|loose|short|long|fast|quiet|dark|light|sharp|high|low)\b/gi;

// ── "no/zero + negative_noun" → positive override ──
const NO_PROBLEM_PATTERNS = [
  /\bno\s+(issues?|problems?|complaints?|flaws?|defects?|regrets?|noise|lag|delay|flicker|stutter|glitch|bloatware|bugs?)\b/gi,
  /\bzero\s+(issues?|problems?|complaints?|lag|delay|noise)\b/gi,
  /\bnot\s+a\s+single\s+(issue|problem|complaint|flaw)\b/gi,
  /\bnothing\s+(wrong|bad|negative)\b/gi,
  /\bno\s+(trouble|difficulty|difficulties)\b/gi,
];

// ── Sarcasm / backhanded compliment patterns → negative ──
const SARCASTIC_PATTERNS = [
  /\bgreat\s+if\s+you\s+(like|enjoy|want)\b/gi,
  /\b(?:thanks|thank\s+you)\s+for\s+nothing\b/gi,
  /\bwhat\s+a\s+waste\b/gi,
  /\bso\s+much\s+for\b/gi,
  /\byeah\s+right\b/gi,
];

// ── Appliance-context word overrides (word → neutral/skip in certain categories) ──
const CONTEXT_NEUTRAL_WORDS: Record<string, string[]> = {
  cool: ["TV", "Monitor", "Laptop", "Refrigerator"],      // "cool" ≠ sentiment in these
  hot: ["Range", "Microwave", "Cooktop"],                  // "hot" is expected
  clean: ["Washer", "Dishwasher", "Vacuum"],               // "clean" is function, not sentiment
  sharp: ["TV", "Monitor"],                                // "sharp" can be brand name confusion
  smooth: ["TV", "Monitor"],                               // often describes motion handling (neutral/technical)
  bright: ["TV", "Monitor", "Projector"],                  // technical spec, not always positive
  warm: ["Refrigerator"],                                  // negative in fridge context
  heavy: ["Washer", "Dryer", "Refrigerator"],              // expected for large appliances
};

const STRONG_POS_INTENSIFIERS = [
  "absolutely", "incredibly", "love", "perfect", "outstanding",
  "best ever", "blown away", "mind-blowing", "worth every penny",
  "amazingly", "exceptionally", "remarkably", "extremely", "truly",
];

const STRONG_NEG_INTENSIFIERS = [
  "total waste", "complete disaster", "terrible", "worst ever",
  "deeply disappointed", "never again", "regret buying",
  "completely", "utterly", "absolutely terrible", "total garbage",
];

const COMPETITORS = [
  "samsung", "sony", "lg competitor", "vizio", "hisense", "tcl",
  "panasonic", "philips", "whirlpool", "ge appliances", "bosch",
  "electrolux", "maytag", "frigidaire", "kitchenaid", "dell",
  "hp", "lenovo", "asus", "acer", "apple", "bose", "sonos",
  "jbl", "klipsch",
];

/** Mask competitor brand names in user-facing text */
export function maskCompetitorNames(text: string): string {
  return text
    .replace(/\bsamsung\b/gi, "SS")
    .replace(/\bgalaxy\b/gi, "SS")
    .replace(/\bsony\b/gi, "SN")
    .replace(/\bbravia\b/gi, "SN")
    .replace(/\b(tcl|hisense|vizio)\b/gi, "C브랜드")
    .replace(/\b(whirlpool|bosch|electrolux|maytag|kenmore|frigidaire|kitchenaid|dyson|haier|siemens)\b/gi, "기타")
    .replace(/\b(panasonic|philips|bose|sonos|jbl|klipsch)\b/gi, "기타")
    .replace(/\b(dell|hp|lenovo|asus|acer|apple)\b/gi, "기타");
}

// Issue categories and their indicator words
// ═══════════════════════════════════════════════════════════════════
// FUNCTION-CONTEXT-OUTCOME (FCO) FRAMEWORK
// ═══════════════════════════════════════════════════════════════════
// Sentiment is determined by: Function (what feature) + Context (usage situation) + Outcome (satisfied/disappointed)
// NOT by surface-level word polarity alone.

/** Product Function categories — every sentence maps to at least one */
export const FUNCTION_CATEGORIES: Record<string, string[]> = {
  "Picture Quality": ["picture", "image", "color", "contrast", "brightness", "hdr", "black level", "viewing angle", "screen", "display", "oled", "resolution", "4k", "8k", "pixel", "burn-in", "burn in", "retention", "upscaling", "dolby vision", "motion", "blur", "judder", "black", "vivid", "dim", "bright"],
  "Gaming": ["input lag", "response time", "vrr", "g-sync", "gsync", "freesync", "refresh rate", "cloud gaming", "gaming", "fps", "latency", "120hz", "144hz", "165hz", "game mode", "game optimizer"],
  "Sound": ["sound", "audio", "bass", "speaker", "dialogue", "volume", "surround", "dolby atmos", "subwoofer", "treble", "soundbar", "clarity", "immersive"],
  "Smart / AI / OS": ["app", "software", "webos", "thinq", "interface", "remote", "update", "smart", "voice control", "alexa", "google", "airplay", "cast", "streaming", "netflix", "youtube app", "ui", "menu", "navigation", "ai", "recommendation", "stability", "loading", "speed"],
  "Design & Build": ["build", "design", "finish", "stand", "slim", "weight", "aesthetic", "bezel", "mount", "material", "plastic", "metal", "premium", "thin", "frame", "heavy", "cheap-looking", "sleek"],
  "Installation & Setup": ["install", "setup", "delivery", "mount", "wall mount", "cable management", "assemble", "instruction", "manual", "connection", "plug", "difficulty"],
  "Reliability & Quality": ["reliability", "reliable", "break", "broke", "broken", "last", "lifespan", "warranty", "replace", "defect", "fail", "malfunction", "dead", "stop working", "dead pixel", "reboot", "heat", "noise", "durability"],
  "Value & Price": ["price", "value", "cost", "expensive", "cheap", "worth", "money", "budget", "afford", "deal", "sale", "discount", "overpriced", "expectation"],
  "Customer Service": ["service", "support", "customer", "repair", "technician", "return", "refund", "exchange", "response", "call center", "chat support", "warranty claim"],
  "Wash/Clean Quality": ["wash", "clean", "stain", "rinse", "spin", "cycle", "drum", "detergent", "fabric", "gentle", "heavy duty"],
  "Cooling/Temperature": ["cold", "temperature", "freeze", "ice", "fresh", "chill", "thermostat", "compressor", "cooling system", "refrigerant"],
  "Energy/Noise": ["energy", "power", "watt", "electricity", "noise", "quiet", "loud", "vibration", "efficient", "eco"],
};

// Keep backward compat alias
const ISSUE_CATEGORIES = FUNCTION_CATEGORIES;

// Categories that should be EXCLUDED for specific product families
const CATEGORY_EXCLUSIONS: Record<string, string[]> = {
  // TV / entertainment products should never show appliance-specific topics
  TV: ["Wash/Clean Quality", "Cooling/Temperature"],
  "OLED TV": ["Wash/Clean Quality", "Cooling/Temperature"],
  "QNED TV": ["Wash/Clean Quality", "Cooling/Temperature"],
  "NanoCell TV": ["Wash/Clean Quality", "Cooling/Temperature"],
  "4K UHD TV": ["Wash/Clean Quality", "Cooling/Temperature"],
  "8K TV": ["Wash/Clean Quality", "Cooling/Temperature"],
  StanbyME: ["Wash/Clean Quality", "Cooling/Temperature"],
  Soundbar: ["Wash/Clean Quality", "Cooling/Temperature"],
  "Smart Monitor": ["Wash/Clean Quality", "Cooling/Temperature"],
  Monitor: ["Wash/Clean Quality", "Cooling/Temperature"],
  // Appliance products should never show display-specific topics
  Refrigerator: ["Picture Quality", "Gaming"],
  Washer: ["Picture Quality", "Gaming"],
  Dryer: ["Picture Quality", "Gaming"],
  Dishwasher: ["Picture Quality", "Gaming"],
  Vacuum: ["Picture Quality", "Gaming"],
  "Air Conditioner": ["Picture Quality", "Gaming"],
  "Air Purifier": ["Picture Quality", "Gaming"],
};

// ═══════════════════════════════════════════════════════════════════
// CROSS-PRODUCT COMPARISON DETECTION
// ═══════════════════════════════════════════════════════════════════

const CROSS_PRODUCT_KEYWORDS: Record<string, string[]> = {
  "TV":             ["tv","oled","qled","screen","display","picture","remote","webos","hdmi","화면","티비"],
  "Refrigerator":   ["fridge","refrigerator","freezer","ice maker","냉장고","냉동","냉각"],
  "Washer":         ["washer","washing machine","laundry","세탁기","세탁","탈수","드럼"],
  "Dryer":          ["dryer","drying","건조기","건조"],
  "Dishwasher":     ["dishwasher","dishes","식기세척기","세척"],
  "Vacuum":         ["vacuum","suction","cordzero","청소기","흡입력"],
  "Air Conditioner":["ac","air conditioner","에어컨","냉방","dual inverter"],
  "Air Purifier":   ["air purifier","purifier","공기청정기","필터"],
  "Monitor":        ["monitor","모니터","refresh rate"],
  "Laptop":         ["laptop","notebook","노트북","gram"],
  "Audio":          ["soundbar","speaker","audio","사운드바"],
  "Range":          ["range","oven","레인지","오븐"],
  "Microwave":      ["microwave","전자레인지"],
  "Cooktop":        ["cooktop","쿡탑","induction"],
};

const COMPARISON_PATTERNS: RegExp[] = [
  /보다\s/gi, /에\s*비해/gi, /대비/gi,
  /than\s+/gi, /compared\s+to/gi, /unlike\s+/gi, /vs\.?\s+/gi,
  /better\s+than/gi, /worse\s+than/gi,
];

/**
 * Detect if review text contains cross-product comparisons
 * e.g. "냉장고가 세탁기보다 좋다" → true when targetCategory is Washer
 */
function detectCrossProductComparison(text: string, targetCategory: string): boolean {
  const lower = text.toLowerCase();
  const hasComparison = COMPARISON_PATTERNS.some(p => { p.lastIndex = 0; return p.test(lower); });
  if (!hasComparison) return false;

  // Check if other category keywords appear in the comparison text
  const otherKws = Object.entries(CROSS_PRODUCT_KEYWORDS)
    .filter(([cat]) => cat !== targetCategory)
    .flatMap(([, kws]) => kws);
  return otherKws.some(kw => lower.includes(kw.toLowerCase()));
}

/** Get excluded categories for a product category */
function getExcludedCategories(productCategory?: string): Set<string> {
  if (!productCategory) return new Set();
  const direct = CATEGORY_EXCLUSIONS[productCategory];
  if (direct) return new Set(direct);
  // Fuzzy match: check if product category contains a known key
  const lower = productCategory.toLowerCase();
  for (const [key, exclusions] of Object.entries(CATEGORY_EXCLUSIONS)) {
    if (lower.includes(key.toLowerCase())) return new Set(exclusions);
  }
  return new Set();
}

// Price-value expressions
const PRICE_POSITIVE = ["worth every penny", "great value", "worth the price", "budget-friendly", "good deal", "great deal", "fair price", "bang for the buck", "bang for your buck", "affordable", "reasonably priced"];
const PRICE_NEGATIVE = ["overpriced", "not worth it", "too expensive", "rip off", "ripoff", "expensive for what you get", "feels cheap", "not worth the money", "waste of money", "highway robbery"];

// Temporal/decline patterns
const DECLINE_PATTERNS = ["used to be", "was great but", "not as good as it was", "quality has dropped", "they don't make them like", "went downhill", "has gotten worse", "declined in quality", "not what it used to be"];
const CONDITIONAL_PATTERNS = ["would be perfect if", "great except for", "love it but", "almost ideal", "good but", "nice but", "excellent except", "would be better if", "only complaint"];

// Source weight adjustments
const SOURCE_WEIGHTS: Record<string, number> = {
  lge_com: 1.0, amazon: 1.0, bestbuy: 1.0, trustpilot: 1.0,
  reddit: 0.85, youtube: 0.75,
};

// Feature nouns for phrase extraction
const FEATURE_NOUNS = [
  "picture quality", "image quality", "picture", "display", "screen", "colors", "contrast",
  "brightness", "black levels", "viewing angles", "resolution", "HDR", "motion handling",
  "sound quality", "sound", "audio", "bass", "speakers", "dialogue clarity",
  "smart features", "interface", "remote", "apps", "webOS", "ThinQ",
  "voice control", "setup", "navigation", "software", "updates",
  "design", "build quality", "build", "finish", "stand", "slim profile",
  "form factor", "aesthetics", "bezels", "mounting",
  "performance", "speed", "response time", "input lag", "gaming",
  "refresh rate", "processing", "upscaling",
  "cooling", "airflow", "temperature control", "energy efficiency",
  "noise level", "installation", "cleaning", "capacity",
  "wash quality", "spin cycle", "vibration", "cycle time", "drum",
  "value", "price", "quality", "durability", "reliability",
  "connectivity", "features", "functionality",
];

// ═══════════════════════════════════════════════════════════════════
// LAYER 1: Product Entity Extraction
// ═══════════════════════════════════════════════════════════════════

const PRODUCT_ALIASES: Record<string, string> = {
  "the oled": "OLED TV", "my lg tv": "LG TV", "this tv": "LG TV",
  "the tv": "LG TV", "this washer": "Washer", "the washer": "Washer",
  "this dryer": "Dryer", "the fridge": "Refrigerator",
  "this fridge": "Refrigerator", "the refrigerator": "Refrigerator",
  "my fridge": "Refrigerator", "this monitor": "Monitor",
  "the monitor": "Monitor", "this laptop": "Laptop",
  "the gram": "LG gram", "my gram": "LG gram",
  "this soundbar": "Soundbar", "the soundbar": "Soundbar",
  "this projector": "Projector", "the projector": "Projector",
  "washtower": "WashTower", "wash tower": "WashTower",
  "standby me": "StanbyME", "standbyme": "StanbyME",
};

function extractProductEntity(text: string, contextProduct?: string): string {
  const lower = text.toLowerCase();
  // Check known aliases
  for (const [alias, product] of Object.entries(PRODUCT_ALIASES)) {
    if (lower.includes(alias)) return product;
  }
  // Check LG model patterns (e.g. "LG C4", "OLED65C4")
  const modelMatch = text.match(/\b(?:LG\s+)?(?:OLED|QNED|Nano|UHD)?[\s-]?[A-Z]\d{1,2}[A-Z]?\b/i);
  if (modelMatch) return modelMatch[0].toUpperCase();
  return contextProduct || "Unknown";
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 2: Linguistic Pattern Rules
// ═══════════════════════════════════════════════════════════════════

function getSourceWeight(source: string): number {
  for (const [key, w] of Object.entries(SOURCE_WEIGHTS)) {
    if (source.startsWith(key)) return w;
  }
  return 0.9;
}

/** Split text into sentence-like segments */
function splitSentences(text: string | undefined | null): string[] {
  if (!text) return [];
  return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 3);
}

/** Check if any negation token appears within window words before position */
function hasNegation(words: string[], sentimentWordIdx: number, windowSize = 4): boolean {
  const start = Math.max(0, sentimentWordIdx - windowSize);
  const preceding = words.slice(start, sentimentWordIdx).join(" ").toLowerCase();
  return NEGATION_TOKENS.some(neg => preceding.includes(neg));
}

/** Check for intensifiers near a position */
function getIntensifierMultiplier(text: string): number {
  const lower = text.toLowerCase();
  for (const int of STRONG_POS_INTENSIFIERS) {
    if (lower.includes(int)) return 1.4;
  }
  for (const int of STRONG_NEG_INTENSIFIERS) {
    if (lower.includes(int)) return 1.4;
  }
  return 1.0;
}

/** Rule D: Competitive expressions */
function detectCompetitive(text: string): { type: "competitive_win" | "competitive_loss"; brand: string; score: number } | null {
  const lower = text.toLowerCase();
  const mentionedCompetitor = COMPETITORS.find(c => lower.includes(c));
  if (!mentionedCompetitor) return null;

  const winPatterns = ["better than", "beats", "ahead of", "prefer lg over", "prefer lg to", "lg is better", "lg wins", "lg crushes", "lg destroys", "switched to lg", "moved to lg"];
  const losePatterns = ["is better", "prefer " + mentionedCompetitor, "switched from lg", "going back to", "went with " + mentionedCompetitor, "chose " + mentionedCompetitor, mentionedCompetitor + " is better", mentionedCompetitor + " beats"];

  for (const p of winPatterns) {
    if (lower.includes(p)) return { type: "competitive_win", brand: mentionedCompetitor, score: 0.75 };
  }
  for (const p of losePatterns) {
    if (lower.includes(p)) return { type: "competitive_loss", brand: mentionedCompetitor, score: -0.75 };
  }

  return null;
}

/** Rule E: Temporal/conditional sentiment */
function detectTemporalConditional(text: string): { type: "brand_erosion" | "mixed"; score: number } | null {
  const lower = text.toLowerCase();
  for (const p of DECLINE_PATTERNS) {
    if (lower.includes(p)) return { type: "brand_erosion", score: -0.65 };
  }
  for (const p of CONDITIONAL_PATTERNS) {
    if (lower.includes(p)) return { type: "mixed", score: 0.15 };
  }
  return null;
}

/** Rule F: Price/value sentiment */
function detectPriceValue(text: string): { score: number; positive: boolean } | null {
  const lower = text.toLowerCase();
  for (const p of PRICE_POSITIVE) {
    if (lower.includes(p)) return { score: 0.7, positive: true };
  }
  for (const p of PRICE_NEGATIVE) {
    if (lower.includes(p)) return { score: -0.8, positive: false };
  }
  return null;
}

/** Determine dominant issue category from text, respecting product-category exclusions */
function classifyIssueCategory(text: string, productCategory?: string): string {
  const lower = text.toLowerCase();
  const excluded = getExcludedCategories(productCategory);
  let bestCategory = "General";
  let bestScore = 0;
  for (const [cat, indicators] of Object.entries(ISSUE_CATEGORIES)) {
    if (excluded.has(cat)) continue;
    let score = 0;
    for (const ind of indicators) {
      if (lower.includes(ind)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  return bestCategory;
}

/**
 * FCO: Classify a sentence into Function category, Context, and Outcome direction.
 * Returns a meaning-unit keyword string like "Picture Quality – Deep blacks even in bright rooms"
 */
function classifySentenceFCO(sentence: string, productCategory?: string): { function: string; context: string; isPositive: boolean } {
  const lower = sentence.toLowerCase();
  const excluded = getExcludedCategories(productCategory);
  let bestFunc = "General";
  let bestScore = 0;
  for (const [func, indicators] of Object.entries(FUNCTION_CATEGORIES)) {
    if (excluded.has(func)) continue;
    let score = 0;
    for (const ind of indicators) {
      if (lower.includes(ind)) score++;
    }
    if (score > bestScore) { bestScore = score; bestFunc = func; }
  }

  // Derive context clues
  const contextClues: string[] = [];
  const contextPatterns = [
    /\b(?:in|at|during|for|while|when)\s+(?:the\s+)?([^,.!?]{3,30})/gi,
    /\b(?:with|using|on)\s+(?:my|the|a)?\s*([^,.!?]{3,20})/gi,
  ];
  for (const pat of contextPatterns) {
    pat.lastIndex = 0;
    const m = pat.exec(sentence);
    if (m?.[1]) contextClues.push(m[1].trim());
  }

  // Outcome: check if positive or negative using contextual scoring
  let posSignals = 0, negSignals = 0;

  // "too + adj" → negative
  TOO_PATTERN.lastIndex = 0;
  if (TOO_PATTERN.test(lower)) negSignals += 2;

  // "no issues" patterns → positive
  for (const pat of NO_PROBLEM_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(lower)) posSignals += 2;
  }

  // Sarcasm → negative
  for (const pat of SARCASTIC_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(lower)) negSignals += 2;
  }

  const words = lower.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const cleanWord = words[i].replace(/[^a-z'-]/g, "");

    // Skip context-neutral words for the given product category
    if (productCategory && CONTEXT_NEUTRAL_WORDS[cleanWord]?.includes(productCategory)) continue;

    if (POSITIVE_WORDS[cleanWord] !== undefined) {
      // Check negation before this word
      if (hasNegation(words, i)) {
        negSignals++;
      } else {
        posSignals++;
      }
    } else if (NEGATIVE_WORDS[cleanWord] !== undefined) {
      if (hasNegation(words, i)) {
        posSignals += 0.5; // "not bad" is weakly positive
      } else {
        negSignals++;
      }
    }
  }

  return {
    function: bestFunc,
    context: contextClues[0] || "",
    isPositive: posSignals >= negSignals,
  };
}

/** Build a meaning-unit keyword from FCO analysis */
export function buildMeaningKeyword(sentence: string): string {
  const fco = classifySentenceFCO(sentence);
  const evidence = extractEvidencePhrase(sentence, 10, 3);
  return `${fco.function} – ${evidence}`;
}

/** Extract best evidence phrase (5-12 words) from a sentence */
function extractEvidencePhrase(sentence: string, maxWords = 12, minWords = 4): string {
  const words = sentence.trim().split(/\s+/);
  if (words.length <= maxWords) return sentence.trim();
  // Try to find the segment with most sentiment-bearing words
  let bestStart = 0;
  let bestScore = 0;
  const allSentimentWords = new Set([...Object.keys(POSITIVE_WORDS), ...Object.keys(NEGATIVE_WORDS)]);
  for (let i = 0; i <= words.length - minWords; i++) {
    const end = Math.min(i + maxWords, words.length);
    const segment = words.slice(i, end);
    let score = 0;
    for (const w of segment) {
      if (allSentimentWords.has(w.toLowerCase().replace(/[^a-z-]/g, ""))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }
  return words.slice(bestStart, bestStart + maxWords).join(" ");
}

// ═══════════════════════════════════════════════════════════════════
// CORE ANALYSIS
// ═══════════════════════════════════════════════════════════════════

interface ReviewSignals {
  baseScore: number;
  intensifierMult: number;
  negationApplied: boolean;
  comparativeBonus: number;
  valueSignal: number;
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  evidencePhrase: string;
  issueCategory: string;
  competitive: CompetitiveMention | null;
  priceFlag: boolean;
}

function analyzeReviewText(text: string, source: string, existingSentiment?: string, existingScore?: number, productCategory?: string): ReviewSignals {
  const sourceWeight = getSourceWeight(source);
  let totalScore = 0;
  let sentenceCount = 0;
  let bestPosPhrase = "";
  let bestNegPhrase = "";
  let bestPosScore = 0;
  let bestNegScore = 0;
  let intensifierMult = 1.0;
  let negationApplied = false;
  let comparativeBonus = 0;
  let valueSignal = 0;
  let competitive: CompetitiveMention | null = null;
  let priceFlag = false;

  // ── Split by contrastive conjunctions into weighted clauses ──
  const clauses = text.split(CONTRASTIVE_CONJUNCTIONS).filter(c => c.trim().length > 3);
  // The clause AFTER a contrastive conjunction gets 1.3x weight (it's the "real point")
  const clauseWeights: number[] = [];
  let afterContrastive = false;
  for (const clause of clauses) {
    if (CONTRASTIVE_CONJUNCTIONS.test(clause.trim())) {
      afterContrastive = true;
      clauseWeights.push(0); // the conjunction itself
      continue;
    }
    clauseWeights.push(afterContrastive ? 1.3 : 1.0);
    afterContrastive = false;
  }

  for (let ci = 0; ci < clauses.length; ci++) {
    const clause = clauses[ci];
    if (CONTRASTIVE_CONJUNCTIONS.test(clause.trim())) continue;
    const clauseWeight = clauseWeights[ci] ?? 1.0;

    const sentences = splitSentences(clause);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const words = lower.split(/\s+/);
      let sentenceScore = 0;
      let matchCount = 0;

      // ── "too + adj" pattern → strong negative ──
      TOO_PATTERN.lastIndex = 0;
      let tooMatch;
      while ((tooMatch = TOO_PATTERN.exec(lower)) !== null) {
        sentenceScore -= 0.7;
        matchCount++;
      }

      // ── "no issues" patterns → positive ──
      for (const pat of NO_PROBLEM_PATTERNS) {
        pat.lastIndex = 0;
        if (pat.test(lower)) {
          sentenceScore += 0.6;
          matchCount++;
        }
      }

      // ── Sarcasm → negative ──
      for (const pat of SARCASTIC_PATTERNS) {
        pat.lastIndex = 0;
        if (pat.test(lower)) {
          sentenceScore -= 0.7;
          matchCount++;
        }
      }

      // Rule A + B: Word-level scoring with negation & intensifier
      for (let i = 0; i < words.length; i++) {
        const cleanWord = words[i].replace(/[^a-z'-]/g, "");
        if (!cleanWord) continue;

        // Skip context-neutral words for this product category
        if (productCategory && CONTEXT_NEUTRAL_WORDS[cleanWord]?.includes(productCategory)) continue;

        // Skip if preceded by "too" (already scored above)
        if (i > 0 && words[i - 1].replace(/[^a-z]/g, "") === "too") continue;

        let wordScore = 0;

        if (POSITIVE_WORDS[cleanWord] !== undefined) {
          wordScore = POSITIVE_WORDS[cleanWord];
        } else if (NEGATIVE_WORDS[cleanWord] !== undefined) {
          wordScore = NEGATIVE_WORDS[cleanWord];
        } else {
          continue;
        }

        // Rule A: Negation check
        if (hasNegation(words, i)) {
          if (wordScore > 0) {
            wordScore *= -0.8; // "not great" → moderately negative
          } else {
            wordScore *= -0.5; // "not bad" → weakly positive
          }
          negationApplied = true;
        }

        matchCount++;
        sentenceScore += wordScore;
      }

      // Rule B: Intensifier amplification at sentence level
      const intMult = getIntensifierMultiplier(sentence);
      if (intMult > 1.0) {
        sentenceScore *= intMult;
        intensifierMult = Math.max(intensifierMult, intMult);
      }

      // Rule D: Competitive
      const comp = detectCompetitive(sentence);
      if (comp) {
        comparativeBonus += comp.score;
        competitive = { brand: comp.brand, win: comp.type === "competitive_win" };
      }

      // Rule E: Temporal/conditional
      const temporal = detectTemporalConditional(sentence);
      if (temporal) {
        sentenceScore += temporal.score;
      }

      // Rule F: Price/value
      const pv = detectPriceValue(sentence);
      if (pv) {
        valueSignal += pv.score;
        if (!pv.positive) priceFlag = true;
      }

      // Apply source weight and clause weight
      sentenceScore *= sourceWeight * clauseWeight;

      if (matchCount > 0) {
        // Track best evidence
        const evidence = extractEvidencePhrase(sentence);
        if (sentenceScore > bestPosScore) {
          bestPosScore = sentenceScore;
          bestPosPhrase = evidence;
        }
        if (sentenceScore < bestNegScore) {
          bestNegScore = sentenceScore;
          bestNegPhrase = evidence;
        }
      }

      totalScore += sentenceScore;
      sentenceCount++;
    }
  }

  // If we got no matched words, fall back to existing sentiment/score
  if (sentenceCount === 0 || (bestPosScore === 0 && bestNegScore === 0)) {
    if (existingSentiment && existingScore !== undefined) {
      const baseScore = existingSentiment === "positive" ? Math.abs(existingScore) :
        existingSentiment === "negative" ? -Math.abs(existingScore) : 0;
      return {
        baseScore,
        intensifierMult: 1.0,
        negationApplied: false,
        comparativeBonus: 0,
        valueSignal: 0,
        sentiment: existingSentiment as any,
        evidencePhrase: extractEvidencePhrase(text),
        issueCategory: classifyIssueCategory(text, productCategory),
        competitive: null,
        priceFlag: false,
      };
    }
    return {
      baseScore: 0,
      intensifierMult: 1.0,
      negationApplied: false,
      comparativeBonus: 0,
      valueSignal: 0,
      sentiment: "neutral",
      evidencePhrase: "",
      issueCategory: "General",
      competitive: null,
      priceFlag: false,
    };
  }

  // Layer 3: Composite calculation
  const avgSentenceScore = totalScore / Math.max(sentenceCount, 1);
  const compositeRaw = avgSentenceScore + comparativeBonus * 0.3 + valueSignal * 0.2;

  let sentiment: "positive" | "negative" | "mixed" | "neutral";
  if (compositeRaw > 0.15) sentiment = "positive";
  else if (compositeRaw < -0.15) sentiment = "negative";
  else if (Math.abs(bestPosScore) > 0.3 && Math.abs(bestNegScore) > 0.3) sentiment = "mixed";
  else sentiment = "neutral";

  return {
    baseScore: compositeRaw,
    intensifierMult,
    negationApplied,
    comparativeBonus,
    valueSignal,
    sentiment: sentiment === "mixed" ? "neutral" : sentiment,
    evidencePhrase: sentiment === "negative" ? bestNegPhrase : bestPosPhrase,
    issueCategory: classifyIssueCategory(text, productCategory),
    competitive,
    priceFlag,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PHRASE EXTRACTION (kept for backward compat)
// ═══════════════════════════════════════════════════════════════════

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function capitalizePhrase(str: string): string {
  return str.split(" ").map((w, i) => i === 0 || w.length > 3 ? capitalize(w) : w).join(" ");
}

function extractPhrases(reviews: Review[]): { positive: Map<string, number>; negative: Map<string, number> } {
  const posPhrases = new Map<string, number>();
  const negPhrases = new Map<string, number>();

  for (const review of reviews) {
    const text = review.text.toLowerCase();
    for (const noun of FEATURE_NOUNS) {
      const nounLower = noun.toLowerCase();
      if (!text.includes(nounLower)) continue;

      for (const adj of Object.keys(POSITIVE_WORDS)) {
        const pattern = new RegExp(`\\b${escapeRegex(adj)}\\b[\\w\\s,]{0,30}\\b${escapeRegex(nounLower)}\\b`, "i");
        if (pattern.test(text)) {
          const phrase = `${capitalize(adj)} ${capitalizePhrase(noun)}`;
          posPhrases.set(phrase, (posPhrases.get(phrase) || 0) + 1);
        }
        // Reverse: noun is/are adj
        const revPattern = new RegExp(`\\b${escapeRegex(nounLower)}\\b[\\w\\s]{0,10}\\b(?:is|are|was|were|feels?|looks?)\\s+${escapeRegex(adj)}\\b`, "i");
        if (revPattern.test(text)) {
          const phrase = `${capitalize(adj)} ${capitalizePhrase(noun)}`;
          posPhrases.set(phrase, (posPhrases.get(phrase) || 0) + 1);
        }
      }

      for (const adj of Object.keys(NEGATIVE_WORDS)) {
        const pattern = new RegExp(`\\b${escapeRegex(adj)}\\b[\\w\\s,]{0,30}\\b${escapeRegex(nounLower)}\\b`, "i");
        if (pattern.test(text)) {
          const phrase = `${capitalize(adj)} ${capitalizePhrase(noun)}`;
          negPhrases.set(phrase, (negPhrases.get(phrase) || 0) + 1);
        }
        const revPattern = new RegExp(`\\b${escapeRegex(nounLower)}\\b[\\w\\s]{0,10}\\b(?:is|are|was|were|feels?|looks?)\\s+${escapeRegex(adj)}\\b`, "i");
        if (revPattern.test(text)) {
          const phrase = `${capitalize(adj)} ${capitalizePhrase(noun)}`;
          negPhrases.set(phrase, (negPhrases.get(phrase) || 0) + 1);
        }
      }
    }
  }
  return { positive: posPhrases, negative: negPhrases };
}

function sortByFrequency(map: Map<string, number>): string[] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([phrase]) => phrase);
}

// ═══════════════════════════════════════════════════════════════════
// USAGE SCENE EXTRACTION
// ═══════════════════════════════════════════════════════════════════

const SCENE_PLACES = [
  "kitchen", "bedroom", "living room", "bathroom", "office", "desk", "garage",
  "patio", "balcony", "backyard", "garden", "outdoor", "outdoors", "camping",
  "tailgating", "road trip", "hotel", "dorm", "dorm room", "apartment",
  "small space", "studio", "gym", "workout room", "home gym", "basement",
  "nursery", "kids room", "game room", "man cave", "shed", "RV", "van",
  "poolside", "beach", "park", "rooftop", "terrace", "laundry room",
];
const SCENE_SITUATIONS = [
  "cooking", "working from home", "WFH", "remote work", "work from bed",
  "movie night", "binge watching", "gaming", "streaming", "video call",
  "zoom call", "exercise", "yoga", "meditation", "bedtime", "night routine",
  "morning routine", "multitasking", "studying", "reading recipes",
  "following tutorials", "music listening", "party", "entertaining guests",
  "kids entertainment", "baby monitor", "pet cam", "presentation",
  "photo editing", "content creation", "podcast", "karaoke",
  "outdoor movie", "tailgate party", "picnic", "barbecue", "BBQ",
  "travel", "commute", "flight", "hotel room",
];
const SCENE_PATTERNS = [
  /\b(?:use|using|used)\s+(?:it|this|mine)\s+(?:in|at|for|during|while)\s+(?:the\s+)?([^,.!?]{3,40})/gi,
  /\b(?:great|perfect|ideal|amazing|awesome|convenient|handy)\s+(?:for|in|at|during)\s+(?:the\s+)?([^,.!?]{3,40})/gi,
  /\b(?:in|at)\s+(?:my|the|our)\s+([^,.!?]{3,30})/gi,
  /\b(?:while|when|during)\s+([^,.!?]{3,30})/gi,
];

function extractUsageScenes(reviews: Review[]): string[] {
  const sceneMap = new Map<string, number>();
  for (const review of reviews) {
    const textLower = review.text.toLowerCase();
    for (const place of SCENE_PLACES) {
      if (textLower.includes(place.toLowerCase())) {
        const n = place.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        sceneMap.set(n, (sceneMap.get(n) || 0) + 1);
      }
    }
    for (const sit of SCENE_SITUATIONS) {
      if (textLower.includes(sit.toLowerCase())) {
        const n = sit.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        sceneMap.set(n, (sceneMap.get(n) || 0) + 1);
      }
    }
    for (const pattern of SCENE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(review.text)) !== null) {
        const scene = (match[1] || "").trim();
        if (scene.length >= 4 && scene.length <= 40) {
          const filler = ["the", "a", "an", "it", "this", "that", "my", "your", "i", "we"];
          const words = scene.toLowerCase().split(/\s+/);
          if (words.filter(w => !filler.includes(w)).length >= 1) {
            const n = scene.charAt(0).toUpperCase() + scene.slice(1);
            sceneMap.set(n, (sceneMap.get(n) || 0) + 1);
          }
        }
      }
    }
  }
  return [...sceneMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, c]) => `${s} (${c}x)`);
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API: analyzeSentiment
// ═══════════════════════════════════════════════════════════════════

// ── Roadmap v2 helpers ────────────────────────────────────────────

/** Canonical competitor brand list with masking labels */
const COMPETITOR_BRANDS: { name: string; masked: string; pattern: RegExp }[] = [
  { name: "Samsung",   masked: "SS",      pattern: /\b(samsung|galaxy|bravia samsung)\b/gi },
  { name: "Sony",      masked: "SN",      pattern: /\b(sony|bravia)\b/gi },
  { name: "TCL",       masked: "C브랜드", pattern: /\btcl\b/gi },
  { name: "Hisense",   masked: "C브랜드", pattern: /\bhisense\b/gi },
  { name: "Vizio",     masked: "C브랜드", pattern: /\bvizio\b/gi },
  { name: "Panasonic", masked: "기타",    pattern: /\bpanasonic\b/gi },
  { name: "Philips",   masked: "기타",    pattern: /\bphilips\b/gi },
  { name: "Bose",      masked: "기타",    pattern: /\bbose\b/gi },
  { name: "Sonos",     masked: "기타",    pattern: /\bsonos\b/gi },
  { name: "Whirlpool", masked: "기타",    pattern: /\bwhirlpool\b/gi },
  { name: "Bosch",     masked: "기타",    pattern: /\bbosch\b/gi },
  { name: "Dyson",     masked: "기타",    pattern: /\bdyson\b/gi },
  { name: "Apple",     masked: "기타",    pattern: /\bapple\b/gi },
];

const COMPARISON_TRIGGERS = [
  "vs", "vs.", "versus", "compared to", "compared with", "than", "over",
  "switched from", "switched to", "moved from", "moved to", "instead of",
  // Multilingual
  "im vergleich zu", "verglichen mit", "besser als", "schlechter als",   // DE
  "par rapport à", "comparé à", "meilleur que", "pire que",              // FR
  "comparado con", "frente a", "mejor que", "peor que",                  // ES
];

/**
 * Detect explicit "vs Brand" / "than Brand" comparisons.
 * Returns one flag per (brand, sentence) pair.
 */
function detectCompetitorComparisons(text: string): CompetitorComparisonFlag[] {
  if (!text) return [];
  const flags: CompetitorComparisonFlag[] = [];
  const sentences = text.split(/[.!?。！？\n]+/).map(s => s.trim()).filter(s => s.length > 4);
  const lowerTriggers = COMPARISON_TRIGGERS.map(t => t.toLowerCase());

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    for (const brand of COMPETITOR_BRANDS) {
      brand.pattern.lastIndex = 0;
      if (!brand.pattern.test(sentence)) continue;

      // Find which trigger phrase appears
      const matchedTrigger = lowerTriggers.find(t => lower.includes(t));
      if (!matchedTrigger) continue;

      // Outcome heuristic
      let outcome: "win" | "loss" | "neutral" = "neutral";
      const lgFirst =
        /\blg\b[^.!?]{0,40}(?:better|beats|wins|preferred|выше|besser|meilleur|mejor)/i.test(sentence) ||
        /(better than|beats|wins over|preferred over|besser als|meilleur que|mejor que)\s+(samsung|sony|tcl|hisense|vizio|panasonic|philips|bose|sonos|whirlpool|bosch|dyson|apple)/i.test(sentence);
      const brandFirst = new RegExp(
        `${brand.name}\\s+(?:is\\s+)?(?:better|beats|wins|superior|besser|meilleur|mejor)`,
        "i"
      ).test(sentence) ||
        new RegExp(`(?:switched|moved|going)\\s+(?:from\\s+lg\\s+)?to\\s+${brand.name}`, "i").test(sentence);

      if (lgFirst) outcome = "win";
      else if (brandFirst) outcome = "loss";

      flags.push({
        brand: brand.name,
        maskedBrand: brand.masked,
        pattern: matchedTrigger,
        outcome,
        evidence: sentence.length > 140 ? sentence.slice(0, 137) + "…" : sentence,
      });
    }
  }
  return flags;
}

// ── 6-Emotion lexicon (Beta) ──
// Maps each emotion to multilingual cue words.
const EMOTION_LEXICON: Record<EmotionLabel, string[]> = {
  satisfaction: [
    "satisfied", "love", "happy", "great", "perfect", "delighted", "pleased",
    "만족", "좋아요", "최고",
    "zufrieden", "perfekt", "toll",
    "satisfait", "content", "parfait",
    "satisfecho", "encantado", "perfecto",
  ],
  disappointment: [
    "disappointed", "disappointing", "let down", "underwhelming", "expected better",
    "실망", "아쉬",
    "enttäuscht", "enttäuschend",
    "déçu", "décevant",
    "decepcionado", "decepcionante",
  ],
  expectation: [
    "hope", "hoping", "looking forward", "can't wait", "expect", "anticipate", "excited",
    "기대", "고대",
    "freue mich", "erwarte",
    "hâte", "j'espère", "j'attends",
    "espero", "tengo ganas", "ansío",
  ],
  anxiety: [
    "worried", "concerned", "afraid", "nervous", "uncertain", "unsure",
    "걱정", "불안", "염려",
    "besorgt", "ängstlich", "unsicher",
    "inquiet", "préoccupé", "incertain",
    "preocupado", "ansioso", "inseguro",
  ],
  anger: [
    "angry", "furious", "outraged", "ridiculous", "pissed", "rage", "scam",
    "화남", "분노", "어이없",
    "wütend", "verärgert",
    "en colère", "furieux", "scandaleux",
    "enojado", "furioso", "indignante",
  ],
  trust: [
    "trust", "reliable", "dependable", "consistent", "honest", "loyal", "long-time",
    "신뢰", "믿음",
    "vertrauen", "zuverlässig",
    "confiance", "fiable",
    "confianza", "fiable", "confío",
  ],
};

function classifyEmotions(texts: string[]): EmotionDistribution {
  const counts: Record<EmotionLabel, number> = {
    satisfaction: 0, disappointment: 0, expectation: 0,
    anxiety: 0, anger: 0, trust: 0,
  };
  for (const t of texts) {
    if (!t) continue;
    const lower = t.toLowerCase();
    for (const [emotion, cues] of Object.entries(EMOTION_LEXICON) as [EmotionLabel, string[]][]) {
      for (const cue of cues) {
        if (lower.includes(cue.toLowerCase())) {
          counts[emotion]++;
          break; // count once per review per emotion
        }
      }
    }
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  let dominant: EmotionLabel | "none" = "none";
  let best = 0;
  for (const [k, v] of Object.entries(counts) as [EmotionLabel, number][]) {
    if (v > best) { best = v; dominant = k; }
  }
  return { ...counts, dominant: total === 0 ? "none" : dominant, beta: true };
}

/** Cheap heuristic language detector based on stopwords/diacritics */
function detectLanguage(text: string): string {
  if (!text) return "unknown";
  const lower = text.toLowerCase();
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(text)) return "ja";
  if (/\b(der|die|das|und|nicht|sehr|ist|mit|für|aber)\b/.test(lower)) return "de";
  if (/\b(le|la|les|et|pas|très|avec|pour|mais|bien)\b/.test(lower) || /[àâçéèêëîïôûùüÿœ]/.test(lower)) return "fr";
  if (/\b(el|la|los|las|y|no|muy|con|para|pero|bien)\b/.test(lower) || /[áéíóúñ¿¡]/.test(lower)) return "es";
  return "en";
}

export function analyzeSentiment(reviews: Review[], productCategory?: string): SentimentResult {
  let positive = 0, negative = 0, neutral = 0;
  let hasRealText = false;
  let totalComposite = 0;
  const posKeywords = new Map<string, number>();
  const negKeywords = new Map<string, number>();
  const allCompetitive: CompetitiveMention[] = [];
  let priceNegCount = 0;
  const issueCounts = new Map<string, number>();
  const signals: SentimentSignal[] = [];
  let crossProductMentionCount = 0;

  // Track best evidence phrases
  let bestPosEvidence = { phrase: "", score: -Infinity };
  let bestNegEvidence = { phrase: "", score: Infinity };

  for (const review of reviews) {
    // Use _analysisText (real content) for analysis if available, otherwise use text
    const analysisText = (review as any)._analysisText || review.text;
    
    // ── Subject-bound FCO: detect cross-product comparisons ──
    if (analysisText && productCategory) {
      const hasCross = detectCrossProductComparison(analysisText, productCategory);
      if (hasCross) crossProductMentionCount++;
    }

    // Check if this review has real (non-placeholder) text
    const isRealText = analysisText && !/개인정보 보호 정책|LG 리뷰 — 감성|긍정적 사용 경험|불만 또는 개선|중립적 의견/.test(analysisText) && analysisText.length > 20;
    if (isRealText) hasRealText = true;

    const result = analyzeReviewText(
      analysisText,
      review.source,
      review.sentiment,
      review.score,
      productCategory
    );

    // Count sentiment buckets
    if (result.sentiment === "positive") positive++;
    else if (result.sentiment === "negative") negative++;
    else neutral++;

    // Composite score (normalize -1..+1 to 0..100)
    const normalized = Math.max(0, Math.min(100, (result.baseScore + 1) * 50));
    totalComposite += normalized;

    // Keywords: FCO meaning-unit extraction (sentence-level, not word-level)
    // Combine title + text for richer keyword extraction
    const textForKeywords = isRealText
      ? (review.title ? `${review.title}. ${analysisText}` : analysisText)
      : (review.title || "");
    const reviewSentences = splitSentences(textForKeywords);
    
    // For short title-only reviews, try direct feature matching as fallback
    let foundKeywordInReview = false;
    for (const sent of reviewSentences) {
      const fco = classifySentenceFCO(sent, productCategory);
      if (fco.function === "General") continue;
      foundKeywordInReview = true;
      const meaningKey = `${fco.function} – ${extractEvidencePhrase(sent, 8, 3)}`;
      if (fco.isPositive) {
        posKeywords.set(meaningKey, (posKeywords.get(meaningKey) || 0) + 1);
      } else {
        negKeywords.set(meaningKey, (negKeywords.get(meaningKey) || 0) + 1);
      }
    }

    // Fallback: if no FCO keyword found but we have title + sentiment, create a simple keyword
    if (!foundKeywordInReview && review.title && review.title.length >= 3) {
      const titleLower = review.title.toLowerCase();
      // Try to match title against known positive/negative words to create keywords
      let matched = false;
      for (const w of Object.keys(POSITIVE_WORDS)) {
        if (titleLower.includes(w) && review.sentiment !== "negative") {
          const key = `Value & Price – ${review.title}`;
          posKeywords.set(key, (posKeywords.get(key) || 0) + 1);
          matched = true;
          break;
        }
      }
      if (!matched) {
        for (const w of Object.keys(NEGATIVE_WORDS)) {
          if (titleLower.includes(w) && review.sentiment !== "positive") {
            const key = `Reliability & Quality – ${review.title}`;
            negKeywords.set(key, (negKeywords.get(key) || 0) + 1);
            matched = true;
            break;
          }
        }
      }
      // Last resort: use sentiment to bucket the title
      if (!matched && review.sentiment) {
        if (review.sentiment === "positive") {
          posKeywords.set(`General – ${review.title}`, (posKeywords.get(`General – ${review.title}`) || 0) + 1);
        } else if (review.sentiment === "negative") {
          negKeywords.set(`General – ${review.title}`, (negKeywords.get(`General – ${review.title}`) || 0) + 1);
        }
      }
    }

    // Best evidence
    if (result.baseScore > bestPosEvidence.score && result.evidencePhrase) {
      bestPosEvidence = { phrase: result.evidencePhrase, score: result.baseScore };
    }
    if (result.baseScore < bestNegEvidence.score && result.evidencePhrase) {
      bestNegEvidence = { phrase: result.evidencePhrase, score: result.baseScore };
    }

    // Competitive
    if (result.competitive) allCompetitive.push(result.competitive);

    // Price sensitivity
    if (result.priceFlag) priceNegCount++;

    // Issue category
    issueCounts.set(result.issueCategory, (issueCounts.get(result.issueCategory) || 0) + 1);

    // Build signal
    if (result.evidencePhrase) {
      signals.push({
        product: extractProductEntity(analysisText),
        sentiment: result.sentiment === "neutral" ? "mixed" : result.sentiment,
        score: result.baseScore,
        evidencePhrase: result.evidencePhrase,
        category: result.issueCategory,
        type: result.competitive
          ? (result.competitive.win ? "competitive_win" : "competitive_loss")
          : result.priceFlag ? "price_value" : "general",
      });
    }
  }

  const total = positive + negative + neutral;
  const compositeScore = total > 0 ? Math.round(totalComposite / total) : 50;

  // Dominant issue category
  let dominantIssue = "General";
  let dominantCount = 0;
  for (const [cat, cnt] of issueCounts) {
    if (cnt > dominantCount && cat !== "General") {
      dominantCount = cnt;
      dominantIssue = cat;
    }
  }

  // Price sensitivity flag: >5% of reviews
  const priceSensitivityFlag = total > 0 && (priceNegCount / total) > 0.05;

  // Sorted keywords by frequency
  const sortedPosKw = [...posKeywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w);
  const sortedNegKw = [...negKeywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w);

  // Phrases
  const phraseResult = extractPhrases(reviews);

  // Usage scenes
  const usageScenes = extractUsageScenes(reviews);

  // Sort signals by absolute score for display
  signals.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  const reviewCount = reviews.length;
  const avgConfidence = reviewCount > 0
    ? Math.max(0, 1 - (crossProductMentionCount / reviewCount) * 0.5)
    : 1;

  return {
    positive,
    negative,
    neutral,
    averageScore: compositeScore / 100,
    compositeScore,
    keywords: { positive: sortedPosKw, negative: sortedNegKw },
    phrases: {
      positive: sortByFrequency(phraseResult.positive),
      negative: sortByFrequency(phraseResult.negative),
    },
    usageScenes,
    topPositivePhrase: bestPosEvidence.phrase,
    topNegativePhrase: bestNegEvidence.phrase,
    dominantIssueCategory: dominantIssue,
    priceSensitivityFlag,
    competitiveMentions: allCompetitive,
    signals: signals.slice(0, 20),
    hasTextData: hasRealText,
    ratingOnlyMode: !hasRealText,
    primarySubject: productCategory || "Unknown",
    hasCrossProductMention: crossProductMentionCount > 0,
    confidence: avgConfidence,
  };
}
