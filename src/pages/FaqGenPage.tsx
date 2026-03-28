import { useState } from "react";
import { HelpCircle, Sparkles, Package, BarChart3, ChevronRight, Search, List } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { SearchBar } from "@/components/SearchBar";

/* ── Sub-components ── */

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">
        {step}
      </span>
      <h2 className="text-base font-bold font-heading text-foreground">{title}</h2>
      <span className="text-xs text-muted-foreground ml-auto">{subtitle}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-3">
      {children}
    </p>
  );
}

/* ── Quick Guide Steps ── */
const QUICK_GUIDE = [
  { icon: "1️⃣", titleEn: "Search Product", titleKo: "제품 검색", descEn: "Search by model number or category", descKo: "모델번호 또는 카테고리로 검색" },
  { icon: "2️⃣", titleEn: "Review Analysis", titleKo: "리뷰 분석", descEn: "AI analyzes collected reviews", descKo: "수집된 리뷰를 AI가 분석" },
  { icon: "3️⃣", titleEn: "FAQ Generation", titleKo: "FAQ 생성", descEn: "Evidence-based FAQ auto-generated", descKo: "증거 기반 FAQ 자동 생성" },
  { icon: "4️⃣", titleEn: "Copy & Use", titleKo: "복사 · 활용", descEn: "Copy to PDP or marketing materials", descKo: "PDP 또는 마케팅 자료에 활용" },
];

/* ── Data ── */

const PIPELINE_STEPS = [
  { icon: "📊", titleEn: "Data Collection", titleKo: "데이터 수집", descEn: "LG.com reviews + Reddit + YouTube comments aggregated per product", descKo: "LG.com 리뷰 + Reddit + YouTube 댓글을 제품별로 수집·통합" },
  { icon: "🔍", titleEn: "Evidence Engine", titleKo: "에비던스 엔진", descEn: "Min. 2 citations per FAQ — review quotes, quantitative metrics, statistical patterns", descKo: "FAQ당 최소 2개 증거 — 리뷰 인용, 정량 데이터, 통계 패턴" },
  { icon: "📈", titleEn: "CIS Scoring", titleKo: "CIS 점수 산정", descEn: "Conversion Impact Score determines priority: P0 → P1 → P2 → Backlog", descKo: "전환 영향도(CIS) 점수로 우선순위 결정: P0 → P1 → P2 → Backlog" },
  { icon: "⚖️", titleEn: "Legal Gate", titleKo: "법무 검토 게이트", descEn: "Automated compliance check — only approved items are published", descKo: "자동 법무 사전 검토 — 승인된 항목만 발행" },
];

const CATEGORIES = [
  { icon: "🔧", labelEn: "Installation & Initial Setup", labelKo: "설치 · 초기 설정", color: "border-orange-500/30 bg-orange-500/5", descEn: "Mounting, wall bracket, first-time power-on, remote pairing", descKo: "벽걸이 설치, 전원 최초 연결, 리모컨 페어링 등" },
  { icon: "🖥️", labelEn: "Display & Sound Settings", labelKo: "화면 · 사운드 설정", color: "border-purple-500/30 bg-purple-500/5", descEn: "Picture mode, HDR calibration, Dolby Atmos, soundbar sync", descKo: "화면 모드, HDR 보정, Dolby Atmos, 사운드바 연동" },
  { icon: "📡", labelEn: "Connectivity & Smart Features", labelKo: "연결성 · 스마트 기능", color: "border-cyan-500/30 bg-cyan-500/5", descEn: "Wi-Fi, Bluetooth, ThinQ, Matter/Thread, AirPlay, casting", descKo: "Wi-Fi, 블루투스, ThinQ, Matter/Thread, AirPlay, 캐스팅" },
  { icon: "🛡️", labelEn: "Purchase Anxiety & Warranty", labelKo: "구매 불안 · 보증", color: "border-amber-500/30 bg-amber-500/5", descEn: "Burn-in concerns, extended warranty, return policy, durability", descKo: "번인 우려, 연장 보증, 반품 정책, 내구성" },
  { icon: "💰", labelEn: "Price & Value Proposition", labelKo: "가격 · 가치 제안", color: "border-success/30 bg-success/5", descEn: "Price justification, bundle deals, competitor price comparison", descKo: "가격 정당성, 번들 혜택, 경쟁사 가격 비교" },
  { icon: "⚔️", labelEn: "Competitor Comparison", labelKo: "경쟁사 비교", color: "border-violet-500/30 bg-violet-500/5", descEn: "LG vs Samsung, LG vs Sony — feature-by-feature breakdown", descKo: "LG vs 삼성, LG vs 소니 — 기능별 상세 비교" },
];

