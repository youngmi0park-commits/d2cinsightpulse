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

  // Banner copy character limits (based on lge.com/us, lge.com/uk hero banner patterns):
  // - Kicker/Eyebrow: ~35 chars max
  // - Headline: ~50 chars max
  // - Sub-copy/Body: ~120 chars max
  // - CTA button: ~20 chars max

  const bannerKicker = (text: string) => text.slice(0, 35);
  const bannerHeadline = (text: string) => text.slice(0, 50);
  const bannerBody = (text: string) => text.slice(0, 120);
  const bannerCta = (text: string) => text.slice(0, 20);

  return [
    {
      geo: "LGEUS",
      geoLabel: "United States",
      flag: "🇺🇸",
      language: "English",
      messages: [
        {
          purpose: "dotcom",
          purposeLabel: "닷컴 카피",
          icon: "🌐",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Experience"} Redefined.`),
          body: bannerBody(`Users praise ${pros.slice(0, 2).join(" & ")}. Discover what makes the ${productName} a standout choice.`),
          cta: bannerCta("Shop Now"),
          hashtags: [],
        },
        {
          purpose: "social",
          purposeLabel: "소셜미디어 카피",
          icon: "📱",
          headline: `[Ad] ${productName} — Users love the ${pros[0] || "experience"}. See why.`,
          body: `Real users highlight ${pros.join(", ")} as standout features of the ${productName}. ${cons.length > 0 ? `LG continues to refine ${cons[0]} based on user feedback.` : ""} Discover what makes it a top choice.`,
          cta: "Learn More at LGE.com →",
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
      ],
    },
    {
      geo: "LGEUK",
      geoLabel: "United Kingdom",
      flag: "🇬🇧",
      language: "English (UK)",
      messages: [
        {
          purpose: "dotcom",
          purposeLabel: "닷컴 카피",
          icon: "🌐",
          headline: bannerHeadline(`${productName}. Loved for ${pros[0] || "Quality"}.`),
          body: bannerBody(`UK users highlight ${pros.slice(0, 2).join(" & ")} as key strengths. Experience it at Currys or LGE.com/UK.`),
          cta: bannerCta("Buy Now"),
          hashtags: [],
        },
        {
          purpose: "social",
          purposeLabel: "소셜미디어 카피",
          icon: "📱",
          headline: `[Ad] ${productName} — Users highlight ${pros[0] || "quality"} as a standout feature.`,
          body: `UK consumers praise ${pros.join(", ")} in their reviews of the ${productName}. Available at Currys, Richer Sounds, and LGE.com/UK.`,
          cta: "Learn More at LGE.com/UK →",
          hashtags: ["#LGUK", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
        },
      ],
    },
    {
      geo: "LGECI",
      geoLabel: "Canada",
      flag: "🇨🇦",
      language: "English (CA)",
      messages: [
        {
          purpose: "dotcom",
          purposeLabel: "닷컴 카피",
          icon: "🌐",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Performance"} You'll Love.`),
          body: bannerBody(`Canadian users praise ${pros.slice(0, 2).join(" & ")}. Now available with local warranty and service.`),
          cta: bannerCta("Shop Now"),
          hashtags: [],
        },
        {
          purpose: "social",
          purposeLabel: "소셜미디어 카피",
          icon: "📱",
          headline: `[Ad] ${productName} — Canadian users are loving the ${pros[0] || "experience"}.`,
          body: `Reviews from Canadian and North American users highlight ${pros.join(", ")} as key reasons to choose the ${productName}. Data sourced from ${dataSrc}.`,
          cta: "Learn More at LGE.com/CA →",
          hashtags: ["#LGCanada", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
        },
      ],
    },
    {
      geo: "LGEAP",
      geoLabel: "Australia",
      flag: "🇦🇺",
      language: "English (AU)",
      messages: [
        {
          purpose: "dotcom",
          purposeLabel: "닷컴 카피",
          icon: "🌐",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Quality"} That Stands Out.`),
          body: bannerBody(`Aussie users love ${pros.slice(0, 2).join(" & ")}. Available at JB Hi-Fi, Harvey Norman & LGE.com AU.`),
          cta: bannerCta("Learn More"),
          hashtags: [],
        },
        {
          purpose: "social",
          purposeLabel: "소셜미디어 카피",
          icon: "📱",
          headline: `[Ad] ${productName} — Australian users highlight ${pros[0] || "quality"} in their reviews.`,
          body: `Users praise ${pros.join(", ")} as standout features. Data sourced from ${dataSrc}. Available at JB Hi-Fi, Harvey Norman, and LGE.com AU.`,
          cta: "Learn More at LGE.com/AU →",
          hashtags: ["#LGAustralia", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
        },
      ],
    },
    {
      geo: "LGEDG",
      geoLabel: "Germany",
      flag: "🇩🇪",
      language: "Deutsch / English",
      messages: [
        {
          purpose: "dotcom",
          purposeLabel: "닷컴 카피",
          icon: "🌐",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Qualität"} neu definiert.`),
          body: bannerBody(`Nutzer loben ${pros.slice(0, 2).join(" & ")}. Mit EU-Garantie. Jetzt entdecken auf LGE.com/DE.`),
          cta: bannerCta("Jetzt entdecken"),
          hashtags: [],
        },
        {
          purpose: "social",
          purposeLabel: "소셜미디어 카피",
          icon: "📱",
          headline: `[Anzeige] ${productName} — Nutzer loben ${pros[0] || "Qualität"} in ihren Bewertungen.`,
          body: `Nutzer heben ${pros.join(", ")} als Stärken hervor. DVB-T2/SAT-Kompatibilität und EU-Garantie inklusive. Daten aus ${dataSrc}.`,
          cta: "Mehr erfahren auf LGE.com/DE →",
          hashtags: ["#LGDeutschland", `#${productName.replace(/\s+/g, "")}`, "#Anzeige"],
        },
      ],
    },
    {
      geo: "LGEIN",
      geoLabel: "India",
      flag: "🇮🇳",
      language: "English (IN)",
      messages: [
        {
          purpose: "dotcom",
          purposeLabel: "닷컴 카피",
          icon: "🌐",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Innovation"} Delivered.`),
          body: bannerBody(`Users highlight ${pros.slice(0, 2).join(" & ")} as top reasons to choose LG. Explore at LGE.com/IN.`),
          cta: bannerCta("Explore Now"),
          hashtags: [],
        },
        {
          purpose: "social",
          purposeLabel: "소셜미디어 카피",
          icon: "📱",
          headline: `[Ad] ${productName} — Users praise ${pros[0] || "performance"} and more.`,
          body: `Indian and global user reviews highlight ${pros.join(", ")} as reasons customers choose the ${productName}. Review data from ${dataSrc}.`,
          cta: "Explore at LGE.com/IN →",
          hashtags: ["#LGIndia", `#${productName.replace(/\s+/g, "")}`, "#Ad"],
        },
      ],
    },
    {
      geo: "LGEFS",
      geoLabel: "France",
      flag: "🇫🇷",
      language: "Français / English",
      messages: [
        {
          purpose: "banner",
          purposeLabel: "Web Banner Copy",
          icon: "🖼️",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Qualité"} saluée.`),
          body: bannerBody(`Les utilisateurs apprécient ${pros.slice(0, 2).join(" & ")}. Disponible chez Darty, Boulanger et LGE.com/FR.`),
          cta: bannerCta("Découvrir"),
          hashtags: [],
        },
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `[Publicité] ${productName} — Les utilisateurs saluent ${pros[0] || "la qualité"}.`,
          body: `Les utilisateurs mettent en avant ${pros.join(", ")} comme points forts. Données issues de ${dataSrc}. Disponible chez Darty, Boulanger et LGE.com/FR.`,
          cta: "En savoir plus sur LGE.com/FR →",
          hashtags: ["#LGFrance", `#${productName.replace(/\s+/g, "")}`, "#Publicité"],
        },
      ],
    },
    {
      geo: "LGESP",
      geoLabel: "Brazil",
      flag: "🇧🇷",
      language: "Português / English",
      messages: [
        {
          purpose: "banner",
          purposeLabel: "Web Banner Copy",
          icon: "🖼️",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Qualidade"} comprovada.`),
          body: bannerBody(`Usuários destacam ${pros.slice(0, 2).join(" & ")} como diferenciais. Confira em LGE.com/BR.`),
          cta: bannerCta("Saiba Mais"),
          hashtags: [],
        },
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `[Anúncio] ${productName} — Usuários destacam ${pros[0] || "qualidade"} como diferencial.`,
          body: `Usuários destacam ${pros.join(", ")} como pontos fortes. Dados de ${dataSrc}. Qualidade OLED e estabilidade de streaming são pontos frequentes.`,
          cta: "Saiba mais em LGE.com/BR →",
          hashtags: ["#LGBrasil", `#${productName.replace(/\s+/g, "")}`, "#Anúncio"],
        },
      ],
    },
    {
      geo: "LGEBN",
      geoLabel: "Netherlands",
      flag: "🇳🇱",
      language: "Nederlands / English",
      messages: [
        {
          purpose: "banner",
          purposeLabel: "Web Banner Copy",
          icon: "🖼️",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Kwaliteit"} gewaardeerd.`),
          body: bannerBody(`Gebruikers waarderen ${pros.slice(0, 2).join(" & ")}. EU-garantie. Ontdek meer op LGE.com/NL.`),
          cta: bannerCta("Ontdek meer"),
          hashtags: [],
        },
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `[Advertentie] ${productName} — Gebruikers waarderen ${pros[0] || "kwaliteit"}.`,
          body: `Gebruikers waarderen ${pros.join(", ")} als sterke punten. Gegevens van ${dataSrc}. EU-energielabel en garantie van toepassing.`,
          cta: "Meer info op LGE.com/NL →",
          hashtags: ["#LGNL", `#${productName.replace(/\s+/g, "")}`, "#Advertentie"],
        },
      ],
    },
    {
      geo: "LGEMS",
      geoLabel: "Mexico",
      flag: "🇲🇽",
      language: "Español / English",
      messages: [
        {
          purpose: "banner",
          purposeLabel: "Web Banner Copy",
          icon: "🖼️",
          headline: bannerHeadline(`${productName}. ${pros[0] || "Calidad"} destacada.`),
          body: bannerBody(`Los usuarios destacan ${pros.slice(0, 2).join(" & ")} como fortalezas. Garantía local. LGE.com/MX.`),
          cta: bannerCta("Comprar Ahora"),
          hashtags: [],
        },
        {
          purpose: "sns",
          purposeLabel: "Social Media Ad",
          icon: "📱",
          headline: `[Publicidad] ${productName} — Los usuarios destacan ${pros[0] || "calidad"} como fortaleza.`,
          body: `Los usuarios destacan ${pros.join(", ")} como puntos fuertes. Datos de ${dataSrc}. Garantía local disponible.`,
          cta: "Más información en LGE.com/MX →",
          hashtags: ["#LGMexico", `#${productName.replace(/\s+/g, "")}`, "#Publicidad"],
        },
      ],
    },
  ];
}

