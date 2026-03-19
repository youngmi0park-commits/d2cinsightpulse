import { useState } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Rocket, ChevronDown, ChevronUp, Copy, Loader2,
  Target, Megaphone, Camera, Film, Users, ShieldAlert,
  Building2, Globe, Sparkles, Search, TrendingUp, Zap
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SentimentResult } from "@/lib/sentiment";

interface ActionPlan {
  summary: {
    positiveRatio: number;
    negativeRatio: number;
    neutralRatio: number;
    topPositiveKeywords: string[];
    topNegativeKeywords: string[];
    consumerIntents: string[];
    longTailKeywords: string[];
  };
  channelStrategies: {
    channel: string;
    activity: string;
    detail: string;
    expectedEffect: string;
    priority: "high" | "medium" | "low";
  }[];
  top3Actions: {
    rank: number;
    action: string;
    reason: string;
    kpi: string;
  }[];
  dotcomStrategy: {
    performanceMarketing: string;
    brandMarketing: string;
    landingPageSuggestion: string;
  };
  ugcGuidelines: {
    aestheticElements: string[];
    beforeAfterPoints: string[];
    contentFormats: string[];
  };
}

interface ActionPlanPanelProps {
  productName: string;
  displayName: string;
  category: string;
  sentiment: SentimentResult;
  reviews: { content: string; sentiment?: string }[];
}

const channelIcons: Record<string, typeof Target> = {
  "PMAX": Target,
  "Search": Search,
  "UGC": Camera,
  "Instagram": Sparkles,
  "TikTok": Film,
  "Influencer": Users,
  "ORM": ShieldAlert,
  "B2B": Building2,
  "Dotcom": Globe,
  "Brand": Megaphone,
};

