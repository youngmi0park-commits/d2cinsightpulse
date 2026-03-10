import { Database, Globe, Calendar, Filter, MessageSquare, ShieldCheck, Languages, ChevronDown, TrendingUp, MapPin, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useLang } from "@/contexts/LanguageContext";

interface CriteriaItem {
  icon: typeof Database;
  titleEn: string;
  titleKo: string;
  itemsEn: string[];
  itemsKo: string[];
}

const criteria: CriteriaItem[] = [
  {
    icon: Globe,
    titleEn: "Collection Channels",
    titleKo: "수집 채널",
    itemsEn: [
      "Reddit — Major subreddits (r/OLED, r/hometheater, r/ultrawidemasterrace, r/LGgram, etc.)",
      "Amazon — Product review sections (US, UK, CA, DE, IN, FR and other major marketplaces)",
      "RTINGS — Professional TV/Monitor/Projector reviews and measurement data",
      "Trusted Reviews — Professional editor reviews for TV/Monitor/Laptop (UK-based)",
      "Consumer Reports — Consumer evaluation and reliability reports for appliances/TV/laptops (US-based)",
      "CNET — Tech media editor reviews and Editor's Choice ratings",
      "Trustpilot — Direct consumer reviews for appliances/services and CS evaluation",
      "BestReviews — Comprehensive appliance/projector recommendation reviews",
    ],
    itemsKo: [
      "Reddit — 주요 서브레딧 (r/OLED, r/hometheater, r/ultrawidemasterrace, r/LGgram 등)",
      "Amazon — 제품별 리뷰 섹션 (US, UK, CA, DE, IN, FR 등 주요 마켓플레이스)",
      "RTINGS — TV·모니터·프로젝터 전문 리뷰 및 측정 데이터",
      "Trusted Reviews — TV·모니터·노트북 전문 에디터 리뷰 (UK 기반)",
      "Consumer Reports — 가전·TV·노트북 소비자 평가 및 신뢰도 리포트 (US 기반)",
      "CNET — 테크 미디어 에디터 리뷰 및 Editor's Choice 평가",
      "Trustpilot — 가전·서비스 소비자 직접 리뷰 및 CS 평가",
      "BestReviews — 가전·프로젝터 종합 추천 리뷰",
    ],
  },
  {
    icon: MapPin,
    titleEn: "Target Regions (Top 10)",
    titleKo: "대상 지역 (Top 10)",
    itemsEn: [
      "🇺🇸 United States — Largest Reddit user base & highest lg.com traffic",
      "🇬🇧 United Kingdom — 2nd largest English-speaking, high Reddit engagement",
      "🇨🇦 Canada — Large English-speaking user base, active tech communities",
      "🇦🇺 Australia — 4th largest English-speaking, high activity",
      "🇩🇪 Germany — Non-English but active on English Reddit, top lg.com interest",
      "🇮🇳 India · 🇫🇷 France · 🇧🇷 Brazil · 🇳🇱 Netherlands · 🇲🇽 Mexico",
    ],
    itemsKo: [
      "🇺🇸 미국 — Reddit 최대 사용자 & lg.com 최대 트래픽",
      "🇬🇧 영국 — 영어권 2위, Reddit 참여도 높음",
      "🇨🇦 캐나다 — 영어권 대형 사용자, 테크 커뮤니티 활발",
      "🇦🇺 호주 — 영어권 4위권, 활동성 높음",
      "🇩🇪 독일 — 비영어권이지만 영문 Reddit 활발, lg.com 관심 상위",
      "🇮🇳 인도 · 🇫🇷 프랑스 · 🇧🇷 브라질 · 🇳🇱 네덜란드 · 🇲🇽 멕시코",
    ],
  },
  {
    icon: TrendingUp,
    titleEn: "Selection Logic",
    titleKo: "선정 로직",
    itemsEn: [
      "Primary metric: Reddit annual users by country (WorldPopulationReview)",
      "Weighting: English-speaking proportion (English-speaking countries ↑, non-English English activity included)",
      "Verification: lg.com traffic distribution for CE interest validation (SimilarWeb)",
    ],
    itemsKo: [
      "1차 지표: Reddit 국가별 연간 사용자 수 (WorldPopulationReview)",
      "가중치: 영어권/영문 사용 비중 (영어권 국가 ↑, 비영어권 영문 활동 포함)",
      "보조 확인: lg.com 트래픽 분포로 CE 관심도 검증 (SimilarWeb)",
    ],
  },
  {
    icon: Calendar,
    titleEn: "Collection Period",
    titleKo: "수집 기간",
    itemsEn: [
      "Based on last 12 months data (rolling update)",
      "Intensive collection around major sales seasons (Black Friday, CES, etc.)",
    ],
    itemsKo: [
      "최근 12개월 데이터 기준 (롤링 업데이트)",
      "주요 세일 시즌(Black Friday, CES 등) 전후 집중 수집",
    ],
  },
  {
    icon: Filter,
    titleEn: "Target Products",
    titleKo: "수집 대상 제품",
    itemsEn: [
      "LG OLED evo G5 / C Series — Premium TV",
      "LG UltraGear evo G9 — Gaming Monitor",
      "LG gram — Ultralight Laptop",
      "LG WashTower — Washer-Dryer",
      "LG CineBeam — Projector",
    ],
    itemsKo: [
      "LG OLED evo G5 / C 시리즈 — 프리미엄 TV",
      "LG UltraGear evo G9 — 게이밍 모니터",
      "LG gram — 울트라라이트 노트북",
      "LG WashTower — 세탁건조기",
      "LG CineBeam — 프로젝터",
    ],
  },
  {
    icon: MessageSquare,
    titleEn: "Common Interest Topics (Cross-Region)",
    titleKo: "공통 관심 주제 (크로스 지역)",
    itemsEn: [
      "OLED TV (C/G series), QNED/Mini LED, UltraGear gaming monitors",
      "Price/sale comparisons, warranty/service, wall mounting, calibration",
      "Console/PC connectivity (VRR, 4K120Hz, G-SYNC/FreeSync)",
      "Cross-country pricing, import vs official distribution, eARC/soundbar compatibility",
    ],
    itemsKo: [
      "OLED TV (C/G 시리즈), QNED/Mini LED, UltraGear 게이밍 모니터",
      "가격/세일 비교, 보증/AS, 벽걸이 설치, 캘리브레이션",
      "콘솔/PC 연결성 (VRR, 4K120Hz, G-SYNC/FreeSync)",
      "국가별 가격차, 직구 vs 정식 유통, eARC/사운드바 호환",
    ],
  },
  {
    icon: Languages,
    titleEn: "Language Processing",
    titleKo: "언어 처리",
    itemsEn: [
      "English reviews collected first (English-speaking perspective)",
      "Non-English Reddit activity in English included (Germany, Netherlands, etc.)",
      "Multi-language NLP expansion planned",
    ],
    itemsKo: [
      "영어 리뷰 1차 수집 (영어권 중심 관점)",
      "비영어권 영문 Reddit 활동 포함 (독일, 네덜란드 등)",
      "향후 다국어 NLP 확장 예정",
    ],
  },
  {
    icon: ShieldCheck,
    titleEn: "Data Quality Management",
    titleKo: "데이터 품질 관리",
    itemsEn: [
      "Bot/spam filtering applied",
      "Only reviews meeting minimum character count collected",
      "Sources: Verified via WorldPopulationReview, ExpertBeacon, SimilarWeb",
    ],
    itemsKo: [
      "봇/스팸 필터링 적용",
      "최소 문자 수 기준 충족 리뷰만 수집",
      "출처: WorldPopulationReview, ExpertBeacon, SimilarWeb 기반 검증",
    ],
  },
];

export const CollectionCriteria = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLang();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full gradient-card rounded-xl border border-border p-4 md:p-5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold font-heading">📋 {t("Data Collection Criteria", "데이터 수집 기준")}</h3>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="gradient-card rounded-b-xl border border-t-0 border-border p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-6">
            {t(
              "This dashboard provides sentiment analysis and marketing insights based on data collected according to the criteria below. Top 10 countries were selected by combining Reddit user counts (WorldPopulationReview), English usage proportion, and lg.com traffic (SimilarWeb).",
              "본 대시보드는 아래 기준에 따라 수집된 데이터를 기반으로 감성 분석 및 마케팅 인사이트를 제공합니다. Reddit 국가별 사용자 수(WorldPopulationReview), 영어 사용 비중, lg.com 트래픽(SimilarWeb)을 종합하여 상위 10개국을 선정하였습니다."
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {criteria.map((c) => {
              const Icon = c.icon;
              const title = t(c.titleEn, c.titleKo);
              const items = t(c.titleEn, c.titleKo) === c.titleEn ? c.itemsEn : c.itemsKo;
              return (
                <div key={c.titleEn} className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    <h4 className="font-semibold font-heading text-sm">{title}</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
