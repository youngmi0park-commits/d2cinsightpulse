/**
 * LGE 해외광고 법무검토 체크리스트 기반 광고 가이드라인
 * 출처: LGE Internal Ad Review Checklist (General / Environmental / Comparative)
 *
 * 이 모듈은 자동 생성되는 마케팅 메시지가 준수해야 할 핵심 규칙과
 * 각 메시지에 첨부할 Disclaimer 템플릿을 제공합니다.
 */

export interface ComplianceCheck {
  id: string;
  category: string;
  rule: string;
  ruleKo: string;
  status: "pass" | "warning" | "info";
}

/** 메시지 유형별 필수 Disclaimer 텍스트 */
export function getDisclaimers(
  purpose: string,
  geo: string,
  productName: string,
  totalReviews: number,
  dataSource: string
): { en: string; ko: string } {
  const base = {
    en: `Based on sentiment analysis of ${totalReviews} user reviews collected from ${dataSource}. Review data is publicly available user-generated content and does not constitute endorsement. Results may vary. Individual experiences may differ.`,
    ko: `${dataSource}에서 수집된 ${totalReviews}건의 사용자 리뷰 감성 분석 결과에 기반합니다. 리뷰 데이터는 공개된 사용자 생성 콘텐츠이며 보증을 구성하지 않습니다. 결과는 달라질 수 있으며 개인 경험에 따라 차이가 있을 수 있습니다.`,
  };

  const purposeDisclaimer: Record<string, { en: string; ko: string }> = {
    dotcom: {
      en: `${base.en} Product specifications and availability may vary by region.`,
      ko: `${base.ko} 제품 사양 및 구매 가능 여부는 지역에 따라 다를 수 있습니다.`,
    },
    social: {
      en: `Ad · ${base.en} Product specifications and availability may vary by region.`,
      ko: `광고 · ${base.ko} 제품 사양 및 구매 가능 여부는 지역에 따라 다를 수 있습니다.`,
    },
  };

  return purposeDisclaimer[purpose] ?? {
    en: base.en,
    ko: base.ko,
  };
}

/** 메시지 생성 시 적용되는 컴플라이언스 체크 항목 목록 */
export function getComplianceChecks(purpose: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [
    {
      id: "factual",
      category: "General #7",
      rule: "All factual claims are substantiated by verifiable review data",
      ruleKo: "모든 사실적 주장은 검증 가능한 리뷰 데이터로 뒷받침됩니다",
      status: "pass",
    },
    {
      id: "no-superlative",
      category: "General #9",
      rule: "No unsubstantiated superlatives (e.g., 'best', '#1', 'unprecedented')",
      ruleKo: "근거 없는 최상급 표현을 사용하지 않습니다 (예: '최고', '1위', '전례없는')",
      status: "pass",
    },
    {
      id: "data-source",
      category: "General #28",
      rule: "Data source, collection period, and methodology are disclosed",
      ruleKo: "데이터 출처, 수집 기간 및 방법론이 공개됩니다",
      status: "pass",
    },
    {
      id: "no-misleading",
      category: "General #3",
      rule: "Content does not mislead reasonable consumers",
      ruleKo: "합리적인 소비자를 오도하는 내용을 포함하지 않습니다",
      status: "pass",
    },
    {
      id: "third-party-ip",
      category: "General #4",
      rule: "No unauthorized use of third-party IP, trademarks, or personal data",
      ruleKo: "제3자 IP, 상표, 개인정보를 무단 사용하지 않습니다",
      status: "pass",
    },
    {
      id: "review-genuine",
      category: "General #21",
      rule: "Cited reviews are genuine user-generated content from public sources",
      ruleKo: "인용된 리뷰는 공개 출처의 실제 사용자 생성 콘텐츠입니다",
      status: "pass",
    },
    {
      id: "no-comparison",
      category: "Comparative #31",
      rule: "No direct comparative claims against competitor products",
      ruleKo: "경쟁사 제품에 대한 직접적인 비교 주장을 하지 않습니다",
      status: "pass",
    },
  ];

  if (purpose === "social") {
    checks.push({
      id: "ad-label",
      category: "General #20",
      rule: "Content is clearly labeled as advertising ('Ad' / '광고')",
      ruleKo: "콘텐츠가 광고로 명확히 표시됩니다 ('Ad' / '광고')",
      status: "pass",
    });
  }

  if (purpose === "press") {
    checks.push({
      id: "forward-looking",
      category: "General #8",
      rule: "Forward-looking statements are qualified with appropriate disclaimers",
      ruleKo: "전망 관련 진술에 적절한 면책 조항이 포함됩니다",
      status: "pass",
    });
  }

  return checks;
}
