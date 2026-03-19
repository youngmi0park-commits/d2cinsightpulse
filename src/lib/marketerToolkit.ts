import type { SentimentResult } from "./sentiment";

export interface CustomerExpression {
  text: string;
  tag: "positive" | "negative" | "confusion" | "expectation";
  count: number;
}

export interface ProblemSolutionTemplate {
  problem: string;
  situation: string;
  solution: string;
  copyTemplate: string;
}

export interface SearchIntentAd {
  keyword: string;
  intent: "problem_aware" | "info_seeking" | "comparison" | "purchase";
  intentLabel: string;
  adIdea: string;
}

export interface CrmSegment {
  name: string;
  description: string;
  message: string;
  channel: string;
  offer: string;
}

export interface ContentIdea {
  expression: string;
  contentType: string;
  title: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  frequency: number;
}

export interface ImprovementPoint {
  category: string;
  point: string;
  mentions: number;
  severity: "high" | "medium" | "low";
}

export interface MarketerToolkitData {
  customerExpressions: CustomerExpression[];
  problemSolutionTemplates: ProblemSolutionTemplate[];
  searchIntentAds: SearchIntentAd[];
  crmSegments: CrmSegment[];
  contentIdeas: ContentIdea[];
  faqItems: FaqItem[];
  improvementPoints: ImprovementPoint[];
}

// ─── Expression extraction patterns ───
const CONFUSION_PATTERNS = [
  /how\s+(?:do|to|can)\s+(?:i|you|we)\s+([^.?!]{5,60})/gi,
  /(?:can't|cannot|don't know how|confused|unclear)\s+([^.?!]{5,50})/gi,
  /(?:what|where|why)\s+(?:is|does|do)\s+(?:the\s+)?([^.?!]{5,50})\??/gi,
];

const EXPECTATION_PATTERNS = [
  /(?:wish|hope|would be nice|should have|needs?|want)\s+([^.?!]{5,60})/gi,
  /(?:if only|looking forward|expecting|anticipated)\s+([^.?!]{5,50})/gi,
];

const VIVID_POSITIVE = [
  /(?:i\s+)?(?:love|loved)\s+(?:that|how|the)\s+([^.!]{5,60})/gi,
  /(?:amazed|impressed|surprised|blown away)\s+(?:by|at|with|how)\s+([^.!]{5,60})/gi,
  /(?:never|best)\s+(?:had|seen|experienced|owned)\s+([^.!]{5,60})/gi,
  /([A-Z][^.!]{10,60})\s+(?:is|was)\s+(?:incredible|amazing|stunning|perfect|game.?changer)/gi,
];

const VIVID_NEGATIVE = [
  /(?:hate|hated|annoyed|frustrated)\s+(?:that|by|with|how)\s+([^.!]{5,60})/gi,
  /(?:worst|terrible|awful|horrible|disappointing)\s+([^.!]{5,50})/gi,
  /(?:broke|stopped|failed|died|crashed)\s+(?:after|within|in)\s+([^.!]{5,50})/gi,
];

