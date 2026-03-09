import type { SentimentResult } from "./sentiment";

export interface MarketingOutput {
  qaList: { question: string; answer: string }[];
  reviewGuide: string;
  tagline: string;
  strengthsSummary: string;
  weaknessesSummary: string;
}

export interface GeoMessage {
  geo: string;
  geoLabel: string;
  flag: string;
  language: string;
  messages: {
    purpose: string;
    purposeLabel: string;
    icon: string;
    headline: string;
    body: string;
    cta: string;
    hashtags: string[];
    schema?: Record<string, unknown>; // JSON-LD for AI crawlers
  }[];
}

export function generateGeoMarketingMessages(
  productName: string,
  sentiment: SentimentResult
): GeoMessage[] {
  const { keywords, positive, negative, neutral, averageScore } = sentiment;
  const total = positive + negative + neutral;
  const posPercent = total > 0 ? Math.round((positive / total) * 100) : 0;
  const pros = keywords.positive.slice(0, 3);
  const cons = keywords.negative.slice(0, 2);
  const score = (averageScore * 100).toFixed(0);

  return [
    {
      geo: "us",
      geoLabel: "North America",
      flag: "🇺🇸",
      language: "English",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `${posPercent}% of real users love the ${productName}. Here's why.`,
          body: `Verified reviews highlight ${pros.join(", ")} as top reasons customers choose the ${productName}. With a ${score}/100 satisfaction score from ${total} reviews, it's a crowd favorite.`,
          cta: "Shop Now at LG.com →",
          hashtags: ["#LG", `#${productName.replace(/\s+/g, "")}`, "#RealReviews", "#TechThatDelivers"],
          schema: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: productName,
            brand: { "@type": "Brand", name: "LG Electronics" },
            aggregateRating: { "@type": "AggregateRating", ratingValue: (averageScore * 5).toFixed(1), reviewCount: total, bestRating: 5 },
            review: pros.map(p => ({ "@type": "Review", reviewBody: p, author: { "@type": "Person", name: "Verified Buyer" } })),
          },
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `Why ${total.toLocaleString()} customers rated the ${productName} ${(averageScore * 5).toFixed(1)}/5`,
          body: `Customers consistently praise ${pros.join(" and ")}. ${cons.length > 0 ? `Some noted ${cons.join(" and ")}, which LG continues to address through firmware updates.` : "With virtually no complaints, this is a top-tier choice."}`,
          cta: "Read All Reviews",
          hashtags: [],
        },
        {
          purpose: "email",
          purposeLabel: "Email Campaign",
          icon: "✉️",
          headline: `[LG Insider] The ${productName} — ${posPercent}% positive from real users`,
          body: `Hi [First Name],\n\nWe analyzed ${total} verified reviews of the ${productName} and the verdict is clear: customers love ${pros.join(", ")}.\n\nSatisfaction Score: ${score}/100\nTop Praise: "${pros[0] || "Overall quality"}"\n\nDon't just take our word for it — see what real owners are saying.`,
          cta: "See the Reviews →",
          hashtags: [],
        },
        {
          purpose: "press",
          purposeLabel: "Press Release",
          icon: "📰",
          headline: `LG ${productName} Earns ${score}/100 Customer Satisfaction Score Across ${total} Reviews`,
          body: `ENGLEWOOD CLIFFS, N.J. — LG Electronics' ${productName} has earned a customer satisfaction score of ${score} out of 100 based on analysis of ${total} verified reviews from Reddit and Amazon over the past 12 months. Key strengths cited by consumers include ${pros.join(", ")}. ${cons.length > 0 ? `Areas identified for improvement include ${cons.join(" and ")}.` : ""} The data reflects LG's continued commitment to delivering products that resonate with consumers.`,
          cta: "Media Contact: press@lge.com",
          hashtags: ["#LGElectronics", "#CES2026", "#ConsumerInsight"],
        },
      ],
    },
    {
      geo: "eu",
      geoLabel: "Europe",
      flag: "🇪🇺",
      language: "English (EU)",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `Trusted by users across Europe — the ${productName} scores ${score}/100.`,
          body: `European consumers highlight ${pros.join(", ")} in their reviews. With energy efficiency and sustainability at its core, the ${productName} is designed for the modern European home.`,
          cta: "Discover More at LG.com/eu →",
          hashtags: ["#LGEurope", "#EnergyEfficient", "#SmartLiving", `#${productName.replace(/\s+/g, "")}`],
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `${productName} — Rated ${(averageScore * 5).toFixed(1)}/5 by verified European buyers`,
          body: `Consumers across the EU praise ${pros.join(" and ")}. Compliant with EU energy standards and backed by LG's 2-year manufacturer warranty. ${cons.length > 0 ? `Note: some users mentioned ${cons.join(", ")}.` : ""}`,
          cta: "Find a Retailer Near You",
          hashtags: [],
        },
      ],
    },
    {
      geo: "kr",
      geoLabel: "한국",
      flag: "🇰🇷",
      language: "한국어",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "SNS 광고",
          icon: "📱",
          headline: `해외 소비자 ${posPercent}%가 인정한 ${productName}, 그 이유는?`,
          body: `Reddit·Amazon ${total}건의 실제 리뷰를 분석한 결과, 해외 소비자들은 ${pros.join(", ")}을(를) 가장 높이 평가했습니다. 글로벌 만족도 ${score}/100점.`,
          cta: "LG.com에서 자세히 보기 →",
          hashtags: ["#LG전자", `#${productName.replace(/\s+/g, "")}`, "#해외반응", "#글로벌리뷰"],
        },
        {
          purpose: "pdp",
          purposeLabel: "제품 상세페이지",
          icon: "🛒",
          headline: `글로벌 리뷰 ${total}건 분석 — ${productName} 만족도 ${score}점`,
          body: `해외 실사용자들이 꼽은 강점: ${pros.join(", ")}. ${cons.length > 0 ? `일부 개선 요청: ${cons.join(", ")}. LG는 지속적인 업데이트로 대응 중입니다.` : "부정적 피드백은 거의 없는 수준입니다."}`,
          cta: "전체 리뷰 분석 보기",
          hashtags: [],
        },
        {
          purpose: "email",
          purposeLabel: "이메일 캠페인",
          icon: "✉️",
          headline: `[LG 인사이트] ${productName} 글로벌 고객 반응 리포트`,
          body: `안녕하세요, [고객님]\n\nReddit과 Amazon에서 수집한 ${total}건의 ${productName} 리뷰를 분석했습니다.\n\n✅ 만족도: ${score}/100\n✅ 핵심 강점: ${pros.join(", ")}\n${cons.length > 0 ? `⚠️ 개선 요청: ${cons.join(", ")}` : ""}\n\n해외 소비자의 생생한 목소리를 확인해 보세요.`,
          cta: "리포트 전문 보기 →",
          hashtags: [],
        },
      ],
    },
    {
      geo: "sea",
      geoLabel: "Southeast Asia",
      flag: "🌏",
      language: "English (SEA)",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `${productName} — Loved by ${posPercent}% of global users. Now in your region.`,
          body: `From ${pros.join(" to ")}, the ${productName} delivers what Southeast Asian consumers want: reliability, innovation, and value. Satisfaction score: ${score}/100 from ${total} reviews.`,
          cta: "Shop LG in Your Country →",
          hashtags: ["#LGSEA", "#TechForLife", `#${productName.replace(/\s+/g, "")}`],
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `Global reviews confirm: ${productName} scores ${(averageScore * 5).toFixed(1)}/5`,
          body: `Tropical-ready and built to last. Users worldwide praise ${pros.join(", ")}. ${cons.length > 0 ? `Minor feedback on ${cons.join(", ")} is being addressed.` : "Virtually complaint-free."} Available with local warranty and service support.`,
          cta: "Check Local Availability",
          hashtags: [],
        },
      ],
    },
  ];
}

