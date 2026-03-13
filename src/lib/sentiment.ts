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
  // English adjectives
  "stunning", "amazing", "incredible", "perfect", "great", "excellent",
  "phenomenal", "gorgeous", "breathtaking", "brilliant", "impressive",
  "beautiful", "smooth", "sharp", "vivid", "crisp", "reliable",
  "intuitive", "responsive", "quiet", "efficient", "convenient",
  "comfortable", "durable", "lightweight", "sleek", "fast",
  // Korean adjectives
  "좋은", "훌륭한", "편한", "편리한", "조용한", "깨끗한", "선명한",
  "빠른", "가벼운", "부드러운", "쾌적한", "든든한", "만족스러운",
  "뛰어난", "깔끔한", "세련된", "강력한", "안정적",
];

const negativeKeywords = [
  // English adjectives
  "slow", "bloated", "frustrating", "disappointing", "poor", "cheap",
  "plasticky", "noisy", "dim", "blurry", "laggy", "bulky",
  "flimsy", "unreliable", "uncomfortable", "complicated", "fragile",
  "defective", "overpriced", "mediocre", "annoying", "clunky",
  // Korean adjectives
  "아쉬운", "비싼", "느린", "무거운", "시끄러운", "불편한",
  "어두운", "흐릿한", "약한", "복잡한", "불안정한", "실망스러운",
  "허술한", "조잡한", "답답한",
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
