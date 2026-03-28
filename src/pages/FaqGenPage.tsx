import { useState, useMemo, useCallback } from "react";
import {
  HelpCircle, Sparkles, Search, ChevronRight, Loader2,
  BarChart3, Shield, Package, Copy, CheckCircle2, XCircle, Clock,
  Wrench, Monitor, Wifi, Settings, DollarSign, Tag,
  TrendingUp, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { SearchBar } from "@/components/SearchBar";
import { useSearchProducts, toReviewFormat } from "@/hooks/useProductData";
import { analyzeSentiment } from "@/lib/sentiment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toPRName } from "@/lib/formatMessage";

/* ── Types (same as FaqPanel) ── */
interface Evidence { quotes: string[]; claims: { metric: string; value: number; unit: string }[]; pattern: string; }
interface LegalReview { status: "pass" | "needs_revision" | "fail"; violations: { item_id: string; note: string }[]; }
interface FaqCard {
  faq_id: string; product_family: string; question: string; answer: string;
  category: string; sourceType: string; topics: string[]; evidence: Evidence;
  cis: number; priority: "P0" | "P1" | "P2" | "Backlog"; intent_type: string;
  pdp_presence: { status: string; last_updated_days?: number | null };
  legal_review: LegalReview; publishable: boolean;
  ab_test_suggestion?: { variation: string; expected_lift: { pdp_to_atc_pct: number[] } };
  mentionCount?: number; confidence?: number;
}
interface ActionItem {
  priority: string; product_family: string; faq_id: string;
  what: string; why: string; impact: { expected_lift_cvr_pct: number[] };
  ready_to_use_copy: { pdp_highlight: string; exit_popup: string }; publishable: boolean;
}
interface CsHeatmapItem { issue: string; review_freq: number; cis_avg: number; action_required: boolean; }
interface AiFaqData {
  faq_cards?: FaqCard[]; faqItems?: FaqCard[]; weekly_action_list?: ActionItem[];
  cs_heatmap?: CsHeatmapItem[];
  reviewTopics: { topic: string; category: string; sentiment: string; mentionCount: number; summary: string }[];
  painPoints: { issue: string; severity: string; frequency: number; userWorkaround: string; category: string }[];
  dataSources: { source: string; count: number }[];
  summary?: { total_faq: number; p0: number; p1: number; p2: number; publishable_count: number };
}

/* ── Constants ── */
const STEP_LABELS = [
  { en: "Review Data", ko: "리뷰 데이터" },
  { en: "Evidence & CIS", ko: "에비던스 & CIS" },
  { en: "Category", ko: "카테고리 분류" },
  { en: "FAQ Results", ko: "FAQ 결과" },
];

const CATEGORY_META: Record<string, { label: string; labelKo: string; icon: React.ElementType; color: string }> = {
  performance_quality: { label: "Performance/Quality", labelKo: "성능/품질", icon: Sparkles, color: "text-success" },
  purchase_anxiety: { label: "Purchase Anxiety", labelKo: "구매 전 불안 해소", icon: Shield, color: "text-amber-400" },
  installation_compatibility: { label: "Installation/Compatibility", labelKo: "설치/호환성", icon: Wrench, color: "text-orange-400" },
  delivery_warranty: { label: "Delivery/Warranty", labelKo: "배송/AS", icon: Package, color: "text-blue-400" },
  competitor_comparison: { label: "Competitor Comparison", labelKo: "경쟁사 비교", icon: TrendingUp, color: "text-violet-400" },
  price_value: { label: "Price/Value", labelKo: "가격 가치", icon: DollarSign, color: "text-success" },
  installation: { label: "Installation", labelKo: "설치", icon: Wrench, color: "text-orange-400" },
  initial_setup: { label: "Initial Setup", labelKo: "초기 설정", icon: Settings, color: "text-blue-400" },
  display_sound: { label: "Display & Sound", labelKo: "화면/사운드", icon: Monitor, color: "text-purple-400" },
  connectivity: { label: "Connectivity", labelKo: "연결성", icon: Wifi, color: "text-cyan-400" },
  usability: { label: "Usability", labelKo: "사용성", icon: Package, color: "text-success" },
  compatibility: { label: "Compatibility", labelKo: "호환성", icon: Tag, color: "text-indigo-400" },
  features: { label: "Features", labelKo: "기능", icon: Sparkles, color: "text-amber-400" },
  pricing: { label: "Pricing", labelKo: "가격", icon: DollarSign, color: "text-success" },
  reliability: { label: "Reliability", labelKo: "신뢰성", icon: Shield, color: "text-red-400" },
  other: { label: "Other", labelKo: "기타", icon: HelpCircle, color: "text-muted-foreground" },
};

const PRIORITY_STYLE: Record<string, string> = {
  P0: "bg-red-500/20 text-red-400 border-red-500/40",
  P1: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  P2: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  Backlog: "bg-muted text-muted-foreground border-border",
};

const SOURCE_TYPE_LABEL: Record<string, { en: string; ko: string }> = {
  question: { en: "Direct Question", ko: "직접 질문" },
  issue_resolution: { en: "Issue → Solution", ko: "이슈→해결" },
  pain_point: { en: "Pain Point", ko: "불만 사항" },
  feature_inquiry: { en: "Feature Inquiry", ko: "기능 문의" },
  conversion_barrier: { en: "Conversion Barrier", ko: "전환 장애" },
};

const PDP_STATUS_ICON: Record<string, React.ElementType> = {
  implemented: CheckCircle2, missing: XCircle, outdated: Clock,
};

/* ── Main Page ── */
export default function FaqGenPage() {
  const { t } = useLang();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AiFaqData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: products = [], isLoading: searchLoading } = useSearchProducts(searchQuery);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const reviews = useMemo(
    () => selectedProduct?.reviews.map(toReviewFormat) || [],
    [selectedProduct]
  );

  const sentiment = useMemo(
    () => analyzeSentiment(reviews.map((r) => ({ text: r.text, source: r.source as any }))),
    [reviews]
  );

  const faqCards: FaqCard[] = useMemo(() => {
    if (!aiData) return [];
    return aiData.faq_cards || aiData.faqItems || [];
  }, [aiData]);

  const faqsByCategory = useMemo(() => {
    const map: Record<string, FaqCard[]> = {};
    for (const faq of faqCards) {
      const cat = faq.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(faq);
    }
    return map;
  }, [faqCards]);

  const filteredFaqs = activeCategory ? (faqsByCategory[activeCategory] || []) : faqCards;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedProductId(null);
    setAiData(null);
    setActiveStep(0);
    setActiveCategory(null);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    setAiData(null);
    setActiveStep(0);
    setActiveCategory(null);
  };

  const generateFaq = useCallback(async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-faq", {
        body: {
          productName: toPRName(selectedProduct.display_name || selectedProduct.model_number),
          locale: "en-US",
          reviews: reviews.slice(0, 40).map((r) => ({
            text: r.text, sentiment: r.sentiment, source: r.source || "unknown",
          })),
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setAiData(data);
      setActiveStep(3); // Jump to results
      toast.success(t("AI FAQ generated!", "AI FAQ가 생성되었습니다!"));
    } catch (e: any) {
      console.error("FAQ generation error:", e);
      setError(e.message || "Failed to generate");
      toast.error(t("Failed to generate AI FAQ", "AI FAQ 생성 실패"));
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, reviews, t]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied!", "복사됨!"));
  };

  const canProceedToStep = (step: number) => {
    if (step === 0) return true;
    if (step === 1) return !!selectedProduct && reviews.length >= 3;
    if (step === 2) return !!selectedProduct && reviews.length >= 3;
    if (step === 3) return !!aiData;
    return false;
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={HelpCircle}
        title={t("🤖 AI FAQ Generation", "🤖 AI FAQ 자동 생성")}
        description={t(
          "Search a product → analyze reviews → generate conversion-optimized FAQs in one flow.",
          "제품 검색 → 리뷰 분석 → 전환 최적화 FAQ 생성을 한 번에 수행합니다."
        )}
      />

      {/* ═══════ Quick Guide ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-bold text-foreground">{t("How It Works", "이용 가이드")}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>🔍 {t("Search Product", "제품 검색")}</span>
          <ChevronRight className="h-3 w-3" />
          <span>📊 {t("Review Analysis", "리뷰 분석")}</span>
          <ChevronRight className="h-3 w-3" />
          <span>📈 {t("Evidence & CIS Scoring", "에비던스 & CIS 점수")}</span>
          <ChevronRight className="h-3 w-3" />
          <span>❓ {t("FAQ Cards Output", "FAQ 카드 출력")}</span>
        </div>
      </div>

      {/* ═══════ Product Search ═══════ */}
      <div className="gradient-card rounded-xl border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-foreground">{t("Step 0. Product Search", "Step 0. 제품 검색")}</p>
        </div>
        <SearchBar onSearch={handleSearch} isLoading={searchLoading} />

        {/* Search Results — Product Selection */}
        {searchQuery && products.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[1px]">
              {t(`${products.length} products found — select one`, `${products.length}개 제품 검색됨 — 선택하세요`)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p.id)}
                  className={`text-left p-3 rounded-[10px] border transition-all ${
                    selectedProductId === p.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <p className="text-[11px] font-bold text-foreground truncate">{p.model_number}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.display_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[9px]">{p.category}</Badge>
                    <span className="text-[9px] text-muted-foreground">{p.reviews.length} {t("reviews", "건 리뷰")}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {searchQuery && !searchLoading && products.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">{t("No products found.", "검색 결과가 없습니다.")}</p>
        )}
      </div>

      {/* ═══════ Step Navigation ═══════ */}
      {selectedProduct && (
        <>
          <div className="gradient-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-1">
              {STEP_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i < 3 || canProceedToStep(i)) setActiveStep(i);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
                    activeStep === i
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : canProceedToStep(i)
                        ? "text-foreground hover:bg-secondary/50 cursor-pointer"
                        : "text-muted-foreground/50 cursor-default"
                  }`}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-background/20 text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  {t(label.en, label.ko)}
                </button>
              ))}
            </div>
          </div>

          {/* ═══════ Selected Product Info Bar ═══════ */}
          <div className="bg-primary/5 border border-primary/20 rounded-[10px] p-3 flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-primary">{selectedProduct.model_number}</span>
            <span className="text-[10px] text-muted-foreground">{selectedProduct.display_name}</span>
            <Badge variant="secondary" className="text-[9px]">{selectedProduct.category}</Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">{reviews.length} {t("reviews", "건 리뷰")}</span>
          </div>

          {/* ═══════ STEP 1 — Review Data ═══════ */}
          {activeStep === 0 && (
            <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold">1</span>
                <h2 className="text-base font-bold font-heading text-foreground">{t("Review Data Overview", "리뷰 데이터 개요")}</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-[10px] p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t("Total Reviews", "전체 리뷰")}</p>
                </div>
                <div className="bg-card border border-border rounded-[10px] p-4 text-center">
                  <p className="text-2xl font-bold text-success">{reviews.filter(r => r.sentiment === "positive").length}</p>
                  <p className="text-[10px] text-muted-foreground">{t("Positive", "긍정")}</p>
                </div>
                <div className="bg-card border border-border rounded-[10px] p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{reviews.filter(r => r.sentiment === "negative").length}</p>
                  <p className="text-[10px] text-muted-foreground">{t("Negative", "부정")}</p>
                </div>
                <div className="bg-card border border-border rounded-[10px] p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{(sentiment.averageScore * 100).toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">{t("Sentiment Score", "감성 점수")}</p>
                </div>
              </div>

              {/* Source breakdown */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-2">📊 {t("SOURCE BREAKDOWN", "채널별 분포")}</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(
                    reviews.reduce<Record<string, number>>((acc, r) => {
                      const src = (r.source as string) || "unknown";
                      acc[src] = (acc[src] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([src, count]) => (
                    <Badge key={src} variant="secondary" className="text-[10px]">{src}: {count}</Badge>
                  ))}
                </div>
              </div>

              {reviews.length < 3 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400">
                  ⚠️ {t("Minimum 3 reviews required for FAQ generation.", "FAQ 생성에 최소 3건의 리뷰가 필요합니다.")}
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" onClick={() => setActiveStep(1)} disabled={reviews.length < 3} className="text-[11px] gap-1">
                  {t("Next: Evidence & CIS", "다음: 에비던스 & CIS")} <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 2 — Evidence & CIS Scoring ═══════ */}
          {activeStep === 1 && (
            <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold">2</span>
                <h2 className="text-base font-bold font-heading text-foreground">{t("Evidence Engine & CIS Scoring", "에비던스 엔진 & CIS 점수")}</h2>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-start gap-2">
                <BarChart3 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t(
                    "AI will extract evidence (review quotes, quantitative metrics, statistical patterns) and calculate CIS (Conversion Impact Score) for each FAQ topic.",
                    "AI가 각 FAQ 주제에 대해 증거(리뷰 인용, 정량 데이터, 통계 패턴)를 추출하고 CIS(전환 영향도 점수)를 산출합니다."
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { icon: "💬", en: "Review Quotes", ko: "리뷰 인용", descEn: "Min. 2 citations per FAQ", descKo: "FAQ당 최소 2개 인용" },
                  { icon: "📊", en: "Quantitative Metrics", ko: "정량 데이터", descEn: "Mention frequency, sentiment ratio", descKo: "언급 빈도, 감성 비율" },
                  { icon: "📐", en: "Statistical Patterns", ko: "통계 패턴", descEn: "Recurring themes & trends", descKo: "반복 테마 & 트렌드" },
                ].map((item, i) => (
                  <div key={i} className="bg-card border border-border rounded-[10px] p-4 flex gap-3">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-[11px] font-bold text-foreground mb-0.5">{t(item.en, item.ko)}</p>
                      <p className="text-[10px] text-muted-foreground">{t(item.descEn, item.descKo)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px]">🏷️ {t("PRIORITY LEVELS", "우선순위 등급")}</p>
              <div className="space-y-2">
                {[
                  { level: "P0", score: "CIS ≥ 80", desc: t("Critical — PDP immediately", "긴급 — PDP 즉시 반영"), color: "bg-red-500/10 text-red-400 border-red-500/30" },
                  { level: "P1", score: "CIS 60–79", desc: t("Important — within 1 sprint", "중요 — 1 스프린트 내"), color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
                  { level: "P2", score: "CIS 40–59", desc: t("Nice to have", "선택적 반영"), color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
                  { level: "Backlog", score: "CIS < 40", desc: t("Monitor", "모니터링"), color: "bg-muted text-muted-foreground border-border" },
                ].map((p, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-[10px] border text-xs ${p.color}`}>
                    <span className="font-bold w-14">{p.level}</span>
                    <span className="font-mono text-muted-foreground w-20">{p.score}</span>
                    <span className="text-foreground/80">{p.desc}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => setActiveStep(0)} className="text-[11px]">
                  ← {t("Back", "이전")}
                </Button>
                <Button size="sm" onClick={() => setActiveStep(2)} className="text-[11px] gap-1">
                  {t("Next: Category", "다음: 카테고리")} <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 3 — Category & Generate ═══════ */}
          {activeStep === 2 && (
            <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold">3</span>
                <h2 className="text-base font-bold font-heading text-foreground">{t("Category Classification & Generation", "카테고리 분류 & 생성")}</h2>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-start gap-2">
                <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t(
                    "FAQs will be auto-classified into 6 categories. Click 'Generate' to start AI analysis.",
                    "FAQ는 6개 카테고리로 자동 분류됩니다. '생성' 버튼을 클릭하면 AI 분석이 시작됩니다."
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {[
                  { icon: "🔧", en: "Installation & Setup", ko: "설치 · 초기 설정", color: "border-orange-500/30 bg-orange-500/5" },
                  { icon: "🖥️", en: "Display & Sound", ko: "화면 · 사운드", color: "border-purple-500/30 bg-purple-500/5" },
                  { icon: "📡", en: "Connectivity & Smart", ko: "연결성 · 스마트", color: "border-cyan-500/30 bg-cyan-500/5" },
                  { icon: "🛡️", en: "Purchase Anxiety", ko: "구매 불안 · 보증", color: "border-amber-500/30 bg-amber-500/5" },
                  { icon: "💰", en: "Price & Value", ko: "가격 · 가치", color: "border-success/30 bg-success/5" },
                  { icon: "⚔️", en: "Competitor Comparison", ko: "경쟁사 비교", color: "border-violet-500/30 bg-violet-500/5" },
                ].map((cat, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border ${cat.color}`}>
                    <span className="text-lg">{cat.icon}</span>
                    <p className="text-[11px] font-bold text-foreground">{t(cat.en, cat.ko)}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20">{error}</div>
              )}

              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => setActiveStep(1)} className="text-[11px]">
                  ← {t("Back", "이전")}
                </Button>
                <Button size="sm" onClick={generateFaq} disabled={loading} className="text-[11px] gap-1.5 glow-primary px-6">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {loading ? t("Generating FAQ...", "FAQ 생성 중...") : t("🚀 Generate AI FAQ", "🚀 AI FAQ 생성")}
                </Button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 4 — FAQ Results ═══════ */}
          {activeStep === 3 && (
            <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold">4</span>
                <h2 className="text-base font-bold font-heading text-foreground">{t("FAQ Results", "FAQ 결과")}</h2>
                <div className="ml-auto flex gap-2">
                  {faqCards.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => copyText(filteredFaqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"))} className="h-7 text-[10px] gap-1 text-muted-foreground">
                      <Copy className="h-3 w-3" /> {t("Copy All", "전체 복사")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={generateFaq} disabled={loading} className="h-7 text-[10px] gap-1">
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {t("Regenerate", "재생성")}
                  </Button>
                </div>
              </div>

              {/* Summary */}
              {aiData?.summary && (
                <div className="flex gap-3 flex-wrap text-[11px]">
                  <div className="bg-muted/30 rounded-lg px-3 py-2 border border-border/50 flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-muted-foreground">{t("Total", "총")}: <strong className="text-foreground">{aiData.summary.total_faq}</strong></span>
                  </div>
                  <Badge className={`${PRIORITY_STYLE.P0} border text-[10px]`}>P0: {aiData.summary.p0}</Badge>
                  <Badge className={`${PRIORITY_STYLE.P1} border text-[10px]`}>P1: {aiData.summary.p1}</Badge>
                  <Badge className={`${PRIORITY_STYLE.P2} border text-[10px]`}>P2: {aiData.summary.p2}</Badge>
                  <div className="flex items-center gap-1 text-success text-[11px]">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{t("Publishable", "발행 가능")}: {aiData.summary.publishable_count}</span>
                  </div>
                </div>
              )}

              {/* Weekly Action List */}
              {aiData?.weekly_action_list && aiData.weekly_action_list.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-2">
                    ⚡ {t("WEEKLY ACTION LIST", "주간 액션리스트")}
                  </p>
                  <div className="space-y-2">
                    {aiData.weekly_action_list.map((action, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${PRIORITY_STYLE[action.priority] || PRIORITY_STYLE.P2} border text-[9px]`}>{action.priority}</Badge>
                          <span className="text-[11px] font-medium">{action.what}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{action.why}</p>
                        <div className="bg-primary/5 rounded p-2 border border-primary/10">
                          <p className="text-[10px] font-semibold text-primary mb-1">{t("Ready-to-use Copy", "바로 쓰는 문구")}</p>
                          <p className="text-[10px] text-foreground/80">📌 {action.ready_to_use_copy.pdp_highlight}</p>
                          <p className="text-[10px] text-foreground/80">🚪 {action.ready_to_use_copy.exit_popup}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              {faqCards.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-2">
                    🏷️ {t("FAQ CARDS", "FAQ 카드")}
                  </p>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    <Button variant={activeCategory === null ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setActiveCategory(null)}>
                      {t("All", "전체")} ({faqCards.length})
                    </Button>
                    {Object.keys(faqsByCategory).map((cat) => {
                      const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                      const Icon = meta.icon;
                      return (
                        <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => setActiveCategory(cat)}>
                          <Icon className="h-3 w-3" />
                          {t(meta.label, meta.labelKo)} ({faqsByCategory[cat].length})
                        </Button>
                      );
                    })}
                  </div>

                  {/* FAQ Cards */}
                  <div className="grid gap-2.5">
                    {filteredFaqs.map((faq, i) => {
                      const catMeta = CATEGORY_META[faq.category] || CATEGORY_META.other;
                      const CatIcon = catMeta.icon;
                      const stLabel = SOURCE_TYPE_LABEL[faq.sourceType] || SOURCE_TYPE_LABEL.question;
                      return (
                        <div key={faq.faq_id || i} className={`bg-muted/30 rounded-lg p-4 border group relative ${faq.publishable ? "border-success/30" : "border-border/50"}`}>
                          <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0" onClick={() => copyText(`Q: ${faq.question}\nA: ${faq.answer}`)}>
                            <Copy className="h-3 w-3" />
                          </Button>

                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {faq.priority && <Badge className={`${PRIORITY_STYLE[faq.priority] || PRIORITY_STYLE.Backlog} border text-[9px]`}>{faq.priority}</Badge>}
                            {typeof faq.cis === "number" && <Badge variant="outline" className="text-[9px] font-mono">CIS {faq.cis.toFixed(0)}</Badge>}
                            {faq.publishable === true && (
                              <Badge className="bg-success/10 text-success border-success/30 border text-[9px] gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" /> {t("Publishable", "발행가능")}
                              </Badge>
                            )}
                            {faq.publishable === false && (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/30 border text-[9px] gap-0.5">
                                <XCircle className="h-2.5 w-2.5" /> {t("Draft", "초안")}
                              </Badge>
                            )}
                            {faq.legal_review && (
                              <Badge variant="secondary" className={`text-[9px] gap-0.5 ${faq.legal_review.status === "pass" ? "text-success" : faq.legal_review.status === "needs_revision" ? "text-amber-400" : "text-red-400"}`}>
                                <Shield className="h-2.5 w-2.5" /> {t("Legal", "법무")}: {faq.legal_review.status}
                              </Badge>
                            )}
                            {faq.faq_id && <span className="text-[9px] font-mono text-muted-foreground ml-auto">{faq.faq_id}</span>}
                          </div>

                          <div className="flex items-center gap-2 mb-1.5">
                            <CatIcon className={`h-3.5 w-3.5 ${catMeta.color}`} />
                            <p className="text-sm font-semibold text-foreground/90">Q: {faq.question}</p>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pl-5 mb-2">{faq.answer}</p>

                          {faq.evidence && (
                            <div className="pl-5 mb-2 space-y-1">
                              {faq.evidence.quotes?.length > 0 && faq.evidence.quotes.map((q, qi) => (
                                <p key={qi} className="text-[10px] text-muted-foreground italic border-l-2 border-primary/30 pl-2 py-0.5">"{q}"</p>
                              ))}
                              {faq.evidence.claims?.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {faq.evidence.claims.map((c, ci) => (
                                    <Badge key={ci} variant="outline" className="text-[9px] font-mono">{c.metric}: {c.value}{c.unit}</Badge>
                                  ))}
                                </div>
                              )}
                              {faq.evidence.pattern && <p className="text-[10px] text-muted-foreground/70">📊 {faq.evidence.pattern}</p>}
                            </div>
                          )}

                          <div className="flex gap-1.5 pl-5 flex-wrap">
                            <Badge variant="outline" className="text-[9px]">{t(catMeta.label, catMeta.labelKo)}</Badge>
                            <Badge variant="secondary" className="text-[9px]">{t(stLabel.en, stLabel.ko)}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CS Heatmap */}
              {aiData?.cs_heatmap && aiData.cs_heatmap.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-2">
                    🔥 {t("CS ISSUE HEATMAP", "CS 이슈 히트맵")}
                  </p>
                  <div className="grid gap-1.5">
                    {aiData.cs_heatmap.map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 text-xs rounded-lg px-3 py-2 border ${item.action_required ? "bg-red-500/5 border-red-500/20" : "bg-muted/20 border-border/40"}`}>
                        {item.action_required && <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                        <span className="font-medium flex-1">{item.issue}</span>
                        <Badge variant="outline" className="text-[9px] font-mono">CIS {item.cis_avg.toFixed(0)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!aiData && !loading && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">{t("Go to Step 3 and click 'Generate' to create FAQs.", "Step 3으로 이동하여 '생성' 버튼을 클릭하세요.")}</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveStep(2)} className="text-[11px]">
                    ← {t("Back to Step 3", "Step 3으로 돌아가기")}
                  </Button>
                </div>
              )}

              <div className="flex justify-start">
                <Button variant="outline" size="sm" onClick={() => setActiveStep(2)} className="text-[11px]">
                  ← {t("Back", "이전")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
