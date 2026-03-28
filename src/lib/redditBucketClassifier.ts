/**
 * Reddit 데이터 3-버킷 자동 분류 시스템
 * [REVIEW] → 카피/A+ 콘텐츠
 * [VOC/COMPLAINT] → FAQ + CRM 대응
 * [QUESTION] → FAQ + 검색광고 키워드 + 콘텐츠 기획
 */

export type RedditBucket = "REVIEW" | "VOC" | "QUESTION";

export interface ClassifiedPost {
  id: string;
  content: string;
  title: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  source: string;
  bucket: RedditBucket;
  bucketConfidence: number; // 0-1
  bucketReason: string;
  actionTags: string[];
  keywords: string[];
}

export interface BucketSummary {
  bucket: RedditBucket;
  count: number;
  label: string;
  labelKo: string;
  icon: string;
  description: string;
  descriptionKo: string;
  color: string;
  actions: { label: string; labelKo: string; icon: string }[];
  posts: ClassifiedPost[];
  topKeywords: { word: string; count: number }[];
}

// ── Classification Rules ──

const QUESTION_PATTERNS = [
  /\bshould\s+i\b/i,
  /\bworth\s+(it|the|buying|getting)\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bcompared?\s+to\b/i,
  /\bwhich\s+(one|is|should|would)\b/i,
  /\bany(one|body)\s+(know|have|tried|recommend)\b/i,
  /\bis\s+it\s+(good|worth|better|possible)\b/i,
  /\bcan\s+(i|you|it|someone)\b/i,
  /\bhow\s+(do|does|is|can|to|much|long)\b/i,
  /\bwhat\s+(is|are|do|does|should|would)\b/i,
  /\bdoes\s+(it|the|this|anyone)\b/i,
  /\bwhere\s+(can|do|to)\b/i,
  /\brecommend(ation)?s?\b/i,
  /\bsuggestion?s?\b/i,
  /\badvice\b/i,
  /\bhelp\s*(me|please|needed)?\b/i,
  /\?/,
];

