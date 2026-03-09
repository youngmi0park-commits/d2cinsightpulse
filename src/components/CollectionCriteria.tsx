import { Database, Globe, Calendar, Filter, MessageSquare, ShieldCheck, Languages, Tag } from "lucide-react";

const criteria = [
  {
    icon: Globe,
    title: "수집 채널",
    items: [
      "Reddit — r/LG, r/OLED, r/HomeTheater, r/laptops, r/Laundry 등 주요 서브레딧",
      "Amazon US (amazon.com) — Verified Purchase 리뷰 우선 수집",
    ],
  },
  {
    icon: Calendar,
    title: "수집 기간",
    items: [
      "최근 1년 (rolling 12개월) 기준",
      "월별 수집 → 시계열 트렌드 분석 가능",
    ],
  },
  {
    icon: Languages,
    title: "수집 언어",
    items: [
      "영문(English) 리뷰만 대상",
      "비영어 리뷰는 노이즈 방지를 위해 제외",
    ],
  },
  {
    icon: Tag,
    title: "대상 브랜드 · 제품",
    items: [
      "LG Electronics 공식 제품명 기준 매칭",
      "모델명, 시리즈명, 별칭(예: C4, gram) 포함 키워드 확장 검색",
      "TV, 노트북, 생활가전, 프로젝터, 모니터 등 전 카테고리",
    ],
  },
  {
    icon: Filter,
    title: "필터링 기준",
    items: [
      "Reddit: 댓글 길이 20자 이상, 삭제·봇 계정 제외",
      "Amazon: 별점 1~5 전체 수집, Verified Purchase 우선",
      "스팸·광고성 리뷰 자동 필터링 (중복 문구, 과도한 링크 등)",
      "제품과 무관한 배송·포장 불만 리뷰 별도 태깅",
    ],
  },
  {
    icon: MessageSquare,
    title: "수집 데이터 항목",
    items: [
      "리뷰 본문 텍스트 (제목 + 내용)",
      "작성자, 작성일, 별점(Amazon), 추천수(Reddit)",
      "출처 URL 및 플랫폼 구분 태그",
    ],
  },
  {
    icon: Database,
    title: "데이터 처리",
    items: [
      "NLP 전처리: 소문자화, 특수문자 제거, 불용어 처리",
      "감성 분석: 긍정 / 부정 / 중립 3분류 + 점수화 (0~1)",
      "키워드 추출: TF-IDF 기반 장점·단점 핵심 키워드 도출",
    ],
  },
  {
    icon: ShieldCheck,
    title: "데이터 품질 관리",
    items: [
      "중복 리뷰 자동 제거 (해시 기반 dedup)",
      "최소 리뷰 수 미달 제품은 '데이터 부족' 표시",
      "수집 주기: 일 1회 자동 크롤링 (추후 실시간 전환 예정)",
    ],
  },
];

export const CollectionCriteria = () => {
  return (
    <div className="gradient-card rounded-xl border border-border p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6 text-primary" />
        <h3 className="text-xl font-bold font-heading">📋 데이터 수집 기준</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        본 대시보드는 아래 기준에 따라 수집된 데이터를 기반으로 감성 분석 및 마케팅 인사이트를 제공합니다.
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
  );
};
