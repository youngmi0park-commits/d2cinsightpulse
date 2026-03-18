import type { Review } from "@/data/dummyData";

export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
  keywords: { positive: string[]; negative: string[] };
  /** Adjective+Feature compound phrases extracted from reviews, ranked by frequency */
  phrases: { positive: string[]; negative: string[] };
}

// Adjective-focused keywords only (no product names or nouns)
const positiveKeywords = [
  // Feature/Spec descriptors
  "stunning", "amazing", "incredible", "perfect", "great", "excellent",
  "phenomenal", "gorgeous", "breathtaking", "brilliant", "impressive",
  "beautiful", "smooth", "sharp", "vivid", "crisp", "reliable",
  "intuitive", "responsive", "quiet", "efficient", "convenient",
  "comfortable", "durable", "lightweight", "sleek", "fast",
  // Emotional descriptors
  "satisfied", "impressed", "delighted", "premium", "worth it",
  "must-have", "fantastic", "superior", "unmatched", "flawless",
  // Sentiment/Attitude keywords
  "recommend", "love", "good",
];

const negativeKeywords = [
  // Feature/Spec descriptors
  "slow", "bloated", "frustrating", "disappointing", "poor", "cheap",
  "plasticky", "noisy", "dim", "blurry", "laggy", "bulky",
  "flimsy", "unreliable", "uncomfortable", "complicated", "fragile",
  "defective", "overpriced", "mediocre", "annoying", "clunky",
  // Problem descriptors
  "buggy", "inconsistent", "incomplete", "unstable", "glitchy",
  "unresponsive", "outdated", "inferior",
  // Sentiment/Attitude keywords
  "disappointed", "terrible", "awful", "worst", "regret",
  "waste", "avoid", "do not buy",
];

// Feature nouns that adjectives commonly attach to in product reviews
const featureNouns = [
  // Display / Visual
  "picture quality", "image quality", "picture", "display", "screen", "colors", "contrast",
  "brightness", "black levels", "viewing angles", "resolution", "HDR", "motion handling",
  // Audio
  "sound quality", "sound", "audio", "bass", "speakers", "dialogue clarity",
  // Smart / Software
  "smart features", "interface", "remote", "apps", "webOS", "ThinQ",
  "voice control", "setup", "navigation", "software", "updates",
  // Design / Build
  "design", "build quality", "build", "finish", "stand", "slim profile",
  "form factor", "aesthetics", "bezels", "mounting",
  // Performance
  "performance", "speed", "response time", "input lag", "gaming",
  "refresh rate", "processing", "upscaling",
  // Cooling / Appliance
  "cooling", "airflow", "temperature control", "energy efficiency",
  "noise level", "installation", "cleaning", "capacity",
  // Laundry
  "wash quality", "spin cycle", "vibration", "cycle time", "drum",
  // General
  "value", "price", "quality", "durability", "reliability",
  "connectivity", "features", "functionality",
];

// Positive adverb+adjective intensifiers
const positiveIntensifiers = [
  "incredibly", "amazingly", "exceptionally", "remarkably", "surprisingly",
  "absolutely", "truly", "really", "very", "extremely", "super",
];

// Additional positive expression patterns (not pure adjectives)
const positiveExpressions = [
  "best", "top", "leading", "award-winning", "top-rated",
  "high-quality", "well-built", "well-designed", "top-notch",
  "cutting-edge", "state-of-the-art", "next-level", "must-see",
  "standout", "flagship", "class-leading", "top contender",
  "top pick", "highly rated", "crowd favorite",
];

/**
 * Extract "adjective + feature" and "adverb + adjective + feature" compound phrases
 * from review text. Returns phrases ranked by frequency.
 */
