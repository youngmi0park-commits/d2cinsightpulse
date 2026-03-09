import type { Review } from "@/data/dummyData";

export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
  keywords: { positive: string[]; negative: string[] };
}

const positiveKeywords = [
  "stunning", "amazing", "incredible", "best", "love", "perfect", "great",
  "excellent", "phenomenal", "gorgeous", "breathtaking", "recommended",
  "worth", "magic", "easy", "convenient", "quiet", "efficient",
  "좋", "훌륭", "추천", "편해", "조용", "강추", "절약",
];

const negativeKeywords = [
  "slow", "bloated", "frustrating", "disappointing", "poor", "worried",
  "plasticky", "complaint", "barely", "expensive", "bad", "broken",
  "아쉬", "고장", "비싸", "걱정", "실망", "축축",
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
