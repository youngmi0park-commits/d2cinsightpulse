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
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ─── Types ───
interface FaqItem {
  question: string;
  answer: string;
  category: string;
  sourceType: string;
  mentionCount: number;
  confidence: number;
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
  faqItems: FaqItem[];
  reviewTopics: ReviewTopic[];
  painPoints: PainPoint[];
  dataSources: DataSource[];
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

const SOURCE_TYPE_LABEL: Record<string, { en: string; ko: string }> = {
  question: { en: "Direct Question", ko: "직접 질문" },
  issue_resolution: { en: "Issue → Solution", ko: "이슈→해결" },
  pain_point: { en: "Pain Point", ko: "불만 사항" },
  feature_inquiry: { en: "Feature Inquiry", ko: "기능 문의" },
};

export function FaqPanel({ productName, displayName, sentiment, reviews }: FaqPanelProps) {
  const { t } = useLang();
  const [aiData, setAiData] = useState<AiFaqData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ faq: true, topics: false, painPoints: false });

  // Fallback: existing rule-based FAQ
  const fallbackData = useMemo(
    () => generateMarketerToolkit(toPRName(displayName || productName), sentiment, reviews),
    [productName, displayName, sentiment, reviews]
  );

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

  // Group AI FAQs by category
  const faqsByCategory = useMemo(() => {
    if (!aiData) return {};
    const map: Record<string, FaqItem[]> = {};
    for (const faq of aiData.faqItems) {
      const cat = faq.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(faq);
    }
    return map;
  }, [aiData]);

  const categories = Object.keys(faqsByCategory);
  const filteredFaqs = activeCategory ? (faqsByCategory[activeCategory] || []) : (aiData?.faqItems || []);

  if (reviews.length < 3) return null;

  // ─── Render ───
  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold font-heading">
            {t("AI‑Generated FAQ", "AI 생성 FAQ")}
          </h3>
          {aiData && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              {aiData.faqItems.length} {t("Items", "항목")}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {aiData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                copyText(
                  (filteredFaqs).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
                )
              }
              className="h-7 text-[10px] gap-1 text-muted-foreground"
            >
              <Copy className="h-3 w-3" /> {t("Copy All", "전체 복사")}
            </Button>
          )}
          <Button
            size="sm"
            onClick={generateAiFaq}
            disabled={loading}
            className="h-7 text-[10px] gap-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {loading
              ? t("Analyzing…", "분석 중…")
              : aiData
              ? t("Regenerate", "재생성")
              : t("Generate AI FAQ", "AI FAQ 생성")}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          "AI analyzes reviews to extract real questions, pain points, and auto-generate categorized FAQs",
          "AI가 리뷰를 분석하여 실제 질문·불만·이슈를 추출하고 카테고리별 FAQ를 자동 생성합니다"
        )}
      </p>

      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20">
          {error}
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

      {/* AI-powered content */}
      {aiData ? (
        <div className="space-y-4">
          {/* ── FAQ Section ── */}
          <Collapsible open={openSections.faq} onOpenChange={() => toggleSection("faq")}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
              {openSections.faq ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t("Categorized FAQ", "카테고리별 FAQ")}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{aiData.faqItems.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Category filter chips */}
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant={activeCategory === null ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setActiveCategory(null)}
                >
                  {t("All", "전체")}
                </Button>
                {categories.map((cat) => {
                  const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                  const Icon = meta.icon;
                  return (
                    <Button
                      key={cat}
                      variant={activeCategory === cat ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => setActiveCategory(cat)}
                    >
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
                  return (
                    <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50 group relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                        onClick={() => copyText(`Q: ${faq.question}\nA: ${faq.answer}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <CatIcon className={`h-3.5 w-3.5 ${catMeta.color}`} />
                        <p className="text-sm font-semibold text-foreground/90">Q: {faq.question}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-5 mb-2">{faq.answer}</p>
                      <div className="flex gap-1.5 pl-5 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">
                          {t(catMeta.label, catMeta.labelKo)}
                        </Badge>
                        <Badge variant="secondary" className="text-[9px]">
                          {t(stLabel.en, stLabel.ko)}
                        </Badge>
                        {faq.mentionCount > 0 && (
                          <Badge variant="secondary" className="text-[9px]">
                            ×{faq.mentionCount} {t("mentions", "언급")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Review Topics ── */}
          <Collapsible open={openSections.topics} onOpenChange={() => toggleSection("topics")}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
              {openSections.topics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t("Key Review Topics", "핵심 리뷰 토픽")}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{aiData.reviewTopics.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="grid gap-2">
                {aiData.reviewTopics.map((topic, i) => {
                  const catMeta = CATEGORY_META[topic.category] || CATEGORY_META.other;
                  const CatIcon = catMeta.icon;
                  return (
                    <div key={i} className="bg-muted/20 rounded-lg p-3 border border-border/40 flex items-start gap-3">
                      <CatIcon className={`h-4 w-4 mt-0.5 shrink-0 ${catMeta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium">{topic.topic}</span>
                          <Badge className={`text-[9px] border-0 ${SENTIMENT_STYLE[topic.sentiment]}`}>
                            {topic.sentiment}
                          </Badge>
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
              <Badge variant="outline" className="text-[10px] ml-auto">{aiData.painPoints.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="grid gap-2">
                {aiData.painPoints.map((pp, i) => (
                  <div key={i} className="bg-muted/20 rounded-lg p-3 border border-border/40">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`text-[9px] border ${SEVERITY_STYLE[pp.severity]}`}>
                        {pp.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{pp.issue}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">×{pp.frequency}</span>
                    </div>
                    {pp.userWorkaround && (
                      <p className="text-xs text-muted-foreground mt-1 pl-1">
                        💡 {t("Workaround", "해결 방법")}: {pp.userWorkaround}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : (
        /* ── Fallback: rule-based FAQ ── */
        <div className="space-y-3">
          <div className="text-[10px] text-muted-foreground bg-muted/20 rounded px-3 py-2 border border-border/30">
            {t(
              "Click 'Generate AI FAQ' above for enhanced categorized results with AI analysis",
              "'AI FAQ 생성' 버튼을 클릭하면 AI 분석 기반의 고도화된 카테고리별 결과를 볼 수 있습니다"
            )}
          </div>
          <div className="grid gap-2.5">
            {fallbackData.faqItems.map((faq, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50 group relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                  onClick={() => copyText(`Q: ${faq.question}\nA: ${faq.answer}`)}
                >
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
