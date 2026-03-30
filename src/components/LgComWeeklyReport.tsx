import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Loader2, Sparkles, ChevronDown, ChevronUp, Copy, Check,
  Tv, Refrigerator, WashingMachine, FileText, ThumbsUp, ThumbsDown,
  AlertTriangle, Zap, Users, Megaphone, Wrench, Headphones, TrendingUp,
  Eye, Cpu, MessageSquare, Star, Target, Lightbulb, Shield
} from "lucide-react";
import { toast } from "sonner";

/* ── types ── */
interface ReportData {
  executive_summary?: {
    period?: string;
    total_reviews?: number;
    channel_reviews?: number;
    avg_rating?: string;
    sentiment_ratio?: { positive_pct: number; negative_pct: number; neutral_pct: number };
    top3_insights?: string[];
  };
  top5_themes?: {
    theme: string; mention_pct: string; positive_pct: string; negative_pct: string;
    representative_quote: string; related_products: string[];
  }[];
  negative_priority_top3?: {
    issue: string; mention_pct: string; recurring_pattern: string;
    root_cause: string; related_products: string[];
  }[];
  strengths?: {
    repeated_praise?: string[];
    unconditional_praise?: string[];
    competitive_advantage?: { point: string; vs_competitor: string; evidence: string }[];
  };
  action_items?: {
    product_team?: { item: string; priority: string; detail: string }[];
    cs_team?: { item: string; detail: string }[];
    marketing_team?: { satisfaction_message: string; copy_suggestion: string }[];
  };
  product_insights?: {
    product_name: string; category: string; review_count: number;
    positive_pct: string; negative_pct: string;
    top_praise_keywords: string[]; top_complaint_keywords: string[];
    key_insight: string; action_suggestion: string;
  }[];
  deep_insights?: {
    ux_strategy?: {
      pain_flow: string[];
      stage_issues: { pre_use: string; during_use: string; post_use: string };
      high_impact_improvements: string[];
    };
    product_quality_strategy?: {
      recurring_defects: string[];
      expectation_disappointment: string[];
      trust_impact_expressions: string[];
    };
    marketing_comms_strategy?: {
      organic_praise_sentences: string[];
      copy_candidates: string[];
      avoid_expressions: string[];
    };
  };
}

