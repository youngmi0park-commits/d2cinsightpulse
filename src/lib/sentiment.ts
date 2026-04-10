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
};

const NEGATION_TOKENS = [
  "not", "never", "no", "isn't", "wasn't", "don't", "can't",
  "won't", "barely", "hardly", "fails to", "unable to",
  "doesn't", "didn't", "couldn't", "shouldn't", "wouldn't",
  "neither", "nor", "without",
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

/** Determine dominant issue category from text */
function classifyIssueCategory(text: string): string {
  const lower = text.toLowerCase();
  let bestCategory = "General";
  let bestScore = 0;
  for (const [cat, indicators] of Object.entries(ISSUE_CATEGORIES)) {
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
function classifySentenceFCO(sentence: string): { function: string; context: string; isPositive: boolean } {
  const lower = sentence.toLowerCase();
  let bestFunc = "General";
  let bestScore = 0;
  for (const [func, indicators] of Object.entries(FUNCTION_CATEGORIES)) {
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

  // Outcome: check if positive or negative
  let posSignals = 0, negSignals = 0;
  for (const w of Object.keys(POSITIVE_WORDS)) { if (lower.includes(w)) posSignals++; }
  for (const w of Object.keys(NEGATIVE_WORDS)) { if (lower.includes(w)) negSignals++; }
  // Check negation flipping
  const hasNeg = NEGATION_TOKENS.some(n => lower.includes(n));
  if (hasNeg) { [posSignals, negSignals] = [negSignals, posSignals]; }

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

function analyzeReviewText(text: string, source: string, existingSentiment?: string, existingScore?: number): ReviewSignals {
  const sentences = splitSentences(text);
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

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const words = lower.split(/\s+/);
    let sentenceScore = 0;
    let matchCount = 0;

    // Rule A + B: Word-level scoring with negation & intensifier
    for (let i = 0; i < words.length; i++) {
      const cleanWord = words[i].replace(/[^a-z'-]/g, "");
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
          wordScore *= -1; // Flip positive to negative
        } else {
          wordScore *= -0.7; // Flip negative to weakly positive
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

    // Apply source weight
    sentenceScore *= sourceWeight;

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
        issueCategory: classifyIssueCategory(text),
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
  if (compositeRaw > 0.2) sentiment = "positive";
  else if (compositeRaw < -0.2) sentiment = "negative";
  else if (Math.abs(bestPosScore) > 0 && Math.abs(bestNegScore) > 0) sentiment = "mixed";
  else sentiment = "neutral";

  return {
    baseScore: compositeRaw,
    intensifierMult,
    negationApplied,
    comparativeBonus,
    valueSignal,
    sentiment: sentiment === "mixed" ? "neutral" : sentiment,
    evidencePhrase: sentiment === "negative" ? bestNegPhrase : bestPosPhrase,
    issueCategory: classifyIssueCategory(text),
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

export function analyzeSentiment(reviews: Review[]): SentimentResult {
  let positive = 0, negative = 0, neutral = 0;
  let hasRealText = false;
  let totalComposite = 0;
  const posKeywords = new Map<string, number>();
  const negKeywords = new Map<string, number>();
  const allCompetitive: CompetitiveMention[] = [];
  let priceNegCount = 0;
  const issueCounts = new Map<string, number>();
  const signals: SentimentSignal[] = [];

  // Track best evidence phrases
  let bestPosEvidence = { phrase: "", score: -Infinity };
  let bestNegEvidence = { phrase: "", score: Infinity };

  for (const review of reviews) {
    // Use _analysisText (real content) for analysis if available, otherwise use text
    const analysisText = (review as any)._analysisText || review.text;
    
    // Check if this review has real (non-placeholder) text
    const isRealText = analysisText && !/개인정보 보호 정책|LG 리뷰 — 감성|긍정적 사용 경험|불만 또는 개선|중립적 의견/.test(analysisText) && analysisText.length > 20;
    if (isRealText) hasRealText = true;

    const result = analyzeReviewText(
      analysisText,
      review.source,
      review.sentiment,
      review.score
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
      const fco = classifySentenceFCO(sent);
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
  };
}