function extractPhrases(reviews: Review[]): { positive: Map<string, number>; negative: Map<string, number> } {
  const posPhrases = new Map<string, number>();
  const negPhrases = new Map<string, number>();

  for (const review of reviews) {
    const text = review.text.toLowerCase();

    for (const noun of featureNouns) {
      const nounLower = noun.toLowerCase();
      // Check if the feature noun appears in the text
      if (!text.includes(nounLower)) continue;

      // Look for adjective near the noun (within ~4 words before)
      // Build regex: (adjective) (0-3 words) (noun)
      for (const adj of positiveKeywords) {
        // Pattern: "adj ... noun" or "intensifier adj ... noun"
        const simplePattern = new RegExp(
          `\\b(${positiveIntensifiers.join("|")})?\\s*${escapeRegex(adj)}\\b[\\w\\s,]{0,30}\\b${escapeRegex(nounLower)}\\b`,
          "i"
        );
        const match = text.match(simplePattern);
        if (match) {
          const intensifier = match[1] ? `${capitalize(match[1])} ` : "";
          const phrase = `${intensifier}${capitalize(adj)} ${capitalizePhrase(noun)}`;
          posPhrases.set(phrase, (posPhrases.get(phrase) || 0) + 1);
        }
      }

      for (const adj of negativeKeywords) {
        const pattern = new RegExp(
          `\\b${escapeRegex(adj)}\\b[\\w\\s,]{0,30}\\b${escapeRegex(nounLower)}\\b`,
          "i"
        );
        if (pattern.test(text)) {
          const phrase = `${capitalize(adj)} ${capitalizePhrase(noun)}`;
          negPhrases.set(phrase, (negPhrases.get(phrase) || 0) + 1);
        }
      }

      // Also check positive expressions (e.g. "best picture quality", "top-rated display")
      for (const expr of positiveExpressions) {
        const exprPattern = new RegExp(
          `\\b${escapeRegex(expr)}\\b[\\w\\s,]{0,20}\\b${escapeRegex(nounLower)}\\b`,
          "i"
        );
        if (exprPattern.test(text)) {
          const phrase = `${capitalizePhrase(expr)} ${capitalizePhrase(noun)}`;
          posPhrases.set(phrase, (posPhrases.get(phrase) || 0) + 1);
        }
        // Reverse: "noun ... best/top"
        const revExprPattern = new RegExp(
          `\\b${escapeRegex(nounLower)}\\b[\\w\\s]{0,15}\\b${escapeRegex(expr)}\\b`,
          "i"
        );
        if (revExprPattern.test(text)) {
          const phrase = `${capitalizePhrase(expr)} ${capitalizePhrase(noun)}`;
          posPhrases.set(phrase, (posPhrases.get(phrase) || 0) + 1);
        }
      }
    }

    // Also capture "noun is/are/was adjective" patterns
    for (const noun of featureNouns) {
      const nounLower = noun.toLowerCase();
      if (!text.includes(nounLower)) continue;

      for (const adj of positiveKeywords) {
        const reversePattern = new RegExp(
          `\\b${escapeRegex(nounLower)}\\b[\\w\\s]{0,10}\\b(?:is|are|was|were|feels?|looks?)\\s+(?:${positiveIntensifiers.join("|")}\\s+)?${escapeRegex(adj)}\\b`,
          "i"
        );
        if (reversePattern.test(text)) {
          const phrase = `${capitalize(adj)} ${capitalizePhrase(noun)}`;
          posPhrases.set(phrase, (posPhrases.get(phrase) || 0) + 1);
        }
      }

      for (const adj of negativeKeywords) {
        const reversePattern = new RegExp(
          `\\b${escapeRegex(nounLower)}\\b[\\w\\s]{0,10}\\b(?:is|are|was|were|feels?|looks?)\\s+${escapeRegex(adj)}\\b`,
          "i"
        );
        if (reversePattern.test(text)) {
          const phrase = `${capitalize(adj)} ${capitalizePhrase(noun)}`;
          negPhrases.set(phrase, (negPhrases.get(phrase) || 0) + 1);
        }
      }
    }
  }

  return { positive: posPhrases, negative: negPhrases };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizePhrase(str: string): string {
  // Keep short words like "of", "and" lowercase; capitalize main words
  return str.split(" ").map((w, i) =>
    i === 0 || w.length > 3 ? capitalize(w) : w
  ).join(" ");
}

/** Sort a frequency map by count descending, return keys */
function sortByFrequency(map: Map<string, number>): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase);
}

export function analyzeSentiment(reviews: Review[]): SentimentResult {
  let positive = 0, negative = 0, neutral = 0;
  let totalScore = 0;
  const posKeywords = new Set<string>();
  const negKeywords = new Set<string>();

  reviews.forEach((review) => {
    const sentiment = review.sentiment || classifyText(review.text);
    if (sentiment === "positive") positive++;
    else if (sentiment === "negative") negative++;
    else neutral++;

    totalScore += review.score ?? (sentiment === "positive" ? 0.8 : sentiment === "negative" ? 0.2 : 0.5);

    const textLower = review.text.toLowerCase();
    positiveKeywords.forEach((kw) => {
      if (textLower.includes(kw.toLowerCase())) posKeywords.add(kw);
    });
    negativeKeywords.forEach((kw) => {
      if (textLower.includes(kw.toLowerCase())) negKeywords.add(kw);
    });
  });

  // Extract compound phrases
  const phraseResult = extractPhrases(reviews);

  return {
    positive,
    negative,
    neutral,
    averageScore: reviews.length > 0 ? totalScore / reviews.length : 0,
    keywords: {
      positive: Array.from(posKeywords),
      negative: Array.from(negKeywords),
    },
    phrases: {
      positive: sortByFrequency(phraseResult.positive),
      negative: sortByFrequency(phraseResult.negative),
    },
  };
}

function classifyText(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  let posCount = 0, negCount = 0;
  positiveKeywords.forEach((kw) => { if (lower.includes(kw.toLowerCase())) posCount++; });
  negativeKeywords.forEach((kw) => { if (lower.includes(kw.toLowerCase())) negCount++; });
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}