export function generateMarketingMessage(
  productName: string,
  sentiment: SentimentResult
): MarketingOutput {
  const { keywords, positive, negative, neutral, averageScore } = sentiment;
  const total = positive + negative + neutral;
  const posPercent = total > 0 ? Math.round((positive / total) * 100) : 0;

  const strengthsSummary = keywords.positive.length > 0
    ? `고객들이 꼽은 ${productName}의 강점: ${keywords.positive.join(", ")}`
    : `${productName}에 대한 긍정 키워드를 수집 중입니다.`;

  const weaknessesSummary = keywords.negative.length > 0
    ? `개선이 필요한 영역: ${keywords.negative.join(", ")}`
    : `현재 부정적 피드백이 거의 없습니다.`;

  const qaList = [
    {
      question: `${productName}의 가장 큰 장점은 무엇인가요?`,
      answer: keywords.positive.length > 0
        ? `실제 사용자들이 가장 많이 언급한 장점은 "${keywords.positive.slice(0, 3).join('", "')}" 등입니다. 전체 리뷰의 ${posPercent}%가 긍정적인 반응을 보이고 있습니다.`
        : `현재 리뷰 데이터를 수집 중이며, 곧 주요 장점을 확인하실 수 있습니다.`,
    },
    {
      question: `${productName}의 단점이나 개선점이 있나요?`,
      answer: keywords.negative.length > 0
        ? `일부 사용자가 언급한 개선점은 "${keywords.negative.slice(0, 3).join('", "')}" 등이 있습니다. LG는 지속적인 소프트웨어 업데이트와 제품 개선을 통해 이를 해결하고 있습니다.`
        : `현재까지 큰 불만 사항은 보고되지 않았습니다.`,
    },
    {
      question: `${productName}을(를) 구매해도 괜찮을까요?`,
      answer: averageScore >= 0.7
        ? `네! 평균 감성 점수 ${(averageScore * 100).toFixed(0)}점으로, 대다수 사용자가 만족하고 있는 제품입니다. 안심하고 구매하셔도 좋습니다.`
        : averageScore >= 0.4
        ? `전반적으로 평이한 평가를 받고 있습니다. 용도에 맞는지 확인 후 구매를 권장합니다.`
        : `현재 일부 부정적 피드백이 있으므로, 구매 전 상세 리뷰를 확인하시길 권장합니다.`,
    },
  ];

  const tagline = averageScore >= 0.7
    ? `✨ "${productName}" — 고객 ${posPercent}%가 선택한 만족의 아이콘`
    : `📊 "${productName}" — 솔직한 리뷰로 확인하세요`;

  const reviewGuide = `
📝 ${productName} 리뷰 가이드

🟢 강점 포인트:
${keywords.positive.map((k) => `  • ${k}`).join("\n") || "  • 데이터 수집 중"}

🔴 개선 포인트:
${keywords.negative.map((k) => `  • ${k}`).join("\n") || "  • 특이사항 없음"}

📈 전체 감성 요약:
  • 긍정: ${positive}건 (${posPercent}%)
  • 부정: ${negative}건 (${total > 0 ? Math.round((negative / total) * 100) : 0}%)
  • 중립: ${neutral}건 (${total > 0 ? Math.round((neutral / total) * 100) : 0}%)
  • 평균 점수: ${(averageScore * 100).toFixed(0)}/100

💡 마케팅 추천:
${averageScore >= 0.7 ? "  → 긍정 리뷰 기반 SNS 마케팅 적극 추천" : "  → 개선점 보완 후 마케팅 집행 권장"}
`.trim();

  return { qaList, reviewGuide, tagline, strengthsSummary, weaknessesSummary };
}