/* ── small reusable bits ── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

function SectionCard({ icon: Icon, title, children, color = "border-border bg-card" }: {
  icon: any; title: string; children: React.ReactNode; color?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-lg border ${color} p-4`}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function PriorityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    "높음": "bg-destructive/15 text-destructive border-destructive/20",
    "중간": "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
    "낮음": "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[level] || map["중간"]}`}>{level}</Badge>;
}

/* ── main component ── */
export function LgComWeeklyReport() {
  const { t } = useLang();
  const [region, setRegion] = useState("all");
  const [category, setCategory] = useState("all");
  const [report, setReport] = useState<ReportData | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runReport = async (cat?: string) => {
    const target = cat ?? category;
    setIsLoading(true);
    setCategory(target);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lgcom-weekly-report", {
        body: { region, limit: 10, category: target },
      });
      if (error) throw error;
      if (data?.report) {
        setReport(data.report);
        setMeta(data.metadata);
        toast.success(t("Report generated!", "리포트 생성 완료!"));
      } else {
        toast.info(t("No data available", "데이터가 없습니다"));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t("Report generation failed", "리포트 생성 실패"));
    } finally {
      setIsLoading(false);
    }
  };

  const es = report?.executive_summary;

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-heading">
              {t("LG.com Weekly Insight Report", "LG.com 주간 인사이트 리포트")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Region filter */}
            <div className="flex gap-0.5 bg-muted/50 rounded-full p-0.5">
              {[
                { value: "all", label: t("All", "전체") },
                { value: "US", label: "🇺🇸 US" },
                { value: "UK", label: "🇬🇧 UK" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRegion(r.value)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    region === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {/* Generate */}
            <button
              onClick={() => runReport()}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("Generating...", "생성 중...")}</>
                : <><Sparkles className="h-3.5 w-3.5" />{t("Generate Report", "리포트 생성")}</>
              }
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "AI-powered 6-section weekly insight report with country & product filters",
            "AI 기반 6대 섹션 주간 인사이트 리포트 · 국가별/제품별 필터 지원"
          )}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Category buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { cat: "all", icon: Sparkles, label: t("All Products", "전체 제품"), color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" },
            { cat: "TV", icon: Tv, label: "TV / OLED", color: "bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20" },
            { cat: "Refrigerator", icon: Refrigerator, label: t("Refrigerator", "냉장고"), color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 hover:bg-cyan-500/20" },
            { cat: "Washer", icon: WashingMachine, label: t("Washer/Dryer", "세탁기/건조기"), color: "bg-violet-500/10 text-violet-700 border-violet-500/20 hover:bg-violet-500/20" },
          ].map((item) => (
            <button
              key={item.cat}
              onClick={() => runReport(item.cat)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 ${
                category === item.cat && report ? item.color + " ring-1 ring-primary/30" : item.color
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              {isLoading && category === item.cat && <Loader2 className="h-3 w-3 animate-spin ml-0.5" />}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {!report && !isLoading && (
          <div className="text-center py-10 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("Select a category to generate the weekly report", "카테고리를 선택하여 주간 리포트를 생성하세요")}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{t("Generating weekly report with AI...", "AI로 주간 리포트 생성 중...")}</p>
            <p className="text-xs">{t("This may take 30-60 seconds", "30~60초 소요될 수 있습니다")}</p>
          </div>
        )}

        {/* Report content */}
        {report && !isLoading && (
          <div className="space-y-4">
            {/* Analyzed products bar */}
            {meta?.analyzed_products && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
                <span className="text-[10px] text-muted-foreground mr-1">{t("Analyzed:", "분석 대상:")}</span>
                {meta.analyzed_products.map((p: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] gap-1">
                    {p.display_name || p.model_number}
                    <span className="text-muted-foreground">({p.positive_count + p.negative_count + (p.neutral_count || 0)}{t(" reviews", "건")})</span>
                  </Badge>
                ))}
              </div>
            )}

            {/* ── Executive Summary: always visible ── */}
            {es && (
              <div className="space-y-3">
                {/* Metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: t("Total Reviews", "전체 리뷰"), value: es.total_reviews?.toLocaleString() || "–", icon: FileText },
                    { label: t("Avg Rating", "평균 평점"), value: es.avg_rating || "–", icon: Star },
                    { label: t("Positive", "긍정"), value: `${es.sentiment_ratio?.positive_pct || 0}%`, icon: ThumbsUp },
                    { label: t("Negative", "부정"), value: `${es.sentiment_ratio?.negative_pct || 0}%`, icon: ThumbsDown },
                  ].map((m, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                      <m.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-lg font-bold text-foreground">{m.value}</div>
                      <div className="text-[10px] text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Sentiment bar */}
                {es.sentiment_ratio && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs font-semibold mb-2">{t("Sentiment Distribution", "감성 비율")}</div>
                    <div className="flex h-4 rounded-full overflow-hidden">
                      <div className="bg-success/70 transition-all" style={{ width: `${es.sentiment_ratio.positive_pct}%` }} />
                      <div className="bg-muted transition-all" style={{ width: `${es.sentiment_ratio.neutral_pct}%` }} />
                      <div className="bg-destructive/70 transition-all" style={{ width: `${es.sentiment_ratio.negative_pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                      <span>✅ {t("Positive", "긍정")} {es.sentiment_ratio.positive_pct}%</span>
                      <span>⚪ {t("Neutral", "중립")} {es.sentiment_ratio.neutral_pct}%</span>
                      <span>🔴 {t("Negative", "부정")} {es.sentiment_ratio.negative_pct}%</span>
                    </div>
                  </div>
                )}

                {/* Top 3 insights */}
                {es.top3_insights && es.top3_insights.length > 0 && (
                  <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{t("Top 3 Insights", "핵심 인사이트 3줄 요약")}</span>
                    </div>
                    {es.top3_insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs font-bold text-primary mt-0.5">{i + 1}.</span>
                        <p className="text-xs text-foreground leading-relaxed flex-1">{ins}</p>
                        <CopyBtn text={ins} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Detail tabs (no Summary tab - already shown above) ── */}
            <Tabs defaultValue="themes" className="w-full">
              <TabsList className="w-full grid grid-cols-5 h-9">
                <TabsTrigger value="themes" className="text-[10px] gap-1 px-1">
                  <TrendingUp className="h-3 w-3" />
                  {t("Themes", "주제 TOP5")}
                </TabsTrigger>
                <TabsTrigger value="strengths" className="text-[10px] gap-1 px-1">
                  <ThumbsUp className="h-3 w-3" />
                  {t("Strengths", "강점")}
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-[10px] gap-1 px-1">
                  <Zap className="h-3 w-3" />
                  {t("Actions", "액션")}
                </TabsTrigger>
                <TabsTrigger value="products" className="text-[10px] gap-1 px-1">
                  <Target className="h-3 w-3" />
                  {t("Products", "제품별")}
                </TabsTrigger>
                <TabsTrigger value="deep" className="text-[10px] gap-1 px-1">
                  <Lightbulb className="h-3 w-3" />
                  {t("Deep", "딥인사이트")}
                </TabsTrigger>
              </TabsList>

              {/* ─── 2. Top 5 Themes + Negative Priority ─── */}
              <TabsContent value="themes" className="space-y-3 mt-3">
                <SectionCard icon={TrendingUp} title={t("Top 5 Customer Themes", "고객이 가장 많이 말하는 5가지 주제")} color="border-blue-500/20 bg-blue-500/5">
                  {(report.top5_themes || []).map((th, i) => (
                    <div key={i} className="bg-background/60 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] font-bold">{i + 1}. {th.theme}</Badge>
                        <span className="text-[10px] text-muted-foreground">{t("Mentions", "언급")} {th.mention_pct}</span>
                        <span className="text-[10px] text-success">👍 {th.positive_pct}</span>
                        <span className="text-[10px] text-destructive">👎 {th.negative_pct}</span>
                        <div className="ml-auto"><CopyBtn text={`${th.theme}: ${th.representative_quote}`} /></div>
                      </div>
                      <p className="text-xs text-foreground italic">"{th.representative_quote}"</p>
                      <div className="flex flex-wrap gap-1">
                        {(th.related_products || []).map((p, pi) => (
                          <Badge key={pi} variant="outline" className="text-[9px] px-1.5 py-0">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </SectionCard>

                <SectionCard icon={AlertTriangle} title={t("Negative Priority TOP 3", "개선 시급 이슈 TOP 3")} color="border-destructive/20 bg-destructive/5">
                  {(report.negative_priority_top3 || []).map((neg, i) => (
                    <div key={i} className="bg-background/60 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px]">{i + 1}</Badge>
                        <span className="font-semibold text-xs text-foreground">{neg.issue}</span>
                        <span className="text-[10px] text-destructive ml-auto">{neg.mention_pct}</span>
                      </div>
                      <p className="text-xs text-muted-foreground"><strong>{t("Pattern:", "패턴:")}</strong> {neg.recurring_pattern}</p>
                      <p className="text-xs text-foreground"><strong>{t("Root Cause:", "원인:")}</strong> {neg.root_cause}</p>
                      <div className="flex flex-wrap gap-1">
                        {(neg.related_products || []).map((p, pi) => (
                          <Badge key={pi} variant="outline" className="text-[9px] px-1.5 py-0">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </SectionCard>
              </TabsContent>

              {/* ─── 3. Strengths ─── */}
              <TabsContent value="strengths" className="space-y-3 mt-3">
                {report.strengths && (
                  <>
                    <SectionCard icon={ThumbsUp} title={t("Repeated Praise", "반복 칭찬 포인트")} color="border-success/20 bg-success/5">
                      <div className="space-y-1">
                        {(report.strengths.repeated_praise || []).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-background/60 rounded p-2">
                            <span className="text-xs text-foreground flex-1">✅ {p}</span>
                            <CopyBtn text={p} />
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard icon={Star} title={t("Unconditional Praise", '"비교 없이" 칭찬하는 포인트')} color="border-amber-500/20 bg-amber-500/5">
                      <div className="space-y-1">
                        {(report.strengths.unconditional_praise || []).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-background/60 rounded p-2">
                            <span className="text-xs text-foreground flex-1">⭐ {p}</span>
                            <CopyBtn text={p} />
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard icon={Shield} title={t("Competitive Advantage", "경쟁사 대비 우위")} color="border-primary/20 bg-primary/5">
                      {(report.strengths.competitive_advantage || []).map((ca, i) => (
                        <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">vs {ca.vs_competitor}</Badge>
                            <div className="ml-auto"><CopyBtn text={`${ca.point} (vs ${ca.vs_competitor}): ${ca.evidence}`} /></div>
                          </div>
                          <p className="text-xs font-medium text-foreground">{ca.point}</p>
                          <p className="text-[11px] text-muted-foreground">{ca.evidence}</p>
                        </div>
                      ))}
                    </SectionCard>
                  </>
                )}
              </TabsContent>

              {/* ─── 4. Action Items ─── */}
              <TabsContent value="actions" className="space-y-3 mt-3">
                {report.action_items && (
                  <>
                    <SectionCard icon={Wrench} title={t("Product Team", "제품팀 액션")} color="border-blue-500/20 bg-blue-500/5">
                      {(report.action_items.product_team || []).map((a, i) => (
                        <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground flex-1">{a.item}</span>
                            <PriorityBadge level={a.priority} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">{a.detail}</p>
                        </div>
                      ))}
                    </SectionCard>

                    <SectionCard icon={Headphones} title={t("CS Team", "CS팀 액션")} color="border-orange-500/20 bg-orange-500/5">
                      {(report.action_items.cs_team || []).map((a, i) => (
                        <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                          <span className="font-semibold text-xs text-foreground">{a.item}</span>
                          <p className="text-[11px] text-muted-foreground">{a.detail}</p>
                        </div>
                      ))}
                    </SectionCard>

                    <SectionCard icon={Megaphone} title={t("Marketing Team", "마케팅팀 액션")} color="border-violet-500/20 bg-violet-500/5">
                      {(report.action_items.marketing_team || []).map((a, i) => (
                        <div key={i} className="bg-background/60 rounded p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-foreground">{a.satisfaction_message}</span>
                            <CopyBtn text={a.copy_suggestion} />
                          </div>
                          <p className="text-[11px] text-primary/80 italic">💬 "{a.copy_suggestion}"</p>
                        </div>
                      ))}
                    </SectionCard>
                  </>
                )}
              </TabsContent>

              {/* ─── 5. Per-Product Insights ─── */}
              <TabsContent value="products" className="space-y-3 mt-3">
                {(report.product_insights || []).map((pi, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{pi.product_name}</span>
                      <Badge variant="secondary" className="text-[10px]">{pi.category}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{pi.review_count}{t(" reviews", "건")}</span>
                    </div>

                    <div className="flex gap-3 text-[10px]">
                      <span className="text-success">👍 {pi.positive_pct}</span>
                      <span className="text-destructive">👎 {pi.negative_pct}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(pi.top_praise_keywords || []).map((k, ki) => (
                        <Badge key={ki} variant="secondary" className="text-[9px] px-1.5 py-0 bg-success/10 text-success border-success/15">{k}</Badge>
                      ))}
                      {(pi.top_complaint_keywords || []).map((k, ki) => (
                        <Badge key={`n${ki}`} variant="secondary" className="text-[9px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/15">{k}</Badge>
                      ))}
                    </div>

                    <div className="bg-muted/30 rounded p-2 space-y-1">
                      <p className="text-xs text-foreground"><strong>{t("Insight:", "인사이트:")}</strong> {pi.key_insight}</p>
                      <p className="text-[11px] text-primary/80">→ {pi.action_suggestion}</p>
                    </div>
                  </div>
                ))}
                {(!report.product_insights || report.product_insights.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("No product data", "제품별 데이터 없음")}</p>
                )}
              </TabsContent>

              {/* ─── 6. Deep Insights (3 Strategy Frameworks) ─── */}
              <TabsContent value="deep" className="space-y-3 mt-3">
                {report.deep_insights && (
                  <>
                    {/* UX Strategy */}
                    <SectionCard icon={Eye} title={t("① UX Strategy Insights", "① 고객경험(UX) 전략")} color="border-blue-500/20 bg-blue-500/5">
                      {report.deep_insights.ux_strategy && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Pain Flow", "불편 경험 흐름")}</span>
                            {(report.deep_insights.ux_strategy.pain_flow || []).map((p, i) => (
                              <p key={i} className="text-xs text-foreground ml-2">• {p}</p>
                            ))}
                          </div>
                          {report.deep_insights.ux_strategy.stage_issues && (
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(report.deep_insights.ux_strategy.stage_issues).map(([stage, issue]) => (
                                <div key={stage} className="bg-background/60 rounded p-2">
                                  <span className="text-[10px] font-semibold text-muted-foreground">
                                    {stage === "pre_use" ? t("Pre-Use", "사용 전") : stage === "during_use" ? t("During Use", "사용 중") : t("Post-Use", "사용 후")}
                                  </span>
                                  <p className="text-[11px] text-foreground mt-0.5">{issue}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("High-Impact Improvements", "높은 개선 효과")}</span>
                            {(report.deep_insights.ux_strategy.high_impact_improvements || []).map((p, i) => (
                              <p key={i} className="text-xs text-success ml-2">✅ {p}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </SectionCard>

                    {/* Product Quality Strategy */}
                    <SectionCard icon={Cpu} title={t("② Product & Quality Strategy", "② 제품·품질 전략")} color="border-orange-500/20 bg-orange-500/5">
                      {report.deep_insights.product_quality_strategy && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Recurring Defects", "반복 결함")}</span>
                            {(report.deep_insights.product_quality_strategy.recurring_defects || []).map((d, i) => (
                              <p key={i} className="text-xs text-destructive ml-2">⚠️ {d}</p>
                            ))}
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Expectation vs Reality", "기대 대비 실망")}</span>
                            {(report.deep_insights.product_quality_strategy.expectation_disappointment || []).map((d, i) => (
                              <p key={i} className="text-xs text-foreground ml-2">• {d}</p>
                            ))}
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Trust Impact", "신뢰도 영향 표현")}</span>
                            {(report.deep_insights.product_quality_strategy.trust_impact_expressions || []).map((d, i) => (
                              <p key={i} className="text-xs text-foreground ml-2 italic">"{d}"</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </SectionCard>

                    {/* Marketing Comms Strategy */}
                    <SectionCard icon={MessageSquare} title={t("③ Marketing & Communication Strategy", "③ 마케팅·커뮤니케이션 전략")} color="border-violet-500/20 bg-violet-500/5">
                      {report.deep_insights.marketing_comms_strategy && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Organic Praise", "자발적 칭찬 문장")}</span>
                            {(report.deep_insights.marketing_comms_strategy.organic_praise_sentences || []).map((s, i) => (
                              <div key={i} className="flex items-center gap-2 ml-2">
                                <p className="text-xs text-foreground flex-1">💬 "{s}"</p>
                                <CopyBtn text={s} />
                              </div>
                            ))}
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Ad Copy Candidates", "광고 카피 후보")}</span>
                            {(report.deep_insights.marketing_comms_strategy.copy_candidates || []).map((c, i) => (
                              <div key={i} className="flex items-center gap-2 ml-2">
                                <p className="text-xs text-primary/80 flex-1">→ {c}</p>
                                <CopyBtn text={c} />
                              </div>
                            ))}
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Avoid Expressions", "피해야 할 표현")}</span>
                            {(report.deep_insights.marketing_comms_strategy.avoid_expressions || []).map((a, i) => (
                              <p key={i} className="text-xs text-destructive ml-2">❌ {a}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </SectionCard>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Timestamp */}
            {meta?.generated_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                {t("Generated:", "생성:")} {new Date(meta.generated_at).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
