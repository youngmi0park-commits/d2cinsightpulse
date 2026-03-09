import type { SentimentResult } from "./sentiment";

export interface MarketingOutput {
  qaList: { question: string; answer: string }[];
  reviewGuide: string;
  tagline: string;
  strengthsSummary: string;
  weaknessesSummary: string;
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
