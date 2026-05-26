import { useEffect, useState } from "react";
import { ProductSearchInput } from "@/components/ProductSearchInput";
import { CategoryPillBar } from "@/components/CategoryPillBar";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Briefcase, Loader2, Brain, Lightbulb,
  ShieldAlert, Heart, ArrowRightLeft, TrendingUp, Sparkles, Search,
  ChevronDown, ChevronUp, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

interface InsightData {
  persona_insights?: {
    core_user_groups?: {
      product: string;
      main_purpose: string;
      use_scenes: string[];
      evaluation_criteria: string[];
      lifestyle: string;
      purchase_motivation: string;
      satisfaction_points: string[];
      pain_points: string[];
    }[];
    potential_user_groups?: {
      product: string;
      target_group: string;
      expected_use_scenes: string[];
      interests: string[];
      lifestyle_context: string;
      creative_direction: string;
    }[];
    // legacy fields for backward compat
    edge_cases?: { product: string; insight: string; marketing_angle: string }[];
    killer_points?: { persona: string; product: string; aha_moment: string; message: string }[];
    target_expansion?: { new_target: string; product: string; rationale: string; message: string }[];
  };
  jtbd_insights?: {
    anxiety?: { product: string; concern: string; frequency: string }[];
    delight?: { product: string; resolution: string; recommend_words: string[] }[];
    switching_points?: { product: string; from_competitor: string; decisive_reason: string }[];
  };
  negative_insights?: {
    expectation_gap?: { product: string; gap_description: string; severity: string }[];
    paid_service_opportunities?: { product: string; pain_point: string; service_idea: string }[];
    crm_strategy?: { product: string; issue: string; response: string; compensation: string }[];
  };
  summary?: string;
}

interface AnalysisResult {
  insights: InsightData;
  metadata: {
    analyzed_products: {
      model_number: string;
      display_name: string;
      category: string;
      positive_count: number;
      negative_count: number;
    }[];
    region: string;
    generated_at: string;
  };
}

