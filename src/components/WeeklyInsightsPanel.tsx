import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Briefcase, AlertTriangle, Loader2, Brain, Lightbulb,
  Target, ShieldAlert, Heart, ArrowRightLeft, TrendingUp, Sparkles,
  ChevronDown, ChevronUp, Copy, Check, Tv, Refrigerator, WashingMachine
} from "lucide-react";
import { toast } from "sonner";

interface InsightData {
  persona_insights?: {
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

export function WeeklyInsightsPanel() {
  const { t } = useLang();
  const [region, setRegion] = useState("all");
  const [category, setCategory] = useState("all");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async (cat?: string) => {
    const targetCategory = cat ?? category;
    setIsLoading(true);
    setCategory(targetCategory);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-weekly-insights", {
        body: { region, limit: 5, category: targetCategory },
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

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-heading">
              {t("Strategic Deep-Dive: Persona · JTBD · CRM", "전략 심층분석: 페르소나 · JTBD · CRM")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-muted/50 rounded-full p-0.5 flex-wrap">
              {[
                { value: "all", label: t("All", "전체") },
                { value: "US", label: "US" },
                { value: "UK", label: "UK" },
                { value: "DE", label: "DE" },
                { value: "FR", label: "FR" },
                { value: "AU", label: "AU" },
                { value: "CA", label: "CA" },
                { value: "JP", label: "JP" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRegion(r.value)}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    region === r.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
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
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "AI-powered deep analysis of top 5 weekly products across 3 strategic frameworks",
            "주간 리뷰 상위 5개 제품에 대한 AI 기반 3대 전략 프레임워크 분석"
          )}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Category quick-analysis buttons */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[
            { cat: "all", icon: Sparkles, label: t("All", "전체"), color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" },
            { cat: "TV_OLED", icon: Tv, label: "OLED TV", color: "bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20" },
            { cat: "TV_Large", icon: Tv, label: t("Ultra Large TV", "극초대형 TV"), color: "bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20" },
            { cat: "TV_Lifestyle", icon: Tv, label: t("Lifestyle TV", "라이프스타일 TV"), color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 hover:bg-indigo-500/20" },
            { cat: "Refrigerator", icon: Refrigerator, label: t("Refrigerator", "냉장고"), color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 hover:bg-cyan-500/20" },
            { cat: "Washer", icon: WashingMachine, label: t("Washer", "세탁기"), color: "bg-violet-500/10 text-violet-700 border-violet-500/20 hover:bg-violet-500/20" },
            { cat: "Dryer", icon: WashingMachine, label: t("Dryer", "건조기"), color: "bg-violet-500/10 text-violet-700 border-violet-500/20 hover:bg-violet-500/20" },
            { cat: "Dishwasher", icon: Refrigerator, label: t("Dishwasher", "식기세척기"), color: "bg-teal-500/10 text-teal-700 border-teal-500/20 hover:bg-teal-500/20" },
            { cat: "Audio", icon: Tv, label: t("Audio", "사운드바·오디오"), color: "bg-orange-500/10 text-orange-700 border-orange-500/20 hover:bg-orange-500/20" },
            { cat: "Monitor", icon: Tv, label: t("Monitor", "모니터"), color: "bg-slate-500/10 text-slate-700 border-slate-500/20 hover:bg-slate-500/20" },
            { cat: "AC", icon: Tv, label: t("AC", "에어컨"), color: "bg-sky-500/10 text-sky-700 border-sky-500/20 hover:bg-sky-500/20" },
          ].map((item) => (
            <button
              key={item.cat}
              onClick={() => runAnalysis(item.cat)}
              disabled={isLoading}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all disabled:opacity-50 ${
                category === item.cat && result
                  ? item.color + " ring-1 ring-primary/30"
                  : item.color
              }`}
            >
              <item.icon className="h-3 w-3" />
              {item.label}
              {isLoading && category === item.cat && <Loader2 className="h-3 w-3 animate-spin ml-0.5" />}
            </button>
          ))}
        </div>

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
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
                <span className="text-[10px] text-muted-foreground mr-1">{t("Analyzed:", "분석 대상:")}</span>
                {result.metadata.analyzed_products.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] gap-1">
                    {p.display_name || p.model_number}
                    <span className="text-muted-foreground">({p.positive_count + p.negative_count}건)</span>
                  </Badge>
                ))}
              </div>
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
              <TabsList className="w-full grid grid-cols-3 h-9">
                <TabsTrigger value="persona" className="text-xs gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t("Persona", "페르소나")}
                </TabsTrigger>
                <TabsTrigger value="jtbd" className="text-xs gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  JTBD
                </TabsTrigger>
                <TabsTrigger value="negative" className="text-xs gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("CRM", "CRM")}
                </TabsTrigger>
              </TabsList>

              {/* === Framework 1: Persona === */}
              <TabsContent value="persona" className="space-y-3 mt-3">
                <InsightCard
                  icon={Target}
                  title={t("Edge Cases — Unexpected Usage", "의외의 사용성 (Edge Cases)")}
                  color="border-blue-500/20 bg-blue-500/5"
                >
                  {(ins.persona_insights?.edge_cases || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <ProductTag name={item.product} />
                        <CopyButton text={`${item.insight}\n→ ${item.marketing_angle}`} />
                      </div>
                      <p className="text-xs text-foreground">{item.insight}</p>
                      <p className="text-[11px] text-primary/80">→ {item.marketing_angle}</p>
                    </div>
                  ))}
                  {(!ins.persona_insights?.edge_cases?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>

                <InsightCard
                  icon={Heart}
                  title={t("Persona Killer Points — AHA Moments", "페르소나별 킬러 포인트")}
                  color="border-pink-500/20 bg-pink-500/5"
                >
                  {(ins.persona_insights?.killer_points || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600 border-pink-500/20">{item.persona}</Badge>
                        <ProductTag name={item.product} />
                        <div className="ml-auto"><CopyButton text={`[${item.persona}] ${item.aha_moment}\n메시지: ${item.message}`} /></div>
                      </div>
                      <p className="text-xs text-foreground font-medium">{item.aha_moment}</p>
                      <p className="text-[11px] text-muted-foreground italic">"{item.message}"</p>
                    </div>
                  ))}
                  {(!ins.persona_insights?.killer_points?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>

                <InsightCard
                  icon={TrendingUp}
                  title={t("Target Expansion Proposals", "타겟 확장 제안")}
                  color="border-success/20 bg-success/5"
                >
                  {(ins.persona_insights?.target_expansion || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">{item.new_target}</Badge>
                        <ProductTag name={item.product} />
                        <div className="ml-auto"><CopyButton text={`타겟: ${item.new_target}\n근거: ${item.rationale}\n메시지: ${item.message}`} /></div>
                      </div>
                      <p className="text-xs text-foreground">{item.rationale}</p>
                      <p className="text-[11px] text-primary/80">→ {item.message}</p>
                    </div>
                  ))}
                  {(!ins.persona_insights?.target_expansion?.length) && (
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

              {/* === Framework 3: Negative CRM === */}
              <TabsContent value="negative" className="space-y-3 mt-3">
                <InsightCard
                  icon={AlertTriangle}
                  title={t("Expectation Gap", "기대치와 현실의 괴리")}
                  color="border-red-500/20 bg-red-500/5"
                >
                  {(ins.negative_insights?.expectation_gap || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <ProductTag name={item.product} />
                        <SeverityBadge level={item.severity} />
                        <div className="ml-auto"><CopyButton text={`[${item.product}] Gap: ${item.gap_description} (${item.severity})`} /></div>
                      </div>
                      <p className="text-xs text-foreground">{item.gap_description}</p>
                    </div>
                  ))}
                  {(!ins.negative_insights?.expectation_gap?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>

                <InsightCard
                  icon={Lightbulb}
                  title={t("Paid Service Opportunities", "유료 서비스 기회 포착")}
                  color="border-amber-500/20 bg-amber-500/5"
                >
                  {(ins.negative_insights?.paid_service_opportunities || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <ProductTag name={item.product} />
                        <CopyButton text={`페인포인트: ${item.pain_point}\n서비스 기회: ${item.service_idea}`} />
                      </div>
                      <p className="text-xs text-foreground"><strong>{t("Pain:", "페인포인트:")}</strong> {item.pain_point}</p>
                      <p className="text-[11px] text-primary/80">→ {item.service_idea}</p>
                    </div>
                  ))}
                  {(!ins.negative_insights?.paid_service_opportunities?.length) && (
                    <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>
                  )}
                </InsightCard>

                <InsightCard
                  icon={ShieldAlert}
                  title={t("CRM Response Strategy", "CRM 대응 전략")}
                  color="border-rose-500/20 bg-rose-500/5"
                >
                  {(ins.negative_insights?.crm_strategy || []).map((item, i) => (
                    <div key={i} className="bg-background/60 rounded p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <ProductTag name={item.product} />
                        <CopyButton text={`이슈: ${item.issue}\n대응: ${item.response}\n보상: ${item.compensation}`} />
                      </div>
                      <p className="text-xs text-foreground"><strong>{t("Issue:", "이슈:")}</strong> {item.issue}</p>
                      <p className="text-xs text-foreground"><strong>{t("Response:", "대응:")}</strong> {item.response}</p>
                      <p className="text-[11px] text-success"><strong>{t("Compensation:", "보상:")}</strong> {item.compensation}</p>
                    </div>
                  ))}
                  {(!ins.negative_insights?.crm_strategy?.length) && (
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
