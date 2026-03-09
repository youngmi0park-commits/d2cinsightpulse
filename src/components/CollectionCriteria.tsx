import { Database, Globe, Calendar, Filter, MessageSquare, ShieldCheck, Languages, Tag, ChevronDown, TrendingUp, MapPin } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const criteria = [
  {
    icon: Globe,
    title: "수집 채널",
    items: [
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
    title: "대상 지역 (Top 10)",
    items: [
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
    title: "선정 로직",
    items: [
      "1차 지표: Reddit 국가별 연간 사용자 수 (WorldPopulationReview)",
      "가중치: 영어권/영문 사용 비중 (영어권 국가 ↑, 비영어권 영문 활동 포함)",
      "보조 확인: lg.com 트래픽 분포로 CE 관심도 검증 (SimilarWeb)",
    ],
  },
  {
    icon: Calendar,
    title: "수집 기간",
    items: [
      "최근 12개월 데이터 기준 (롤링 업데이트)",
      "주요 세일 시즌(Black Friday, CES 등) 전후 집중 수집",
    ],
  },
  {
    icon: Filter,
    title: "수집 대상 제품",
    items: [
      "LG OLED evo G5 / C 시리즈 — 프리미엄 TV",
      "LG UltraGear evo G9 — 게이밍 모니터",
      "LG gram — 울트라라이트 노트북",
      "LG WashTower — 세탁건조기",
      "LG CineBeam — 프로젝터",
    ],
  },
  {
    icon: MessageSquare,
    title: "공통 관심 주제 (크로스 지역)",
    items: [
      "OLED TV (C/G 시리즈), QNED/Mini LED, UltraGear 게이밍 모니터",
      "가격/세일 비교, 보증/AS, 벽걸이 설치, 캘리브레이션",
      "콘솔/PC 연결성 (VRR, 4K120Hz, G-SYNC/FreeSync)",
      "국가별 가격차, 직구 vs 정식 유통, eARC/사운드바 호환",
    ],
  },
  {
    icon: Languages,
    title: "언어 처리",
    items: [
      "영어 리뷰 1차 수집 (영어권 중심 관점)",
      "비영어권 영문 Reddit 활동 포함 (독일, 네덜란드 등)",
      "향후 다국어 NLP 확장 예정",
    ],
  },
  {
    icon: ShieldCheck,
    title: "데이터 품질 관리",
    items: [
      "봇/스팸 필터링 적용",
      "최소 문자 수 기준 충족 리뷰만 수집",
      "출처: WorldPopulationReview, ExpertBeacon, SimilarWeb 기반 검증",
    ],
  },
];

export const CollectionCriteria = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full gradient-card rounded-xl border border-border p-4 md:p-5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold font-heading">📋 데이터 수집 기준</h3>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="gradient-card rounded-b-xl border border-t-0 border-border p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-6">
            본 대시보드는 아래 기준에 따라 수집된 데이터를 기반으로 감성 분석 및 마케팅 인사이트를 제공합니다.
            Reddit 국가별 사용자 수(WorldPopulationReview), 영어 사용 비중, lg.com 트래픽(SimilarWeb)을 종합하여 상위 10개국을 선정하였습니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {criteria.map(({ icon: Icon, title, items }) => (
              <div key={title} className="rounded-lg border border-border bg-background/50 p-4">
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
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
