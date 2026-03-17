import type { Review } from "@/data/dummyData";

export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
  keywords: { positive: string[]; negative: string[] };
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

  return {
    positive,
    negative,
    neutral,
    averageScore: reviews.length > 0 ? totalScore / reviews.length : 0,
    keywords: {
      positive: Array.from(posKeywords),
      negative: Array.from(negKeywords),
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