export function generateMarketingMessage(
  productName: string,
  sentiment: SentimentResult,
  lang: "en" | "ko" = "ko"
): MarketingOutput {
  const { keywords, positive, negative, neutral, averageScore } = sentiment;
  const total = positive + negative + neutral;
  const posPercent = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negPercent = total > 0 ? Math.round((negative / total) * 100) : 0;
  const neuPercent = total > 0 ? Math.round((neutral / total) * 100) : 0;
  const t = (en: string, ko: string) => (lang === "en" ? en : ko);

  const strengthsSummary = keywords.positive.length > 0
    ? t(
        `Key strengths of ${productName} highlighted by users: ${keywords.positive.join(", ")}`,
        `고객들이 꼽은 ${productName}의 강점: ${keywords.positive.join(", ")}`
      )
    : t(
        `Collecting positive keywords for ${productName}.`,
        `${productName}에 대한 긍정 키워드를 수집 중입니다.`
      );

  const weaknessesSummary = keywords.negative.length > 0
    ? t(
        `Areas needing improvement: ${keywords.negative.join(", ")}`,
        `개선이 필요한 영역: ${keywords.negative.join(", ")}`
      )
    : t(
        `No significant negative feedback at this time.`,
        `현재 부정적 피드백이 거의 없습니다.`
      );

  const qaList = [
    {
      question: t(
        `What are the biggest advantages of the ${productName}?`,
        `${productName}의 가장 큰 장점은 무엇인가요?`
      ),
      answer: keywords.positive.length > 0
        ? t(
            `The most frequently mentioned strengths by real users are "${keywords.positive.slice(0, 3).join('", "')}", among others. Many users express high satisfaction.`,
            `실제 사용자들이 가장 많이 언급한 장점은 "${keywords.positive.slice(0, 3).join('", "')}" 등입니다. 많은 사용자가 만족감을 표현하고 있습니다.`
          )
        : t(
            `Review data is currently being collected. Key strengths will be available soon.`,
            `현재 리뷰 데이터를 수집 중이며, 곧 주요 장점을 확인하실 수 있습니다.`
          ),
    },
    {
      question: t(
        `Are there any drawbacks or areas for improvement with the ${productName}?`,
        `${productName}의 단점이나 개선점이 있나요?`
      ),
      answer: keywords.negative.length > 0
        ? t(
            `Some users have mentioned areas for improvement such as "${keywords.negative.slice(0, 3).join('", "')}", among others. LG is actively addressing these through ongoing software updates and product enhancements.`,
            `일부 사용자가 언급한 개선점은 "${keywords.negative.slice(0, 3).join('", "')}" 등이 있습니다. LG는 지속적인 소프트웨어 업데이트와 제품 개선을 통해 이를 해결하고 있습니다.`
          )
        : t(
            `No major complaints have been reported so far.`,
            `현재까지 큰 불만 사항은 보고되지 않았습니다.`
          ),
    },
    {
      question: t(
        `Any tips for getting the most out of the ${productName}?`,
        `${productName}을(를) 최대한 활용하는 팁이 있나요?`
      ),
      answer: keywords.positive.length > 0
        ? t(
            `Users recommend taking advantage of features like ${keywords.positive.slice(0, 2).join(" and ")}. Check the product settings and explore community tips for optimal setup.`,
            `사용자들은 ${keywords.positive.slice(0, 2).join(", ")} 등의 기능을 적극 활용할 것을 추천합니다. 제품 설정을 확인하고 커뮤니티 팁을 참고하여 최적의 설정을 찾아보세요.`
          )
        : t(
            `Usage tips will be updated as more user feedback is collected.`,
            `더 많은 사용자 피드백이 수집되면 사용 팁이 업데이트됩니다.`
          ),
    },
    {
      question: t(
        `What do users say about the ${productName}'s durability and long-term use?`,
        `${productName}의 내구성과 장기 사용에 대한 사용자 의견은?`
      ),
      answer: t(
        `Based on collected reviews, users generally report ${averageScore >= 0.6 ? "positive long-term experiences" : "mixed feedback on longevity"}. Key topics include ${keywords.positive.slice(0, 2).join(", ") || "build quality"}.`,
        `수집된 리뷰에 따르면 사용자들은 ${averageScore >= 0.6 ? "전반적으로 긍정적인 장기 사용 경험" : "내구성에 대한 다양한 의견"}을 보고하고 있습니다. 주요 관심사는 ${keywords.positive.slice(0, 2).join(", ") || "제품 품질"} 등입니다.`
      ),
    },
  ];

  const tagline = averageScore >= 0.7
    ? t(
        `✨ "${productName}" — ${keywords.positive[0] || "Quality"} recognized by users. Experience it yourself.`,
        `✨ "${productName}" — 사용자들이 인정한 ${keywords.positive[0] || "품질"}, 직접 경험해보세요`
      )
    : t(
        `📊 "${productName}" — See what real reviews say.`,
        `📊 "${productName}" — 솔직한 리뷰로 확인하세요`
      );

  const reviewGuide = lang === "en"
    ? `
📝 ${productName} Review Guide

🟢 Strengths:
${keywords.positive.map((k) => `  • ${k}`).join("\n") || "  • Collecting data"}

🔴 Areas for Improvement:
${keywords.negative.map((k) => `  • ${k}`).join("\n") || "  • No notable issues"}

📈 Overall Sentiment Summary:
  • Positive: ${positive} reviews (${posPercent}%)
  • Negative: ${negative} reviews (${negPercent}%)
  • Neutral: ${neutral} reviews (${neuPercent}%)
  • Average Score: ${(averageScore * 100).toFixed(0)}/100

💡 Marketing Recommendation:
${averageScore >= 0.7 ? "  → Strongly recommended for positive review-based SNS marketing" : "  → Recommend addressing improvement areas before marketing push"}
`.trim()
    : `
📝 ${productName} 리뷰 가이드

🟢 강점 포인트:
${keywords.positive.map((k) => `  • ${k}`).join("\n") || "  • 데이터 수집 중"}

🔴 개선 포인트:
${keywords.negative.map((k) => `  • ${k}`).join("\n") || "  • 특이사항 없음"}

📈 전체 감성 요약:
  • 긍정: ${positive}건 (${posPercent}%)
  • 부정: ${negative}건 (${negPercent}%)
  • 중립: ${neutral}건 (${neuPercent}%)
  • 평균 점수: ${(averageScore * 100).toFixed(0)}/100

💡 마케팅 추천:
${averageScore >= 0.7 ? "  → 긍정 리뷰 기반 SNS 마케팅 적극 추천" : "  → 개선점 보완 후 마케팅 집행 권장"}
`.trim();

  return { qaList, reviewGuide, tagline, strengthsSummary, weaknessesSummary };
}
