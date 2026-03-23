import { useState, useMemo, useCallback } from "react";
import type { SentimentResult } from "@/lib/sentiment";
import { generateMarketerToolkit } from "@/lib/marketerToolkit";
import { toPRName } from "@/lib/formatMessage";
import { useLang } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy, HelpCircle, FileText, Sparkles, Loader2,
  AlertTriangle, TrendingUp, ChevronDown, ChevronRight,
  Wrench, Monitor, Wifi, Settings, Package, DollarSign, Shield, Tag,
  CheckCircle2, XCircle, Clock, Zap, BarChart3,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ─── Types ───
interface Evidence {
  quotes: string[];
  claims: { metric: string; value: number; unit: string }[];
  pattern: string;
}

interface LegalReview {
  status: "pass" | "needs_revision" | "fail";
  violations: { item_id: string; note: string }[];
}

interface FaqCard {
  faq_id: string;
  product_family: string;
  question: string;
  answer: string;
  category: string;
  sourceType: string;
  topics: string[];
  evidence: Evidence;
  cis: number;
  priority: "P0" | "P1" | "P2" | "Backlog";
  intent_type: string;
  pdp_presence: { status: string; last_updated_days?: number | null };
  legal_review: LegalReview;
  publishable: boolean;
  ab_test_suggestion?: { variation: string; expected_lift: { pdp_to_atc_pct: number[] } };
  // backward compat
  mentionCount?: number;
  confidence?: number;
}

interface ActionItem {
  priority: string;
  product_family: string;
  faq_id: string;
  what: string;
  why: string;
  impact: { expected_lift_cvr_pct: number[] };
  ready_to_use_copy: { pdp_highlight: string; exit_popup: string };
  publishable: boolean;
}

interface CsHeatmapItem {
  issue: string;
  review_freq: number;
  cis_avg: number;
  action_required: boolean;
}

interface ReviewTopic {
  topic: string;
  category: string;
  sentiment: "positive" | "negative" | "mixed";
  mentionCount: number;
  summary: string;
}

interface PainPoint {
  issue: string;
  severity: "high" | "medium" | "low";
  frequency: number;
  userWorkaround: string;
  category: string;
}

interface DataSource {
  source: string;
  count: number;
}

interface AiFaqData {
  faq_cards?: FaqCard[];
  faqItems?: FaqCard[];
  weekly_action_list?: ActionItem[];
  cs_heatmap?: CsHeatmapItem[];
  reviewTopics: ReviewTopic[];
  painPoints: PainPoint[];
  dataSources: DataSource[];
  summary?: {
    total_faq: number;
    p0: number;
    p1: number;
    p2: number;
    publishable_count: number;
  };
}

interface FaqPanelProps {
  productName: string;
  displayName: string;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string; source?: string }[];
}

// ─── Constants ───
const CATEGORY_META: Record<string, { label: string; labelKo: string; icon: React.ElementType; color: string }> = {
  installation: { label: "Installation", labelKo: "설치", icon: Wrench, color: "text-orange-400" },
  initial_setup: { label: "Initial Setup", labelKo: "초기 설정", icon: Settings, color: "text-blue-400" },
  display_sound: { label: "Display & Sound", labelKo: "화면/사운드", icon: Monitor, color: "text-purple-400" },
  connectivity: { label: "Connectivity", labelKo: "연결성", icon: Wifi, color: "text-cyan-400" },
  usability: { label: "Usability", labelKo: "사용성", icon: Package, color: "text-green-400" },
  compatibility: { label: "Compatibility", labelKo: "호환성", icon: Tag, color: "text-indigo-400" },
  features: { label: "Features", labelKo: "기능", icon: Sparkles, color: "text-amber-400" },
  pricing: { label: "Pricing", labelKo: "가격", icon: DollarSign, color: "text-emerald-400" },
  reliability: { label: "Reliability", labelKo: "신뢰성", icon: Shield, color: "text-red-400" },
  feature_issue: { label: "Feature Issue", labelKo: "기능 문제", icon: AlertTriangle, color: "text-red-400" },
  improvement_request: { label: "Improvement", labelKo: "개선 요청", icon: TrendingUp, color: "text-amber-400" },
  praise: { label: "Praise", labelKo: "호평", icon: Sparkles, color: "text-emerald-400" },
  other: { label: "Other", labelKo: "기타", icon: HelpCircle, color: "text-muted-foreground" },
};

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-400",
  negative: "bg-red-500/10 text-red-400",
  mixed: "bg-amber-500/10 text-amber-400",
};

const PRIORITY_STYLE: Record<string, string> = {
  P0: "bg-red-500/20 text-red-400 border-red-500/40",
  P1: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  P2: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  Backlog: "bg-muted text-muted-foreground border-border",
};