const OUTPUT_FORMATS = [
  { icon: "❓", titleEn: "FAQ Cards", titleKo: "FAQ 카드", descEn: "Q&A with evidence citations, CIS score, priority badge, legal status, and PDP presence check per item", descKo: "증거 인용, CIS 점수, 우선순위 뱃지, 법무 상태, PDP 반영 여부 포함된 개별 Q&A 카드" },
  { icon: "📋", titleEn: "Weekly Action List", titleKo: "주간 액션리스트", descEn: "Immediately actionable marketing copy and PDP optimization suggestions with A/B test hypotheses included", descKo: "즉시 활용 가능한 마케팅 카피와 PDP 최적화 제안 (A/B 테스트 가설 포함)" },
  { icon: "🔥", titleEn: "CS Heatmap", titleKo: "CS 히트맵", descEn: "Customer service issue frequency map with CIS averages and action-required flags for each issue", descKo: "CS 이슈 빈도 맵 — 이슈별 CIS 평균, 조치 필요 플래그 포함" },
];

const EVIDENCE_TYPES = [
  { icon: "💬", titleEn: "Review Quotes", titleKo: "리뷰 인용", descEn: "Direct verbatim quotes from verified purchasers with source attribution", descKo: "검증된 구매자의 직접 인용문 (출처 표기)" },
  { icon: "📊", titleEn: "Quantitative Metrics", titleKo: "정량 데이터", descEn: "Statistical measures: mention frequency, sentiment ratios, NPS scores", descKo: "통계 수치: 언급 빈도, 감성 비율, NPS 점수" },
  { icon: "📐", titleEn: "Statistical Patterns", titleKo: "통계 패턴", descEn: "Cross-review trend analysis: recurring themes, seasonal patterns", descKo: "리뷰 교차 분석: 반복 테마, 시즌별 패턴" },
];

