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
    schema?: Record<string, unknown>;
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
      geoLabel: "United States",
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
      geo: "uk",
      geoLabel: "United Kingdom",
      flag: "🇬🇧",
      language: "English (UK)",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `UK users rate the ${productName} ${score}/100 — see what they're saying.`,
          body: `From HDR tone-mapping for Sky Sports to Freeview compatibility, British consumers praise ${pros.join(", ")}. Available at Currys, Richer Sounds, and LG.com/UK.`,
          cta: "Shop at LG.com/UK →",
          hashtags: ["#LGUK", `#${productName.replace(/\s+/g, "")}`, "#TechUK", "#SmartHome"],
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `${productName} — Rated ${(averageScore * 5).toFixed(1)}/5 by UK buyers`,
          body: `UK consumers highlight ${pros.join(" and ")}. Energy-rated and backed by LG's manufacturer warranty. ${cons.length > 0 ? `Some users noted ${cons.join(", ")}.` : ""}`,
          cta: "Find a UK Retailer",
          hashtags: [],
        },
      ],
    },
    {
      geo: "ca",
      geoLabel: "Canada",
      flag: "🇨🇦",
      language: "English (CA)",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `Canadian tech fans agree: the ${productName} delivers. ${score}/100 score.`,
          body: `Cross-border price comparisons, Costco Canada warranty, and Best Buy price match — Canadian Reddit users love ${pros.join(", ")}. Built to perform in every season.`,
          cta: "Shop at LG.com/CA →",
          hashtags: ["#LGCanada", `#${productName.replace(/\s+/g, "")}`, "#TechCanada"],
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `${productName} — ${posPercent}% satisfaction from verified North American reviews`,
          body: `Canadian buyers praise ${pros.join(" and ")}. ${cons.length > 0 ? `Feedback on ${cons.join(", ")} is being addressed.` : "No significant complaints."} Available with local warranty and coast-to-coast service.`,
          cta: "Check Canadian Pricing",
          hashtags: [],
        },
      ],
    },
    {
      geo: "au",
      geoLabel: "Australia",
      flag: "🇦🇺",
      language: "English (AU)",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `Aussies love the ${productName} — ${posPercent}% positive reviews.`,
          body: `From AFL/NRL motion handling to bright-room performance, Australian users highlight ${pros.join(", ")}. Available at JB Hi-Fi, Harvey Norman, and LG.com AU.`,
          cta: "Shop at LG.com/AU →",
          hashtags: ["#LGAustralia", `#${productName.replace(/\s+/g, "")}`, "#TechAU"],
        },
      ],
    },
    {
      geo: "de",
      geoLabel: "Germany",
      flag: "🇩🇪",
      language: "Deutsch / English",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `German tech enthusiasts rate the ${productName} ${score}/100.`,
          body: `DVB-T2/SAT compatibility, Dolby Atmos passthrough, and EU warranty included. German Reddit users praise ${pros.join(", ")} — a top pick for bright European living rooms.`,
          cta: "Jetzt entdecken auf LG.com/DE →",
          hashtags: ["#LGDeutschland", `#${productName.replace(/\s+/g, "")}`, "#TechDE"],
        },
      ],
    },
    {
      geo: "in",
      geoLabel: "India",
      flag: "🇮🇳",
      language: "English (IN)",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `${productName} scores ${score}/100 — India's growing Reddit community weighs in.`,
          body: `Indian consumers compare OLED vs QLED value, peak brightness performance, and service center availability. Top praise: ${pros.join(", ")}.`,
          cta: "Explore at LG.com/IN →",
          hashtags: ["#LGIndia", `#${productName.replace(/\s+/g, "")}`, "#TechIndia"],
        },
      ],
    },
    {
      geo: "fr",
      geoLabel: "France",
      flag: "🇫🇷",
      language: "Français / English",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `Les utilisateurs français plébiscitent le ${productName}. Score: ${score}/100.`,
          body: `HDR sur Canal+/Netflix FR, performance anti-reflet, et garantie étendue chez Darty/Boulanger. Points forts: ${pros.join(", ")}.`,
          cta: "Découvrir sur LG.com/FR →",
          hashtags: ["#LGFrance", `#${productName.replace(/\s+/g, "")}`, "#TechFR"],
        },
      ],
    },
    {
      geo: "br",
      geoLabel: "Brazil",
      flag: "🇧🇷",
      language: "Português / English",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `${productName} — ${posPercent}% positive. Brazil's Reddit community speaks.`,
          body: `From football broadcast OLED quality to streaming stability, Brazilian users highlight ${pros.join(", ")}. Price comparisons US vs BR and promo seasons are hot topics.`,
          cta: "Confira em LG.com/BR →",
          hashtags: ["#LGBrasil", `#${productName.replace(/\s+/g, "")}`, "#TechBR"],
        },
      ],
    },
    {
      geo: "nl",
      geoLabel: "Netherlands",
      flag: "🇳🇱",
      language: "Nederlands / English",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `Dutch tech forums rate the ${productName} ${score}/100.`,
          body: `Bright room handling, calibration sharing, VRR flicker discussions, and EU energy labels. Dutch Reddit users appreciate ${pros.join(", ")}.`,
          cta: "Ontdek meer op LG.com/NL →",
          hashtags: ["#LGNL", `#${productName.replace(/\s+/g, "")}`, "#TechNL"],
        },
      ],
    },
    {
      geo: "mx",
      geoLabel: "Mexico",
      flag: "🇲🇽",
      language: "Español / English",
      messages: [
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `${productName} — valorado ${score}/100 por la comunidad Reddit.`,
          body: `Comparaciones de precios US vs MX, garantías y consolas 4K120 con ALLM. Los usuarios mexicanos destacan ${pros.join(", ")}.`,
          cta: "Descubre en LG.com/MX →",
          hashtags: ["#LGMexico", `#${productName.replace(/\s+/g, "")}`, "#TechMX"],
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