const PDP_STATUS_ICON: Record<string, React.ElementType> = {
  implemented: CheckCircle2,
  missing: XCircle,
  outdated: Clock,
};

const SOURCE_TYPE_LABEL: Record<string, { en: string; ko: string }> = {
  question: { en: "Direct Question", ko: "직접 질문" },
  issue_resolution: { en: "Issue → Solution", ko: "이슈→해결" },
  pain_point: { en: "Pain Point", ko: "불만 사항" },
  feature_inquiry: { en: "Feature Inquiry", ko: "기능 문의" },
  conversion_barrier: { en: "Conversion Barrier", ko: "전환 장애" },
};

export function FaqPanel({ productName, displayName, sentiment, reviews }: FaqPanelProps) {
  const { t } = useLang();
  const [aiData, setAiData] = useState<AiFaqData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    faq: true, actions: true, topics: false, painPoints: false, heatmap: false,
  });

  const fallbackData = useMemo(
    () => generateMarketerToolkit(toPRName(displayName || productName), sentiment, reviews),
    [productName, displayName, sentiment, reviews]
  );

  // Resolve faq_cards from either new or legacy format
  const faqCards: FaqCard[] = useMemo(() => {
    if (!aiData) return [];
    return aiData.faq_cards || aiData.faqItems || [];
  }, [aiData]);

  const generateAiFaq = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-faq", {
        body: {
          productName: toPRName(displayName || productName),
          reviews: reviews.slice(0, 40).map((r) => ({
            text: r.text,
            sentiment: r.sentiment,
            source: (r as any).source || "unknown",
          })),
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setAiData(data);
      toast.success(t("AI FAQ generated!", "AI FAQ가 생성되었습니다!"));
    } catch (e: any) {
      console.error("FAQ generation error:", e);
      setError(e.message || "Failed to generate");
      toast.error(t("Failed to generate AI FAQ", "AI FAQ 생성 실패"));
    } finally {
      setLoading(false);
    }
  }, [productName, displayName, reviews, t]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied!", "복사됨!"));
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const faqsByCategory = useMemo(() => {
    const map: Record<string, FaqCard[]> = {};
    for (const faq of faqCards) {
      const cat = faq.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(faq);
    }
    return map;
  }, [faqCards]);

  const categories = Object.keys(faqsByCategory);
  const filteredFaqs = activeCategory ? (faqsByCategory[activeCategory] || []) : faqCards;

  if (reviews.length < 3) return null;

  const hasCIS = faqCards.some((f) => typeof f.cis === "number");

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold font-heading">
            {t("AI‑Generated FAQ", "AI 생성 FAQ")}
          </h3>
          {faqCards.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              {faqCards.length} {t("Items", "항목")}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {faqCards.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => copyText(filteredFaqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"))} className="h-7 text-[10px] gap-1 text-muted-foreground">
              <Copy className="h-3 w-3" /> {t("Copy All", "전체 복사")}
            </Button>
          )}
          <Button size="sm" onClick={generateAiFaq} disabled={loading} className="h-7 text-[10px] gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {loading ? t("Analyzing…", "분석 중…") : faqCards.length > 0 ? t("Regenerate", "재생성") : t("Generate AI FAQ", "AI FAQ 생성")}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          "AI analyzes reviews to generate conversion-optimized FAQs with evidence, CIS scoring, and legal compliance checks",
          "AI가 리뷰를 분석하여 증거 기반·전환 영향도(CIS)·법무 검토가 포함된 전환 최적화 FAQ를 자동 생성합니다"
        )}
      </p>

      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20">{error}</div>
      )}

      {/* Summary Bar */}
      {aiData?.summary && (
        <div className="flex gap-3 flex-wrap text-[11px]">
          <div className="bg-muted/30 rounded-lg px-3 py-2 border border-border/50 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">{t("Total", "총")}: <strong className="text-foreground">{aiData.summary.total_faq}</strong></span>
          </div>
          <Badge className={`${PRIORITY_STYLE.P0} border text-[10px]`}>P0: {aiData.summary.p0}</Badge>
          <Badge className={`${PRIORITY_STYLE.P1} border text-[10px]`}>P1: {aiData.summary.p1}</Badge>
          <Badge className={`${PRIORITY_STYLE.P2} border text-[10px]`}>P2: {aiData.summary.p2}</Badge>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>{t("Publishable", "발행 가능")}: {aiData.summary.publishable_count}</span>
          </div>
        </div>
      )}

      {/* Data Sources */}
      {aiData?.dataSources && aiData.dataSources.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {aiData.dataSources.map((ds, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1">
              {ds.source} <span className="text-muted-foreground">({ds.count})</span>
            </Badge>
          ))}
        </div>
      )}

      {aiData ? (
        <div className="space-y-4">
          {/* ── Weekly Action List ── */}
          {aiData.weekly_action_list && aiData.weekly_action_list.length > 0 && (
            <Collapsible open={openSections.actions} onOpenChange={() => toggleSection("actions")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
                {openSections.actions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold">{t("Weekly Action List", "주간 액션리스트")}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{aiData.weekly_action_list.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {aiData.weekly_action_list.map((action, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${PRIORITY_STYLE[action.priority] || PRIORITY_STYLE.P2} border text-[9px]`}>{action.priority}</Badge>
                      <span className="text-xs font-mono text-muted-foreground">{action.product_family}</span>
                      {action.publishable && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <p className="text-sm font-medium">{action.what}</p>
                    <p className="text-xs text-muted-foreground">{t("Why", "사유")}: {action.why}</p>
                    <p className="text-xs text-muted-foreground">{t("Impact", "영향")}: CVR +{action.impact.expected_lift_cvr_pct[0]}~{action.impact.expected_lift_cvr_pct[1]}%p</p>
                    <div className="bg-primary/5 rounded p-2.5 space-y-1 border border-primary/10">
                      <p className="text-[10px] font-semibold text-primary">{t("Ready-to-use Copy", "바로 쓰는 문구")}</p>
                      <p className="text-xs text-foreground/80">📌 {action.ready_to_use_copy.pdp_highlight}</p>
                      <p className="text-xs text-foreground/80">🚪 {action.ready_to_use_copy.exit_popup}</p>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── FAQ Cards ── */}
          <Collapsible open={openSections.faq} onOpenChange={() => toggleSection("faq")}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
              {openSections.faq ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t("FAQ Cards", "FAQ 카드")}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{faqCards.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Category filter */}
              <div className="flex gap-1.5 flex-wrap">
                <Button variant={activeCategory === null ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setActiveCategory(null)}>
                  {t("All", "전체")}
                </Button>
                {categories.map((cat) => {
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

              {/* FAQ cards */}
              <div className="grid gap-2.5">
                {filteredFaqs.map((faq, i) => {
                  const catMeta = CATEGORY_META[faq.category] || CATEGORY_META.other;
                  const CatIcon = catMeta.icon;
                  const stLabel = SOURCE_TYPE_LABEL[faq.sourceType] || SOURCE_TYPE_LABEL.question;
                  const PdpIcon = PDP_STATUS_ICON[faq.pdp_presence?.status] || Clock;
                  return (
                    <div key={faq.faq_id || i} className={`bg-muted/30 rounded-lg p-4 border group relative ${faq.publishable ? "border-emerald-500/30" : "border-border/50"}`}>
                      <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0" onClick={() => copyText(`Q: ${faq.question}\nA: ${faq.answer}`)}>
                        <Copy className="h-3 w-3" />
                      </Button>

                      {/* Top meta row */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {hasCIS && faq.priority && (
                          <Badge className={`${PRIORITY_STYLE[faq.priority] || PRIORITY_STYLE.Backlog} border text-[9px]`}>{faq.priority}</Badge>
                        )}
                        {hasCIS && typeof faq.cis === "number" && (
                          <Badge variant="outline" className="text-[9px] font-mono">CIS {faq.cis.toFixed(0)}</Badge>
                        )}
                        {faq.publishable === true && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border text-[9px] gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> {t("Publishable", "발행가능")}
                          </Badge>
                        )}
                        {faq.publishable === false && (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 border text-[9px] gap-0.5">
                            <XCircle className="h-2.5 w-2.5" /> {t("Draft", "초안")}
                          </Badge>
                        )}
                        {faq.pdp_presence && (
                          <Badge variant="secondary" className="text-[9px] gap-0.5">
                            <PdpIcon className="h-2.5 w-2.5" /> PDP: {faq.pdp_presence.status}
                          </Badge>
                        )}
                        {faq.faq_id && (
                          <span className="text-[9px] font-mono text-muted-foreground ml-auto">{faq.faq_id}</span>
                        )}
                      </div>

                      {/* Q&A */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <CatIcon className={`h-3.5 w-3.5 ${catMeta.color}`} />
                        <p className="text-sm font-semibold text-foreground/90">Q: {faq.question}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-5 mb-2">{faq.answer}</p>

                      {/* Evidence */}
                      {faq.evidence && (
                        <div className="pl-5 mb-2 space-y-1">
                          {faq.evidence.quotes?.length > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              {faq.evidence.quotes.map((q, qi) => (
                                <p key={qi} className="italic border-l-2 border-primary/30 pl-2 py-0.5">"{q}"</p>
                              ))}
                            </div>
                          )}
                          {faq.evidence.claims?.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {faq.evidence.claims.map((c, ci) => (
                                <Badge key={ci} variant="outline" className="text-[9px] font-mono">
                                  {c.metric}: {c.value}{c.unit}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {faq.evidence.pattern && (
                            <p className="text-[10px] text-muted-foreground/70">📊 {faq.evidence.pattern}</p>
                          )}
                        </div>
                      )}

                      {/* Legal */}
                      {faq.legal_review && (
                        <div className="pl-5 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3" />
                            <span className={`text-[9px] font-medium ${faq.legal_review.status === "pass" ? "text-emerald-400" : faq.legal_review.status === "needs_revision" ? "text-amber-400" : "text-red-400"}`}>
                              {t("Legal", "법무")}: {faq.legal_review.status}
                            </span>
                          </div>
                          {faq.legal_review.violations?.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {faq.legal_review.violations.map((v, vi) => (
                                <p key={vi} className="text-[9px] text-amber-400/80 pl-4">⚠ [{v.item_id}] {v.note}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      <div className="flex gap-1.5 pl-5 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{t(catMeta.label, catMeta.labelKo)}</Badge>
                        <Badge variant="secondary" className="text-[9px]">{t(stLabel.en, stLabel.ko)}</Badge>
                        {faq.topics?.map((tp, ti) => (
                          <Badge key={ti} variant="secondary" className="text-[9px] opacity-70">{tp}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── CS Heatmap ── */}
          {aiData.cs_heatmap && aiData.cs_heatmap.length > 0 && (
            <Collapsible open={openSections.heatmap} onOpenChange={() => toggleSection("heatmap")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
                {openSections.heatmap ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t("CS Issue Heatmap", "CS 이슈 히트맵")}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{aiData.cs_heatmap.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid gap-1.5">
                  {aiData.cs_heatmap.map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 text-xs rounded-lg px-3 py-2 border ${item.action_required ? "bg-red-500/5 border-red-500/20" : "bg-muted/20 border-border/40"}`}>
                      {item.action_required && <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                      <span className="font-medium flex-1">{item.issue}</span>
                      <span className="text-muted-foreground">{t("Freq", "빈도")}: {(item.review_freq * 100).toFixed(0)}%</span>
                      <Badge variant="outline" className="text-[9px] font-mono">CIS {item.cis_avg.toFixed(0)}</Badge>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── Review Topics ── */}
          <Collapsible open={openSections.topics} onOpenChange={() => toggleSection("topics")}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
              {openSections.topics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t("Key Review Topics", "핵심 리뷰 토픽")}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{aiData.reviewTopics?.length || 0}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="grid gap-2">
                {aiData.reviewTopics?.map((topic, i) => {
                  const catMeta = CATEGORY_META[topic.category] || CATEGORY_META.other;
                  const CatIcon = catMeta.icon;
                  return (
                    <div key={i} className="bg-muted/20 rounded-lg p-3 border border-border/40 flex items-start gap-3">
                      <CatIcon className={`h-4 w-4 mt-0.5 shrink-0 ${catMeta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium">{topic.topic}</span>
                          <Badge className={`text-[9px] border-0 ${SENTIMENT_STYLE[topic.sentiment]}`}>{topic.sentiment}</Badge>
                          <span className="text-[10px] text-muted-foreground">×{topic.mentionCount}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{topic.summary}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Pain Points ── */}
          <Collapsible open={openSections.painPoints} onOpenChange={() => toggleSection("painPoints")}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
              {openSections.painPoints ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold">{t("Pain Points", "주요 불만 사항")}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{aiData.painPoints?.length || 0}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="grid gap-2">
                {aiData.painPoints?.map((pp, i) => (
                  <div key={i} className="bg-muted/20 rounded-lg p-3 border border-border/40">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`text-[9px] border ${SEVERITY_STYLE[pp.severity]}`}>{pp.severity.toUpperCase()}</Badge>
                      <span className="text-sm font-medium">{pp.issue}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">×{pp.frequency}</span>
                    </div>
                    {pp.userWorkaround && (
                      <p className="text-xs text-muted-foreground mt-1 pl-1">💡 {t("Workaround", "해결 방법")}: {pp.userWorkaround}</p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : (
        /* Fallback */
        <div className="space-y-3">
          <div className="text-[10px] text-muted-foreground bg-muted/20 rounded px-3 py-2 border border-border/30">
            {t(
              "Click 'Generate AI FAQ' above for enhanced results with CIS scoring, evidence, and legal compliance",
              "'AI FAQ 생성' 버튼을 클릭하면 CIS 점수, 증거, 법무 검토가 포함된 고도화 결과를 볼 수 있습니다"
            )}
          </div>
          <div className="grid gap-2.5">
            {fallbackData.faqItems.map((faq, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50 group relative">
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0" onClick={() => copyText(`Q: ${faq.question}\nA: ${faq.answer}`)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <p className="text-sm font-semibold text-foreground/90">Q: {faq.question}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-5">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