function getChannelIcon(channel: string) {
  for (const [key, Icon] of Object.entries(channelIcons)) {
    if (channel.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return Megaphone;
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function ActionPlanPanel({ productName, displayName, category, sentiment, reviews }: ActionPlanPanelProps) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    if (plan) { setIsOpen(!isOpen); return; }
    
    setIsOpen(true);
    setIsLoading(true);
    setError(null);

    try {
      const sampleReviews = reviews.slice(0, 30).map(r => ({
        content: r.content?.slice(0, 300),
        sentiment: r.sentiment,
      }));

      const { data, error: fnError } = await supabase.functions.invoke("generate-action-plan", {
        body: {
          productName: displayName || productName,
          category,
          sentimentData: {
            positive: sentiment.positive,
            negative: sentiment.negative,
            neutral: sentiment.neutral,
            averageScore: sentiment.averageScore,
            keywords: sentiment.keywords,
            phrases: sentiment.phrases,
            usageScenes: sentiment.usageScenes || [],
            userTips: sentiment.userTips || [],
            durabilityInsights: sentiment.durabilityInsights || [],
          },
          reviewSamples: sampleReviews,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (!data?.actionPlan) throw new Error("No action plan returned");

      setPlan(data.actionPlan);
    } catch (e: any) {
      console.error("Action plan error:", e);
      setError(e.message || "Failed to generate action plan");
    } finally {
      setIsLoading(false);
    }
  };

  const copyAll = () => {
    if (!plan) return;
    const lines: string[] = [
      `=== Digital Marketing Action Plan: ${displayName || productName} ===`,
      "",
      `[Analysis Summary]`,
      `Positive: ${plan.summary.positiveRatio}% | Negative: ${plan.summary.negativeRatio}% | Neutral: ${plan.summary.neutralRatio}%`,
      `Top Positive: ${plan.summary.topPositiveKeywords.join(", ")}`,
      `Top Negative: ${plan.summary.topNegativeKeywords.join(", ")}`,
      `Consumer Intents: ${plan.summary.consumerIntents.join(", ")}`,
      `Long-tail Keywords: ${plan.summary.longTailKeywords.join(", ")}`,
      "",
      `[Top 3 Priority Actions]`,
      ...plan.top3Actions.map(a => `#${a.rank}. ${a.action}\n   Reason: ${a.reason}\n   KPI: ${a.kpi}`),
      "",
      `[Channel Strategies]`,
      ...plan.channelStrategies.map(s => `• [${s.priority.toUpperCase()}] ${s.channel} — ${s.activity}\n  ${s.detail}\n  Expected: ${s.expectedEffect}`),
      "",
      `[Dotcom Strategy]`,
      `Performance: ${plan.dotcomStrategy.performanceMarketing}`,
      `Brand: ${plan.dotcomStrategy.brandMarketing}`,
      `Landing Page: ${plan.dotcomStrategy.landingPageSuggestion}`,
      "",
      `[UGC Guidelines]`,
      `Aesthetic: ${plan.ugcGuidelines.aestheticElements.join(", ")}`,
      `Before/After: ${plan.ugcGuidelines.beforeAfterPoints.join(", ")}`,
      `Formats: ${plan.ugcGuidelines.contentFormats.join(", ")}`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success(t("Copied to clipboard!", "클립보드에 복사되었습니다!"));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={() => generatePlan()}>
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <Rocket className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold font-heading">
                {t("Digital Marketing Action Plan", "디지털 마케팅 액션 플랜")}
              </h3>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                AI-Powered
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {plan && (
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); copyAll(); }} className="text-xs">
                  <Copy className="h-3 w-3 mr-1" />{t("Copy All", "전체 복사")}
                </Button>
              )}
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-5 border-t border-border/50 pt-4">
            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {t("Analyzing reviews and generating action plan...", "리뷰를 분석하고 액션 플랜을 생성 중...")}
                </span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                {error}
              </div>
            )}

            {plan && (
              <>
                {/* Summary */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {t("Analysis Summary", "분석 요약")}
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-500">{plan.summary.positiveRatio}%</p>
                      <p className="text-xs text-muted-foreground">{t("Positive", "긍정")}</p>
                    </div>
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{plan.summary.negativeRatio}%</p>
                      <p className="text-xs text-muted-foreground">{t("Negative", "부정")}</p>
                    </div>
                    <div className="rounded-lg bg-muted border border-border p-3 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{plan.summary.neutralRatio}%</p>
                      <p className="text-xs text-muted-foreground">{t("Neutral", "중립")}</p>
                    </div>
                  </div>

                  {/* Consumer Intents & Long-tail Keywords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        {t("Consumer Search Intents", "소비자 검색 의도")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.summary.consumerIntents.map((intent, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{intent}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {t("Long-tail Keywords", "롱테일 키워드")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.summary.longTailKeywords.map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-primary/20">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top 3 Priority Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Rocket className="h-4 w-4 text-primary" />
                    {t("Top 3 Priority Actions", "우선순위 Top 3 액션")}
                  </h4>
                  <div className="space-y-2">
                    {plan.top3Actions.map((action) => (
                      <div key={action.rank} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-start gap-2.5">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                            {action.rank}
                          </span>
                          <div className="space-y-1 flex-1">
                            <p className="text-sm font-semibold">{action.action}</p>
                            <p className="text-xs text-muted-foreground">{action.reason}</p>
                            <p className="text-xs text-primary">KPI: {action.kpi}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel Strategies */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Megaphone className="h-4 w-4 text-primary" />
                    {t("Channel Strategies", "채널별 전략")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {plan.channelStrategies.map((strategy, i) => {
                      const Icon = getChannelIcon(strategy.channel);
                      return (
                        <div key={i} className="rounded-lg border border-border p-3 space-y-2 hover:border-primary/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold">{strategy.channel}</span>
                            </div>
                            <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${priorityColors[strategy.priority]}`}>
                              {strategy.priority}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium">{strategy.activity}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{strategy.detail}</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            ✦ {strategy.expectedEffect}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dotcom Strategy */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-primary" />
                    {t("Dotcom Marketing Strategy", "닷컴 마케팅 전략")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {[
                      { label: t("Performance Marketing", "퍼포먼스 마케팅"), content: plan.dotcomStrategy.performanceMarketing, icon: Target },
                      { label: t("Brand Marketing", "브랜드 마케팅"), content: plan.dotcomStrategy.brandMarketing, icon: Megaphone },
                      { label: t("Landing Page", "랜딩 페이지"), content: plan.dotcomStrategy.landingPageSuggestion, icon: Globe },
                    ].map(({ label, content, icon: DIcon }) => (
                      <div key={label} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5">
                        <p className="text-xs font-semibold flex items-center gap-1">
                          <DIcon className="h-3 w-3 text-primary" /> {label}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* UGC Guidelines */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-primary" />
                    {t("UGC & Experience Campaign Guidelines", "UGC & 체험단 가이드라인")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="rounded-lg border border-border p-3 space-y-1.5">
                      <p className="text-xs font-semibold">🎨 {t("Aesthetic Elements", "미적 요소")}</p>
                      <ul className="space-y-0.5">
                        {plan.ugcGuidelines.aestheticElements.map((el, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {el}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border p-3 space-y-1.5">
                      <p className="text-xs font-semibold">🔄 {t("Before & After", "비포 & 애프터")}</p>
                      <ul className="space-y-0.5">
                        {plan.ugcGuidelines.beforeAfterPoints.map((pt, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {pt}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border p-3 space-y-1.5">
                      <p className="text-xs font-semibold">📱 {t("Content Formats", "콘텐츠 포맷")}</p>
                      <ul className="space-y-0.5">
                        {plan.ugcGuidelines.contentFormats.map((fmt, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {fmt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
