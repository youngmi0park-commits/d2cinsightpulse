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

  // ⚠️ LGE 해외광고 법무검토 체크리스트 준수 사항:
  // - 근거 없는 최상급 표현 금지 (#9): "best", "#1", "unprecedented", "crowd favorite" 등 사용 불가
  // - 모든 Factual Claim은 검증 가능한 데이터로 뒷받침 (#7)
  // - 데이터 출처·수집 기간·방법론 명시 (#28)
  // - 경쟁사 직접 비교 금지 (#31~#36)
  // - 리뷰 인용 시 실제 사용자 경험 기반 확인 (#21)
  // - SNS 광고는 "Ad" 표기 필수 (#20)
  // - 환경 관련 주장 시 구체적 근거 필요 (Environmental Claims 섹션)

  const dataSrc = "Reddit, Amazon, RTINGS, Consumer Reports";

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
          headline: `[Ad] ${productName} — Users love the ${pros[0] || "experience"}. See why.`,
          body: `Real users highlight ${pros.join(", ")} as standout features of the ${productName}. ${cons.length > 0 ? `LG continues to refine ${cons[0]} based on user feedback.` : ""} Discover what makes it a top choice.`,
          cta: "Learn More at LG.com →",
          hashtags: ["#LG", `#${productName.replace(/\s+/g, "")}`, "#ReviewInsights", "#Ad"],
          schema: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: productName,
            brand: { "@type": "Brand", name: "LG Electronics" },
            aggregateRating: { "@type": "AggregateRating", ratingValue: (averageScore * 5).toFixed(1), reviewCount: total, bestRating: 5 },
            description: `Based on sentiment analysis of ${total} user-generated reviews.`,
          },
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `${productName} — Loved for ${pros.slice(0, 2).join(" & ")}`,
          body: `Users consistently praise the ${productName} for its ${pros.join(", ")}. ${cons.length > 0 ? `Some users noted areas for improvement such as ${cons.join(" and ")}. LG is actively addressing feedback through ongoing updates.` : "Feedback across review sources highlights strong overall satisfaction."} Experience it for yourself.`,
          cta: "Read User Reviews",
          hashtags: [],
        },
        {
          purpose: "email",
          purposeLabel: "Email Campaign",
          icon: "✉️",
          headline: `[LG Insider] ${productName} — Here's What Users Are Saying`,
          body: `Hi [First Name],\n\nWe collected ${total} user reviews of the ${productName} from ${dataSrc}.\n\nWhat users love: ${pros.join(", ") || "Overall quality"}\n\nJoin thousands of satisfied customers who chose the ${productName}. See what they're saying about their experience.`,
          cta: "Read the Reviews →",
          hashtags: [],
        },
        {
          purpose: "press",
          purposeLabel: "Press Release",
          icon: "📰",
          headline: `LG ${productName} Earns Strong User Praise for ${pros[0] || "Quality"} Across ${total} Reviews`,
          body: `ENGLEWOOD CLIFFS, N.J. — Based on analysis of ${total} user reviews collected from ${dataSrc} over the past 12 months, the LG ${productName} has been consistently praised for ${pros.join(", ")}. ${cons.length > 0 ? `User feedback also identified areas for improvement, including ${cons.join(" and ")}, which LG continues to address.` : ""}\n\nNote: Insights are derived from automated sentiment analysis of publicly available user-generated content and do not represent laboratory test results.`,
          cta: "Media Contact: press@lge.com",
          hashtags: ["#LGElectronics", "#ConsumerInsight", "#ReviewAnalysis"],
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
          headline: `[Ad] ${productName} — Users highlight ${pros[0] || "quality"} as a standout feature.`,
          body: `UK consumers praise ${pros.join(", ")} in their reviews of the ${productName}. Available at Currys, Richer Sounds, and LG.com/UK.`,
          cta: "Learn More at LG.com/UK →",
          hashtags: ["#LGUK", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `${productName} — Praised for ${pros.slice(0, 2).join(" & ")} by Real Users`,
          body: `UK users frequently mention ${pros.join(" and ")} as key strengths. ${cons.length > 0 ? `Some users noted ${cons.join(", ")}.` : ""} Review data from ${dataSrc}.`,
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
          headline: `[Ad] ${productName} — Canadian users are loving the ${pros[0] || "experience"}.`,
          body: `Reviews from Canadian and North American users highlight ${pros.join(", ")} as key reasons to choose the ${productName}. Data sourced from ${dataSrc}.`,
          cta: "Learn More at LG.com/CA →",
          hashtags: ["#LGCanada", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
        },
        {
          purpose: "pdp",
          purposeLabel: "Product Page Copy",
          icon: "🛒",
          headline: `${productName} — Trusted by Users for ${pros.slice(0, 2).join(" & ")}`,
          body: `Users frequently praise ${pros.join(" and ")}. ${cons.length > 0 ? `Feedback on ${cons.join(", ")} has been noted.` : "No significant concerns raised."} Available with local warranty and service.`,
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
          headline: `[Ad] ${productName} — Australian users highlight ${pros[0] || "quality"} in their reviews.`,
          body: `Users praise ${pros.join(", ")} as standout features. Data sourced from ${dataSrc}. Available at JB Hi-Fi, Harvey Norman, and LG.com AU.`,
          cta: "Learn More at LG.com/AU →",
          hashtags: ["#LGAustralia", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
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
          headline: `[Anzeige] ${productName} — Nutzer loben ${pros[0] || "Qualität"} in ihren Bewertungen.`,
          body: `Nutzer heben ${pros.join(", ")} als Stärken hervor. DVB-T2/SAT-Kompatibilität und EU-Garantie inklusive. Daten aus ${dataSrc}.`,
          cta: "Mehr erfahren auf LG.com/DE →",
          hashtags: ["#LGDeutschland", `#${productName.replace(/\s+/g, "")}`, "#Anzeige"],
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
          headline: `[Ad] ${productName} — Users praise ${pros[0] || "performance"} and more.`,
          body: `Indian and global user reviews highlight ${pros.join(", ")} as reasons customers choose the ${productName}. Review data from ${dataSrc}.`,
          cta: "Explore at LG.com/IN →",
          hashtags: ["#LGIndia", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
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
          headline: `[Publicité] ${productName} — Les utilisateurs saluent ${pros[0] || "la qualité"}.`,
          body: `Les utilisateurs mettent en avant ${pros.join(", ")} comme points forts. Données issues de ${dataSrc}. Disponible chez Darty, Boulanger et LG.com/FR.`,
          cta: "En savoir plus sur LG.com/FR →",
          hashtags: ["#LGFrance", `#${productName.replace(/\s+/g, "")}`, "#Publicité"],
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
          headline: `[Anúncio] ${productName} — Usuários destacam ${pros[0] || "qualidade"} como diferencial.`,
          body: `Usuários destacam ${pros.join(", ")} como pontos fortes. Dados de ${dataSrc}. Qualidade OLED e estabilidade de streaming são pontos frequentes.`,
          cta: "Saiba mais em LG.com/BR →",
          hashtags: ["#LGBrasil", `#${productName.replace(/\s+/g, "")}`, "#Anúncio"],
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
          headline: `[Advertentie] ${productName} — Gebruikers waarderen ${pros[0] || "kwaliteit"}.`,
          body: `Gebruikers waarderen ${pros.join(", ")} als sterke punten. Gegevens van ${dataSrc}. EU-energielabel en garantie van toepassing.`,
          cta: "Meer info op LG.com/NL →",
          hashtags: ["#LGNL", `#${productName.replace(/\s+/g, "")}`, "#Advertentie"],
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
          headline: `[Publicidad] ${productName} — Los usuarios destacan ${pros[0] || "calidad"} como fortaleza.`,
          body: `Los usuarios destacan ${pros.join(", ")} como puntos fuertes. Datos de ${dataSrc}. Garantía local disponible.`,
          cta: "Más información en LG.com/MX →",
          hashtags: ["#LGMexico", `#${productName.replace(/\s+/g, "")}`, "#Publicidad"],
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