const VOC_PATTERNS = [
  /\b(broken|broke|defective|faulty|malfunction)\b/i,
  /\b(terrible|horrible|worst|awful|disgusting)\b/i,
  /\b(disappointed|frustrat|regret|waste)\b/i,
  /\b(return(ed|ing)?|refund|replacement)\b/i,
  /\b(class\s*action|lawsuit|sue|scam)\b/i,
  /\b(customer\s*service|support|warranty)\s*(is\s*)?(bad|terrible|horrible|non.?existent|useless)/i,
  /\b(don'?t|do\s*not|never)\s*(buy|purchase|recommend|get)\b/i,
  /\b(died|dead|stopped\s*working|won'?t\s*turn\s*on)\b/i,
  /\b(error\s*code|error|fail(ed|ing|ure)?)\b/i,
  /\b(over\s*heat|burning\s*smell|spark|fire)\b/i,
  /\b(poor\s*quality|cheap|flimsy)\b/i,
  /\b(repair|fix(ed)?|technician|service\s*call)\b/i,
];

const REVIEW_PATTERNS = [
  /\b(bought|purchased|owned|using|had|got)\b/i,
  /\b(love|loving|loved|amazing|excellent|fantastic|great|awesome|perfect)\b/i,
  /\b(months?|years?|weeks?)\s*(ago|later|now|of\s*use)\b/i,
  /\b(my\s*(new|old|first|second))\b/i,
  /\b(review|experience|impression|thoughts?\s*on)\b/i,
  /\b(so\s*far|after\s*\d+|update|follow.?up)\b/i,
  /\b(recommend|highly\s*recommend|would\s*buy\s*again)\b/i,
  /\b(pros?\s*(and|&)\s*cons?)\b/i,
  /\b(picture\s*quality|sound\s*quality|build\s*quality)\b/i,
  /\b(install(ed|ation)?|set\s*(up|it\s*up))\b/i,
];

// Past tense markers for REVIEW
const PAST_TENSE_PATTERNS = [
  /\b\w+ed\b/i, // generic -ed ending
  /\b(was|were|had|did|went|came|got|bought|made|took|gave|found|knew|thought|felt|saw|heard|said|told|set|put|ran|let|kept|began|shown|written|chosen|driven|eaten|fallen|given|gone|grown|known|seen|spoken|taken|worn)\b/i,
];

const SENTIMENT_WORDS = {
  negative: [
    "bad", "poor", "terrible", "horrible", "worst", "awful", "hate",
    "disappointed", "frustrating", "annoying", "broken", "defective",
    "fail", "issue", "problem", "complaint", "angry", "unacceptable",
  ],
  positive: [
    "love", "great", "amazing", "excellent", "fantastic", "awesome",
    "perfect", "beautiful", "stunning", "impressed", "happy",
    "recommend", "worth", "best", "superior", "outstanding",
  ],
};

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  
  const stopWords = new Set([
    "this", "that", "with", "from", "have", "been", "were", "they",
    "their", "about", "would", "could", "should", "which", "there",
    "other", "than", "then", "also", "just", "like", "will", "more",
    "some", "very", "really", "much", "even", "only", "into",
    "your", "what", "when", "does", "doesn", "didn", "isn",
  ]);
  
  return [...new Set(words.filter((w) => !stopWords.has(w)))].slice(0, 15);
}

function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

export function classifyRedditPost(post: {
  id: string;
  content: string;
  title: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  source: string;
}): ClassifiedPost {
  const fullText = `${post.title || ""} ${post.content}`;
  
  const questionScore = countPatternMatches(fullText, QUESTION_PATTERNS);
  const vocScore = countPatternMatches(fullText, VOC_PATTERNS);
  const reviewScore = countPatternMatches(fullText, REVIEW_PATTERNS);
  const hasPastTense = PAST_TENSE_PATTERNS.some((p) => p.test(fullText));
  
  // Weighted scoring
  let qWeight = questionScore * 2;
  let vWeight = vocScore * 2.5;
  let rWeight = reviewScore * 1.5 + (hasPastTense ? 2 : 0);
  
  // Sentiment boosters
  if (post.sentiment === "negative") vWeight += 3;
  if (post.sentiment === "positive") rWeight += 2;
  if ((post.sentiment_score ?? 0.5) < 0.3) vWeight += 2;
  if ((post.sentiment_score ?? 0.5) > 0.7) rWeight += 1;
  
  // Determine bucket
  let bucket: RedditBucket;
  let confidence: number;
  let reason: string;
  
  const maxScore = Math.max(qWeight, vWeight, rWeight);
  const total = qWeight + vWeight + rWeight || 1;
  
  if (maxScore === 0) {
    bucket = "REVIEW";
    confidence = 0.3;
    reason = "Default classification (no strong signals)";
  } else if (qWeight === maxScore) {
    bucket = "QUESTION";
    confidence = qWeight / total;
    reason = `Question patterns detected (${questionScore} matches)`;
  } else if (vWeight === maxScore) {
    bucket = "VOC";
    confidence = vWeight / total;
    reason = `Complaint/VOC patterns detected (${vocScore} matches, sentiment: ${post.sentiment})`;
  } else {
    bucket = "REVIEW";
    confidence = rWeight / total;
    reason = `Review patterns detected (${reviewScore} matches${hasPastTense ? ", past tense" : ""})`;
  }
  
  // Generate action tags
  const actionTags: string[] = [];
  switch (bucket) {
    case "REVIEW":
      actionTags.push("copy_extraction", "aplus_content", "social_proof");
      if (post.sentiment === "positive") actionTags.push("testimonial", "ugc_candidate");
      if (post.sentiment === "negative") actionTags.push("counter_narrative");
      break;
    case "VOC":
      actionTags.push("faq_generation", "crm_response", "product_improvement");
      if (vocScore >= 3) actionTags.push("urgent_escalation");
      actionTags.push("orm_monitoring");
      break;
    case "QUESTION":
      actionTags.push("faq_candidate", "search_keyword", "content_planning");
      if (/\bvs\b/i.test(fullText)) actionTags.push("comparison_content");
      if (/\bworth\b/i.test(fullText)) actionTags.push("value_proposition");
      break;
  }
  
  return {
    id: post.id,
    content: post.content,
    title: post.title,
    sentiment: post.sentiment,
    sentimentScore: post.sentiment_score,
    source: post.source,
    bucket,
    bucketConfidence: Math.min(confidence, 1),
    bucketReason: reason,
    actionTags,
    keywords: extractKeywords(fullText),
  };
}

export function generateBucketSummaries(posts: ClassifiedPost[]): BucketSummary[] {
  const bucketDefs: Omit<BucketSummary, "count" | "posts" | "topKeywords">[] = [
    {
      bucket: "REVIEW",
      label: "Reviews & Experiences",
      labelKo: "리뷰 & 사용 경험",
      icon: "📝",
      description: "Past-tense experiences with sentiment → Copy/A+ Content extraction",
      descriptionKo: "과거형 사용 경험 + 감성 표현 → 카피/A+ 콘텐츠 추출",
      color: "emerald",
      actions: [
        { label: "Extract Copy Keywords", labelKo: "카피 키워드 추출", icon: "✍️" },
        { label: "A+ Content Material", labelKo: "A+ 콘텐츠 소재", icon: "🛒" },
        { label: "Social Proof Quotes", labelKo: "소셜 프루프 인용", icon: "💬" },
        { label: "UGC Candidate", labelKo: "UGC 후보", icon: "📸" },
      ],
    },
    {
      bucket: "VOC",
      label: "VOC / Complaints",
      labelKo: "VOC / 불만 사항",
      icon: "⚠️",
      description: "Negative sentiment + specific issues → FAQ + CRM Response",
      descriptionKo: "부정 감성 + 구체적 문제 언급 → FAQ + CRM 대응",
      color: "red",
      actions: [
        { label: "Auto-generate FAQ", labelKo: "FAQ 자동 생성", icon: "❓" },
        { label: "CRM Response Guide", labelKo: "CRM 대응 가이드", icon: "🛡️" },
        { label: "Product Improvement", labelKo: "제품 개선 리포트", icon: "🔧" },
        { label: "ORM Monitoring", labelKo: "ORM 모니터링", icon: "👀" },
      ],
    },
    {
      bucket: "QUESTION",
      label: "Pre-purchase Questions",
      labelKo: "구매 전 질문",
      icon: "❓",
      description: "'Should I', 'vs', 'worth it' patterns → FAQ + Search Ads + Content Planning",
      descriptionKo: "'should I', 'vs', 'worth it' 패턴 → FAQ + 검색광고 키워드 + 콘텐츠 기획",
      color: "blue",
      actions: [
        { label: "FAQ Candidate", labelKo: "FAQ 후보", icon: "📋" },
        { label: "Search Ad Keywords", labelKo: "검색광고 키워드", icon: "🔍" },
        { label: "Content Planning", labelKo: "콘텐츠 기획", icon: "📐" },
        { label: "Comparison Content", labelKo: "비교 콘텐츠", icon: "⚖️" },
      ],
    },
  ];

  return bucketDefs.map((def) => {
    const bucketPosts = posts.filter((p) => p.bucket === def.bucket);
    
    // Top keywords
    const kwCount: Record<string, number> = {};
    bucketPosts.forEach((p) => {
      p.keywords.forEach((kw) => {
        kwCount[kw] = (kwCount[kw] || 0) + 1;
      });
    });
    const topKeywords = Object.entries(kwCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      ...def,
      count: bucketPosts.length,
      posts: bucketPosts.sort((a, b) => b.bucketConfidence - a.bucketConfidence),
      topKeywords,
    };
  });
}