function extractExpressions(reviews: { text: string; sentiment: string }[]): CustomerExpression[] {
  const expressionMap = new Map<string, { tag: CustomerExpression["tag"]; count: number }>();

  const addMatch = (text: string, tag: CustomerExpression["tag"]) => {
    const clean = text.trim().replace(/\s+/g, " ");
    if (clean.length < 8 || clean.length > 80) return;
    const key = clean.toLowerCase();
    const existing = expressionMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      expressionMap.set(key, { tag, count: 1 });
    }
  };

  for (const review of reviews) {
    const text = review.text;

    for (const p of VIVID_POSITIVE) {
      p.lastIndex = 0;
      let m;
      while ((m = p.exec(text)) !== null) addMatch(m[1] || m[0], "positive");
    }
    for (const p of VIVID_NEGATIVE) {
      p.lastIndex = 0;
      let m;
      while ((m = p.exec(text)) !== null) addMatch(m[1] || m[0], "negative");
    }
    for (const p of CONFUSION_PATTERNS) {
      p.lastIndex = 0;
      let m;
      while ((m = p.exec(text)) !== null) addMatch(m[1] || m[0], "confusion");
    }
    for (const p of EXPECTATION_PATTERNS) {
      p.lastIndex = 0;
      let m;
      while ((m = p.exec(text)) !== null) addMatch(m[1] || m[0], "expectation");
    }
  }

  return [...expressionMap.entries()]
    .map(([text, { tag, count }]) => ({
      text: text.charAt(0).toUpperCase() + text.slice(1),
      tag,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function generateProblemSolutionTemplates(
  productName: string,
  sentiment: SentimentResult
): ProblemSolutionTemplate[] {
  const negPhrases = sentiment.phrases?.negative || [];
  const posPhrases = sentiment.phrases?.positive || [];
  const negKw = sentiment.keywords.negative;
  const posKw = sentiment.keywords.positive;

  const templates: ProblemSolutionTemplate[] = [];

  // Map each negative point to a positive counterpart
  const pairs = negKw.slice(0, 5).map((neg, i) => ({
    problem: neg,
    solution: posKw[i] || posPhrases[0] || "premium quality",
  }));

  for (const pair of pairs) {
    templates.push({
      problem: pair.problem,
      situation: `When you're frustrated by ${pair.problem}`,
      solution: `${productName} delivers ${pair.solution}`,
      copyTemplate: `Tired of "${pair.problem}"?\nFor those who've struggled with ${pair.problem},\nExperience ${pair.solution} with ${productName}.`,
    });
  }

  // Add a general positive template
  if (posPhrases.length > 0) {
    templates.push({
      problem: "choosing the right product",
      situation: "When you're overwhelmed by options",
      solution: `${productName} — ${posPhrases.slice(0, 2).join(", ")}`,
      copyTemplate: `Not sure which to choose?\nReal users highlight: ${posPhrases.slice(0, 2).join(" & ")}.\nDiscover ${productName} today.`,
    });
  }

  return templates.slice(0, 5);
}

function generateSearchIntentAds(
  sentiment: SentimentResult,
  productName: string
): SearchIntentAd[] {
  const ads: SearchIntentAd[] = [];
  const negKw = sentiment.keywords.negative;
  const posKw = sentiment.keywords.positive;

  // Problem-aware ads from negative keywords
  for (const kw of negKw.slice(0, 3)) {
    ads.push({
      keyword: kw,
      intent: "problem_aware",
      intentLabel: "Problem Awareness",
      adIdea: `"Why is it ${kw}?" → Problem-recognition ad highlighting how ${productName} solves this concern`,
    });
  }

  // Info-seeking ads from positive keywords
  for (const kw of posKw.slice(0, 2)) {
    ads.push({
      keyword: kw,
      intent: "info_seeking",
      intentLabel: "Information Seeking",
      adIdea: `"How to maximize ${kw}?" → Educational content + retargeting funnel for ${productName}`,
    });
  }

  // Comparison intent
  if (posKw.length >= 2) {
    ads.push({
      keyword: `best ${posKw[0]}`,
      intent: "comparison",
      intentLabel: "Comparison",
      adIdea: `"Recommend the best?" → Comparison landing page featuring ${productName}'s ${posKw.slice(0, 2).join(" & ")}`,
    });
  }

  // Purchase intent
  ads.push({
    keyword: `buy ${productName}`,
    intent: "purchase",
    intentLabel: "Purchase Intent",
    adIdea: `Direct conversion ad → Highlight top user praise: "${(sentiment.phrases?.positive || [])[0] || posKw[0] || 'Premium Quality'}"`,
  });

  return ads;
}

function generateCrmSegments(
  sentiment: SentimentResult,
  productName: string
): CrmSegment[] {
  const posKw = sentiment.keywords.positive;
  const negKw = sentiment.keywords.negative;
  const score = sentiment.averageScore;

  return [
    {
      name: "Price-OK but Discomfort",
      description: "Customers who find the price acceptable but mention usability issues",
      message: `We've heard you — ${negKw[0] || "your concerns"} matter. See how our latest update improves your experience.`,
      channel: "Email / Push Notification",
      offer: "Free setup guide + priority support access",
    },
    {
      name: "Feature-Fans Seeking Tips",
      description: "Users who love the features but ask how-to questions",
      message: `Unlock the full power of ${productName} — ${posKw.slice(0, 2).join(" & ") || "key features"} and more.`,
      channel: "YouTube / Blog / Email Series",
      offer: "Expert tips video series + community access",
    },
    {
      name: "High-Satisfaction Advocates",
      description: "Strongly positive reviewers likely to repurchase or recommend",
      message: `Thank you for loving ${productName}! Share your experience and earn exclusive rewards.`,
      channel: "SNS / Referral Program / Email",
      offer: "Referral bonus + early access to new products",
    },
    ...(negKw.length > 1
      ? [
          {
            name: "At-Risk Detractors",
            description: `Customers mentioning multiple pain points like ${negKw.slice(0, 2).join(", ")}`,
            message: `We value your honest feedback. Here's how we're addressing ${negKw[0]} — and what's next.`,
            channel: "Personal Email / Customer Service",
            offer: "Extended warranty + dedicated support line",
          },
        ]
      : []),
    ...(score >= 0.6
      ? [
          {
            name: "Upgrade-Ready Loyalists",
            description: "Long-term positive users who may be ready for next-gen products",
            message: `You've enjoyed ${posKw[0] || "great quality"} — imagine what's next. Exclusive upgrade offer inside.`,
            channel: "Email / Dotcom Personalization",
            offer: "Trade-in discount + loyalty points",
          },
        ]
      : []),
  ];
}

function generateContentIdeas(
  sentiment: SentimentResult,
  productName: string
): ContentIdea[] {
  const ideas: ContentIdea[] = [];
  const posPhrases = sentiment.phrases?.positive || [];
  const negPhrases = sentiment.phrases?.negative || [];
  const scenes = sentiment.usageScenes || [];

  // From positive phrases → Reels/Shorts
  for (const phrase of posPhrases.slice(0, 3)) {
    ideas.push({
      expression: phrase,
      contentType: "Reels / Shorts",
      title: `"${phrase}" — Real Users Were Surprised`,
    });
  }

  // From scenes → Lifestyle content
  for (const scene of scenes.slice(0, 2)) {
    const cleanScene = scene.replace(/\s*\(\d+x\)$/, "");
    ideas.push({
      expression: cleanScene,
      contentType: "Card News / Blog",
      title: `${productName} in Your ${cleanScene} — A Day in the Life`,
    });
  }

  // From negative → Myth-busting
  if (negPhrases.length > 0) {
    ideas.push({
      expression: negPhrases[0],
      contentType: "YouTube / Blog",
      title: `"${negPhrases[0]}" — Myth vs. Reality with ${productName}`,
    });
  }

  return ideas.slice(0, 8);
}

function generateFaqItems(
  sentiment: SentimentResult,
  productName: string
): FaqItem[] {
  const faqs: FaqItem[] = [];
  const posKw = sentiment.keywords.positive;
  const negKw = sentiment.keywords.negative;
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;

  if (negKw.length > 0) {
    faqs.push({
      question: `Is "${negKw[0]}" really an issue with ${productName}?`,
      answer: `Some users have mentioned "${negKw[0]}" but ${sentiment.positive > sentiment.negative ? "the majority of reviews are positive" : "this is being actively addressed"}. We recommend checking the latest firmware updates.`,
      frequency: Math.round(total * 0.3),
    });
  }

  if (posKw.length > 0) {
    faqs.push({
      question: `What makes ${productName}'s ${posKw[0]} stand out?`,
      answer: `Users consistently praise the ${posKw.slice(0, 3).join(", ")} — these are the most frequently highlighted strengths across ${total} reviews.`,
      frequency: Math.round(total * 0.4),
    });
  }

  faqs.push({
    question: `How does ${productName} compare to competitors?`,
    answer: `With a ${(sentiment.averageScore * 100).toFixed(0)}/100 satisfaction score and ${sentiment.positive} positive reviews, users highlight ${(sentiment.phrases?.positive || []).slice(0, 2).join(" and ") || "quality features"} as key differentiators.`,
    frequency: Math.round(total * 0.25),
  });

  if (negKw.length > 1) {
    faqs.push({
      question: `Are there any known issues with ${productName}?`,
      answer: `A small number of users have reported concerns about ${negKw.slice(0, 2).join(" and ")}. LG continuously improves through software updates. Overall satisfaction remains at ${(sentiment.averageScore * 100).toFixed(0)}%.`,
      frequency: Math.round(total * 0.2),
    });
  }

  faqs.push({
    question: `Is ${productName} worth the price?`,
    answer: `${sentiment.averageScore >= 0.7 ? "The majority of users consider it excellent value" : "Reviews are mixed on value"} — top mentions include ${posKw.slice(0, 2).join(", ") || "build quality"} as justifications.`,
    frequency: Math.round(total * 0.35),
  });

  return faqs.sort((a, b) => b.frequency - a.frequency);
}

function generateImprovementPoints(
  sentiment: SentimentResult
): ImprovementPoint[] {
  const negKw = sentiment.keywords.negative;
  const negPhrases = sentiment.phrases?.negative || [];
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const points: ImprovementPoint[] = [];

  // Category mapping
  const categoryMap: Record<string, string> = {
    slow: "Performance", laggy: "Performance", buggy: "Performance", glitchy: "Performance", unresponsive: "Performance",
    noisy: "Noise / Sound", loud: "Noise / Sound",
    dim: "Display", blurry: "Display", "black levels": "Display",
    bulky: "Design / Ergonomics", heavy: "Design / Ergonomics", flimsy: "Design / Ergonomics", plasticky: "Design / Ergonomics", cheap: "Design / Ergonomics",
    overpriced: "Pricing", expensive: "Pricing",
    complicated: "UX / Usability", confusing: "UX / Usability", frustrating: "UX / Usability", clunky: "UX / Usability",
    unreliable: "Reliability", defective: "Reliability", fragile: "Reliability", inconsistent: "Reliability",
  };

  for (let i = 0; i < negKw.length && i < 7; i++) {
    const kw = negKw[i];
    const cat = categoryMap[kw.toLowerCase()] || "General";
    const mentions = Math.max(1, Math.round((sentiment.negative / Math.max(negKw.length, 1)) * (1 - i * 0.15)));

    points.push({
      category: cat,
      point: negPhrases[i] || kw,
      mentions,
      severity: i < 2 ? "high" : i < 4 ? "medium" : "low",
    });
  }

  return points;
}

/**
 * Generate the full marketer toolkit data from existing analysis outputs.
 */
export function generateMarketerToolkit(
  productName: string,
  sentiment: SentimentResult,
  reviews: { text: string; sentiment: string }[]
): MarketerToolkitData {
  return {
    customerExpressions: extractExpressions(reviews),
    problemSolutionTemplates: generateProblemSolutionTemplates(productName, sentiment),
    searchIntentAds: generateSearchIntentAds(sentiment, productName),
    crmSegments: generateCrmSegments(sentiment, productName),
    contentIdeas: generateContentIdeas(sentiment, productName),
    faqItems: generateFaqItems(sentiment, productName),
    improvementPoints: generateImprovementPoints(sentiment),
  };
}