const CIS_PRIORITIES = [
  { level: "P0", scoreEn: "CIS ≥ 80", scoreKo: "CIS ≥ 80", descEn: "Critical — Must be on PDP immediately. High conversion impact.", descKo: "긴급 — PDP 즉시 반영 필수. 전환 영향도 최고.", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  { level: "P1", scoreEn: "CIS 60–79", scoreKo: "CIS 60–79", descEn: "Important — Should be addressed within 1 sprint cycle.", descKo: "중요 — 1 스프린트 내 반영 권장.", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { level: "P2", scoreEn: "CIS 40–59", scoreKo: "CIS 40–59", descEn: "Nice to have — Include in quarterly content refresh.", descKo: "선택적 — 분기 콘텐츠 갱신 시 포함.", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  { level: "Backlog", scoreEn: "CIS < 40", scoreKo: "CIS < 40", descEn: "Monitor — Low impact, revisit when data accumulates.", descKo: "모니터링 — 영향도 낮음, 데이터 누적 시 재검토.", color: "bg-muted text-muted-foreground border-border" },
];

const LEGAL_CHECKS = [
  { icon: "✅", statusEn: "Pass", statusKo: "통과", descEn: "All claims substantiated. Ready to publish.", descKo: "모든 주장 입증 완료. 발행 가능." },
  { icon: "⚠️", statusEn: "Needs Revision", statusKo: "수정 필요", descEn: "Minor issues found — revise specific claims before publishing.", descKo: "경미한 문제 발견 — 특정 주장 수정 후 발행." },
  { icon: "❌", statusEn: "Fail", statusKo: "실패", descEn: "Unsubstantiated or misleading claims. Do not publish.", descKo: "미입증 또는 오해 유발 주장. 발행 불가." },
];

const SAMPLE_FAQ = {
  question: "Will I experience burn-in with LG OLED?",
  questionKo: "LG OLED에서 번인이 발생하나요?",
  answer: "Among 6,000+ verified long-term owners, only 1.2% reported any visible burn-in. LG OLED Care+ further minimizes risk with automatic pixel management.",
  answerKo: "6,000명 이상의 장기 사용자 중 1.2%만 번인 현상을 보고했습니다. LG OLED Care+가 자동 픽셀 관리로 위험을 최소화합니다.",
  category: "Purchase Anxiety",
  categoryKo: "구매 불안 해소",
  priority: "P0",
  cis: 84,
  evidence: ["6,000+ verified owners surveyed", "1.2% burn-in incident rate", "OLED Care+ automatic pixel refresh"],
  evidenceKo: ["6,000명+ 검증된 사용자 조사", "1.2% 번인 발생률", "OLED Care+ 자동 픽셀 리프레시"],
  legal: "pass" as const,
  pdpStatus: "missing" as const,
};

/* ── Main Page ── */

export default function FaqGenPage() {
  const { t } = useLang();
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    toast.success(t("Copied!", "복사 완료!"));
    setTimeout(() => setCopiedMap((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    toast.info(t(`Searching "${query}" for FAQ generation...`, `"${query}" FAQ 생성을 위해 검색 중...`));
    // Simulate search completion
    setTimeout(() => setIsSearching(false), 1500);
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={HelpCircle}
        title={t("🤖 AI FAQ Generation", "🤖 AI FAQ 자동 생성")}
        description={t(
          "Search a product and automatically generate conversion-optimized FAQs from real user reviews.",
          "제품을 검색하고 실사용자 리뷰 기반 전환 최적화 FAQ를 자동 생성합니다."
        )}
      />

      {/* ═══════ Quick Guide — Horizontal Steps ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-foreground">{t("How It Works", "이용 가이드")}</p>
          <span className="text-[10px] text-muted-foreground ml-1">{t("Product search → AI analysis → FAQ generation → Copy & use", "제품 검색 → AI 분석 → FAQ 생성 → 복사 · 활용")}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {QUICK_GUIDE.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-card border border-border rounded-[10px] px-3 py-2.5 relative">
              <span className="text-base shrink-0">{step.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate">{t(step.titleEn, step.titleKo)}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t(step.descEn, step.descKo)}</p>
              </div>
              {i < QUICK_GUIDE.length - 1 && (
                <ChevronRight className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ Product Search Bar ═══════ */}
      <div className="gradient-card rounded-xl border border-primary/20 p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-foreground">{t("Product Search", "제품 검색")}</p>
          <span className="text-[10px] text-muted-foreground ml-1">{t("Search to start FAQ generation", "FAQ 생성을 위해 제품을 검색하세요")}</span>
        </div>
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        {searchQuery && !isSearching && (
          <div className="mt-4 bg-primary/5 border border-primary/20 rounded-[10px] p-3 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-[11px] text-foreground/80">
              <span className="font-bold text-primary">"{searchQuery}"</span>{" "}
              {t(
                "— Reviews found. Navigate to the product detail page to generate AI FAQs with full evidence.",
                "— 리뷰가 확인되었습니다. 제품 상세 페이지에서 AI FAQ를 생성할 수 있습니다."
              )}
            </p>
          </div>
        )}
      </div>

      {/* ═══════ STEP 1 — Pipeline Overview ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <StepHeader step={1} title={t("Generation Pipeline", "생성 파이프라인")} subtitle={t("4-stage automated workflow", "4단계 자동화 Workflow")} />

        <div className="bg-muted/40 border border-border rounded-lg p-3 mb-5 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">{t("D2C Insight Pulse FAQ Orchestrator", "D2C Insight Pulse FAQ 오케스트레이터")}</strong>{" "}
            {t(
              "— Combines real user reviews and official LG product specs (lg.com/us) to auto-generate conversion-optimized FAQs. Every FAQ passes through 4 rigorous stages before publication.",
              "— 실사용자 리뷰와 LG USA 공식 제품 정보(lg.com/us)를 결합해 전환 중심의 FAQ를 자동 생성합니다. 모든 FAQ는 발행 전 4단계 검증을 거칩니다."
            )}
          </p>
        </div>

        <SectionLabel>📋 {t("PIPELINE STAGES", "파이프라인 단계")}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={i} className="bg-card border border-border rounded-[10px] p-4 text-center relative">
              <span className="text-2xl block mb-2">{step.icon}</span>
              <p className="text-[11px] font-bold text-foreground mb-1">{t(step.titleEn, step.titleKo)}</p>
              <p className="text-[10.5px] text-muted-foreground leading-relaxed">{t(step.descEn, step.descKo)}</p>
              {i < PIPELINE_STEPS.length - 1 && (
                <ChevronRight className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>

        {/* Evidence Types */}
        <SectionLabel>🔎 {t("EVIDENCE ENGINE — CITATION TYPES", "에비던스 엔진 — 인용 유형")}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EVIDENCE_TYPES.map((ev, i) => (
            <div key={i} className="bg-card border border-border rounded-[10px] p-4 flex gap-3">
              <span className="text-lg shrink-0">{ev.icon}</span>
              <div>
                <p className="text-[11px] font-bold text-foreground mb-0.5">{t(ev.titleEn, ev.titleKo)}</p>
                <p className="text-[10.5px] text-muted-foreground leading-relaxed">{t(ev.descEn, ev.descKo)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ STEP 2 — CIS Scoring & Priority ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <StepHeader step={2} title={t("CIS Scoring & Priority", "CIS 점수 & 우선순위")} subtitle={t("Conversion Impact Score → priority assignment", "전환 영향도 점수 → 우선순위 배정")} />

        <div className="bg-muted/40 border border-border rounded-lg p-3 mb-5 flex items-start gap-2">
          <BarChart3 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">{t("Conversion Impact Score (CIS)", "전환 영향도 점수 (CIS)")}</strong>{" "}
            {t(
              "— Measures how much a FAQ topic impacts purchase conversion. Calculated from mention frequency, sentiment intensity, and competitive relevance.",
              "— FAQ 주제가 구매 전환에 미치는 영향을 측정합니다. 언급 빈도, 감성 강도, 경쟁 관련성을 종합하여 산출합니다."
            )}
          </p>
        </div>

        <SectionLabel>🏷️ {t("PRIORITY LEVELS", "우선순위 등급")}</SectionLabel>
        <div className="space-y-2.5 mb-6">
          {CIS_PRIORITIES.map((p, i) => (
            <div key={i} className={`flex items-center gap-3.5 px-4 py-3 rounded-[10px] border ${p.color}`}>
              <span className="text-xs font-bold w-16 shrink-0">{p.level}</span>
              <span className="text-[10.5px] font-mono text-muted-foreground w-20 shrink-0">{t(p.scoreEn, p.scoreKo)}</span>
              <span className="text-[11px] text-foreground/80 leading-relaxed">{t(p.descEn, p.descKo)}</span>
            </div>
          ))}
        </div>

        {/* Legal Review Gate */}
        <SectionLabel>⚖️ {t("LEGAL REVIEW GATE", "법무 사전 검토 게이트")}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LEGAL_CHECKS.map((l, i) => (
            <div key={i} className="bg-card border border-border rounded-[10px] p-4 flex gap-3">
              <span className="text-lg shrink-0">{l.icon}</span>
              <div>
                <p className="text-[11px] font-bold text-foreground mb-0.5">{t(l.statusEn, l.statusKo)}</p>
                <p className="text-[10.5px] text-muted-foreground leading-relaxed">{t(l.descEn, l.descKo)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ STEP 3 — Category Classification ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <StepHeader step={3} title={t("Auto Category Classification", "자동 카테고리 분류")} subtitle={t("Topic-based auto-sorting for generated FAQs", "생성된 FAQ의 주제 기반 자동 분류")} />

        <div className="bg-muted/40 border border-border rounded-lg p-3 mb-5 flex items-start gap-2">
          <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(
              "Generated FAQs are automatically classified into 6 topic categories based on content analysis. Each category maps to specific PDP sections and marketing channels.",
              "생성된 FAQ는 콘텐츠 분석을 기반으로 6개 주제 카테고리에 자동 분류됩니다. 각 카테고리는 특정 PDP 섹션 및 마케팅 채널에 매핑됩니다."
            )}
          </p>
        </div>

        <SectionLabel>🏷️ {t("FAQ CATEGORIES", "FAQ 카테고리")}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CATEGORIES.map((cat, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3.5 rounded-[10px] border ${cat.color}`}>
              <span className="text-lg shrink-0 mt-0.5">{cat.icon}</span>
              <div>
                <p className="text-[11px] font-bold text-foreground mb-0.5">{t(cat.labelEn, cat.labelKo)}</p>
                <p className="text-[10.5px] text-muted-foreground leading-relaxed">{t(cat.descEn, cat.descKo)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ STEP 4 — Output Formats ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <StepHeader step={4} title={t("Output Formats", "출력 형식")} subtitle={t("FAQ Cards · Weekly Actions · CS Heatmap", "FAQ 카드 · 주간 액션 · CS 히트맵")} />

        <SectionLabel>📤 {t("DELIVERABLES", "산출물")}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {OUTPUT_FORMATS.map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-[10px] p-4">
              <span className="text-xl block mb-2">{item.icon}</span>
              <p className="text-[11px] font-bold text-foreground mb-1">{t(item.titleEn, item.titleKo)}</p>
              <p className="text-[10.5px] text-muted-foreground leading-relaxed">{t(item.descEn, item.descKo)}</p>
            </div>
          ))}
        </div>

        {/* Sample FAQ Card */}
        <SectionLabel>🃏 {t("SAMPLE FAQ CARD", "FAQ 카드 샘플")}</SectionLabel>
        <div className="bg-card border border-success/30 rounded-[10px] p-5 relative">
          <button
            onClick={() => handleCopy("sample-faq", `Q: ${SAMPLE_FAQ.question}\nA: ${SAMPLE_FAQ.answer}`)}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg border border-border text-[10.5px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {copiedMap["sample-faq"] ? "✅ Copied" : "📋 Copy"}
          </button>

          {/* Meta badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
              {SAMPLE_FAQ.priority}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
              CIS {SAMPLE_FAQ.cis}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              🛡️ {t(SAMPLE_FAQ.category, SAMPLE_FAQ.categoryKo)}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
              ✅ {t("Legal Pass", "법무 통과")}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
              ❌ {t("PDP Missing", "PDP 미반영")}
            </span>
          </div>

          {/* Q&A */}
          <div className="mb-3">
            <p className="text-[11px] font-bold text-primary mb-1">Q.</p>
            <p className="text-[12px] font-semibold text-foreground leading-relaxed">{t(SAMPLE_FAQ.question, SAMPLE_FAQ.questionKo)}</p>
          </div>
          <div className="mb-3">
            <p className="text-[11px] font-bold text-success mb-1">A.</p>
            <p className="text-[11.5px] text-foreground/80 leading-relaxed">{t(SAMPLE_FAQ.answer, SAMPLE_FAQ.answerKo)}</p>
          </div>

          {/* Evidence */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.6px] mb-2">
              📎 {t("EVIDENCE CITATIONS", "증거 인용")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(t(SAMPLE_FAQ.evidence.join("|"), SAMPLE_FAQ.evidenceKo.join("|")) as string).split("|").map((ev, i) => (
                <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-secondary/50 text-foreground/70 border border-border/30">
                  {ev}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