function SeverityBadge({ level }: { level: string }) {
  const color = level === "높음"
    ? "bg-destructive/15 text-destructive border-destructive/20"
    : level === "중간"
      ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/20"
      : "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={`text-[10px] ${color}`}>{level}</Badge>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-muted/50 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

function InsightCard({ icon: Icon, title, children, color }: {
  icon: any; title: string; children: React.ReactNode; color: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-lg border ${color} p-3`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function ProductTag({ name }: { name: string }) {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/15">
      {name}
    </Badge>
  );
}

export function WeeklyInsightsPanel({ country = "all", period = "weekly", month }: { country?: string; period?: "weekly" | "cumulative" | "monthly"; month?: string }) {
  const { t } = useLang();
  const region = country === "all" ? "all" : country;
  const [category, setCategory] = useState("all");

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<"category" | "product">("category");

  // Reset result when region or period changes so stale analysis isn't shown
  useEffect(() => {
    setResult(null);
    setCategory("all");
  }, [region, period, month]);

  const runAnalysis = async (cat?: string, productId?: string) => {
    const targetCategory = cat ?? category;
    setIsLoading(true);
    if (!productId) setCategory(targetCategory);
    try {
      const invokeBody: any = { region, limit: 5, category: targetCategory, period };
      if (period === "monthly" && month) invokeBody.month = month;
      if (productId) invokeBody.product_id = productId;
      const { data, error } = await supabase.functions.invoke("analyze-weekly-insights", {
        body: invokeBody,
      });
      if (error) throw error;
      if (data?.insights) {
        setResult(data);
        toast.success(t("Analysis complete!", "분석 완료!"));
      } else {
        toast.info(t("No review data available for this category", "해당 카테고리의 리뷰 데이터가 없습니다"));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t("Analysis failed", "분석 실패") + ": " + (err.message || "Unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const ins = result?.insights;

  const regionLabel = region === "all" ? t("All", "전체") : `${
    { US: "🇺🇸", UK: "🇬🇧", DE: "🇩🇪", AU: "🇦🇺", IN: "🇮🇳", TW: "🇹🇼", JP: "🇯🇵", TH: "🇹🇭" }[region] || ""
  } ${region}`;

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-heading">
              {t("Strategic Deep-Dive: Main User · JTBD", "전략 심층분석: Main User · JTBD")}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-medium">{regionLabel}</Badge>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium ${
                period === "cumulative"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : period === "monthly"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-success/10 text-success border-success/30"
              }`}
            >
              {period === "cumulative"
                ? t("Cumulative · All-time", "전체 누적")
                : period === "monthly"
                ? `${t("Monthly", "월간")} · ${month || ""}`
                : t("Weekly · 7d", "주간 · 7일")}
            </Badge>
          </div>
          <button
            onClick={() => runAnalysis()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("Analyzing...", "분석 중...")}</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" />{t("Run Analysis", "인사이트 분석")}</>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "AI-powered deep analysis — uses country & period filter above",
            "AI 전략 프레임워크 분석 · 상단 국가/기간 필터와 연동"
          )}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setSearchMode("category")}
              className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${
                searchMode === "category" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {t("Category", "카테고리")}
            </button>
            <button
              onClick={() => setSearchMode("product")}
              className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${
                searchMode === "product" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3 w-3" />
              {t("Product Search", "제품 검색")}
            </button>
          </div>
        </div>

        {searchMode === "product" ? (
          <div className="mb-4">
            <ProductSearchInput
              onSelect={(product) => runAnalysis(undefined, product.id)}
              placeholder={t("Search product to analyze...", "분석할 제품을 검색하세요...")}
              className="max-w-md"
            />
          </div>
        ) : (
          <CategoryPillBar
            selected={category}
            onSelect={(cat) => runAnalysis(cat)}
            isLoading={isLoading}
            hasResult={!!result}
            country={region}
            weekly={period === "weekly"}
          />
        )}

        {!ins && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("Select a category above to analyze", "위 카테고리를 선택하여 분석을 시작하세요")}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{t("Analyzing reviews with AI...", "AI로 리뷰 분석 중...")}</p>
            <p className="text-xs">{t("This may take 30-60 seconds", "30~60초 소요될 수 있습니다")}</p>
          </div>
        )}

        {ins && !isLoading && (
          <div className="space-y-4">
            {/* Analyzed products summary */}
            {result?.metadata?.analyzed_products && (
              <details className="group border border-border rounded-lg">
                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <span className="font-medium">{t("Analyzed Products", "분석 대상 제품")}</span>
                  {(result.metadata as any).total_reviews_analyzed && (
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      {t("Total", "총")} {(result.metadata as any).total_reviews_analyzed.toLocaleString()}{t(" reviews", "건")}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">{result.metadata.analyzed_products.length}{t(" products", "개")}</Badge>
                  <ChevronDown className="h-3 w-3 ml-auto group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-3 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {result.metadata.analyzed_products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] bg-muted/30 rounded px-2 py-1.5">
                      <span className="text-foreground truncate">{p.display_name || p.model_number}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{((p as any).total_count || p.positive_count + p.negative_count).toLocaleString()}{t(" reviews", "건")}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Summary */}
            {ins.summary && (
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{ins.summary}</p>
                </div>
              </div>
            )}

            <Tabs defaultValue="persona" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="persona" className="text-xs gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Main User
                </TabsTrigger>
                <TabsTrigger value="jtbd" className="text-xs gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  JTBD
                </TabsTrigger>
              </TabsList>

              {/* === Framework 1: 사용자군 정의 === */}
              <TabsContent value="persona" className="space-y-3 mt-3">
                {/* 1-1. 주 사용층 Core User Group */}
                <InsightCard
                  icon={Users}
                  title={t("Core User Group — 주 사용층", "주 사용층 (Core User Group)")}
                  color="border-blue-500/20 bg-blue-500/5"
                >
                  {(ins.persona_insights?.core_user_groups || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <ProductTag name={item.product} />
                        <CopyButton text={`[${item.product}]\n주 사용 목적: ${item.main_purpose}\n사용 장면: ${item.use_scenes?.join(", ")}\n평가 기준: ${item.evaluation_criteria?.join(", ")}\n라이프스타일: ${item.lifestyle}\n구매 동기: ${item.purchase_motivation}\n만족: ${item.satisfaction_points?.join(", ")}\n불만: ${item.pain_points?.join(", ")}`} />
                      </div>
                      <div className="grid gap-1.5 text-xs">
                        <div><span className="text-muted-foreground font-medium">🎯 주 사용 목적:</span> <span className="text-foreground">{item.main_purpose}</span></div>
                        <div><span className="text-muted-foreground font-medium">🏠 사용 장면:</span> <span className="text-foreground">{item.use_scenes?.join(" · ") || "—"}</span></div>
                        <div><span className="text-muted-foreground font-medium">📋 평가 기준:</span> <span className="text-foreground">{item.evaluation_criteria?.join(" · ") || "—"}</span></div>
                        <div><span className="text-muted-foreground font-medium">🧬 라이프스타일:</span> <span className="text-foreground">{item.lifestyle}</span></div>
                        <div><span className="text-muted-foreground font-medium">💡 구매 동기:</span> <span className="text-foreground">{item.purchase_motivation}</span></div>
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <span className="text-muted-foreground font-medium">👍 만족:</span>
                          {(item.satisfaction_points || []).map((p, j) => (
                            <Badge key={j} variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">{p}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <span className="text-muted-foreground font-medium">👎 불만:</span>
                          {(item.pain_points || []).map((p, j) => (
                            <Badge key={j} variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!ins.persona_insights?.core_user_groups?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>

                {/* 1-2. 사용자 확장층 Potential User Group */}
                <InsightCard
                  icon={TrendingUp}
                  title={t("Potential User Group — 사용자 확장층", "사용자 확장층 (Potential User Group)")}
                  color="border-success/20 bg-success/5"
                >
                  {(ins.persona_insights?.potential_user_groups || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ProductTag name={item.product} />
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{item.target_group}</Badge>
                        <div className="ml-auto"><CopyButton text={`[${item.product}] 타깃: ${item.target_group}\n예상 사용씬: ${item.expected_use_scenes?.join(", ")}\n관심사: ${item.interests?.join(", ")}\n라이프스타일: ${item.lifestyle_context}\n크리에이티브 방향: ${item.creative_direction}`} /></div>
                      </div>
                      <div className="grid gap-1.5 text-xs">
                        <div><span className="text-muted-foreground font-medium">🎬 예상 사용씬:</span> <span className="text-foreground">{item.expected_use_scenes?.join(" · ") || "—"}</span></div>
                        <div><span className="text-muted-foreground font-medium">💎 관심사:</span> <span className="text-foreground">{item.interests?.join(" · ") || "—"}</span></div>
                        <div><span className="text-muted-foreground font-medium">🧬 라이프스타일:</span> <span className="text-foreground">{item.lifestyle_context}</span></div>
                        <div className="bg-primary/5 border border-primary/15 rounded p-2 mt-1">
                          <span className="text-muted-foreground font-medium text-[11px]">💬 메시지/크리에이티브 방향:</span>
                          <p className="text-xs text-foreground mt-0.5">{item.creative_direction}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!ins.persona_insights?.potential_user_groups?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>
              </TabsContent>

              {/* === Framework 2: JTBD === */}
              <TabsContent value="jtbd" className="space-y-3 mt-3">
                <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">JTBD (Jobs to be Done)</strong>{" "}
                    {t(
                      "— Focuses on the 'job' customers are trying to accomplish. Instead of asking 'who is the customer?', it asks 'what problem are they hiring this product to solve?'",
                      "— 고객이 제품을 '고용'해서 해결하려는 과제에 집중하는 분석법입니다. '누가 사는가'가 아닌 '왜, 어떤 문제를 해결하려고 사는가'를 파악합니다."
                    )}
                  </p>
                </div>
                <InsightCard
                  icon={ShieldAlert}
                  title={t("Pre-Purchase Anxiety", "구매 전 불안 요소 (Anxiety)")}
                  color="border-orange-500/20 bg-orange-500/5"
                >
                  {(ins.jtbd_insights?.anxiety || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <ProductTag name={item.product} />
                          <SeverityBadge level={item.frequency} />
                        </div>
                        <p className="text-xs text-foreground">{item.concern}</p>
                      </div>
                      <CopyButton text={`[${item.product}] 불안요소: ${item.concern} (${item.frequency})`} />
                    </div>
                  ))}
                  {(!ins.jtbd_insights?.anxiety?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>

                <InsightCard
                  icon={Heart}
                  title={t("Post-Purchase Delight", "사용 후 안도감 (Delight)")}
                  color="border-green-500/20 bg-green-500/5"
                >
                  {(ins.jtbd_insights?.delight || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <ProductTag name={item.product} />
                        <CopyButton text={`[${item.product}] ${item.resolution}\n추천 키워드: ${(item.recommend_words || []).join(", ")}`} />
                      </div>
                      <p className="text-xs text-foreground">{item.resolution}</p>
                      <div className="flex flex-wrap gap-1">
                        {(item.recommend_words || []).map((w, wi) => (
                          <Badge key={wi} variant="secondary" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-700 border-green-500/15">
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!ins.jtbd_insights?.delight?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>

                <InsightCard
                  icon={ArrowRightLeft}
                  title={t("Competitor Switching Points", "경쟁사 이탈 포인트")}
                  color="border-violet-500/20 bg-violet-500/5"
                >
                  {(ins.jtbd_insights?.switching_points || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ProductTag name={item.product} />
                        <Badge variant="outline" className="text-[10px]">
                          {item.from_competitor} → LG
                        </Badge>
                        <div className="ml-auto"><CopyButton text={`${item.from_competitor} → LG ${item.product}: ${item.decisive_reason}`} /></div>
                      </div>
                      <p className="text-xs text-foreground">{item.decisive_reason}</p>
                    </div>
                  ))}
                  {(!ins.jtbd_insights?.switching_points?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>
              </TabsContent>

            </Tabs>

            {/* Timestamp */}
            {result?.metadata?.generated_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                {t("Generated:", "생성:")} {new Date(result.metadata.generated_at).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
