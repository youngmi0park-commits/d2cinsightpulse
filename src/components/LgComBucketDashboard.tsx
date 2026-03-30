import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { classifyRedditPost, generateBucketSummaries, type RedditBucket, type ClassifiedPost, type BucketSummary } from "@/lib/redditBucketClassifier";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Store, ChevronDown, Copy, TrendingUp, AlertTriangle, Hash, ArrowRight, Loader2, Calendar, Globe, ShieldAlert, MessageSquareWarning, CheckCircle2, ListTodo } from "lucide-react";
import { toast } from "sonner";

type PeriodFilter = "weekly" | "all";
type CountryFilter = "all" | "US" | "UK";

// ── Only REVIEW + VOC buckets ──
const DISPLAY_BUCKETS: RedditBucket[] = ["REVIEW", "VOC"];

function useLgComClassified(period: PeriodFilter, country: CountryFilter) {
  return useQuery({
    queryKey: ["lgcom-classified", period, country],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("id, content, title, sentiment, sentiment_score, source, products!inner(display_name, category)");

      if (country === "US") {
        query = query.eq("source", "lge_com_us");
      } else if (country === "UK") {
        query = query.eq("source", "lge_com_uk");
      } else {
        query = query.like("source", "lge_com%");
      }

      if (period === "weekly") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("collected_at", weekAgo);
      }

      const { data, error } = await query
        .order("collected_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const classified = (data || []).map((r: any) => ({
        ...classifyRedditPost(r),
        productName: r.products?.display_name || "",
        productCategory: r.products?.category || "",
      }));
      return generateBucketSummaries(classified);
    },
    staleTime: 1000 * 60 * 15,
  });
}

// ── VOC Deep Analysis: weekly negative by country + response rate ──
function useVocDeepAnalysis() {
  return useQuery({
    queryKey: ["lgcom-voc-deep"],
    queryFn: async () => {
      // Weekly negative reviews by country
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: negData } = await supabase
        .from("reviews")
        .select("id, source, content, title, author, sentiment_score")
        .like("source", "lge_com%")
        .eq("sentiment", "negative")
        .gte("collected_at", weekAgo)
        .order("sentiment_score", { ascending: true })
        .limit(500);

      const reviews = negData || [];
      const usReviews = reviews.filter(r => r.source === "lge_com_us");
      const ukReviews = reviews.filter(r => r.source === "lge_com_uk");

      // Detect LG official responses (heuristic: author contains "LG" or content has official response patterns)
      const isLgResponse = (r: typeof reviews[0]) => {
        const author = (r.author || "").toLowerCase();
        const content = (r.content || "").toLowerCase();
        return (
          author.includes("lg ") || author.includes("lg_") || author === "lg" ||
          content.includes("we apologize") ||
          content.includes("we're sorry") ||
          content.includes("please contact us") ||
          content.includes("our customer service") ||
          content.includes("thank you for your feedback") ||
          content.includes("we appreciate your feedback")
        );
      };

      const usResponded = usReviews.filter(isLgResponse).length;
      const ukResponded = ukReviews.filter(isLgResponse).length;

      // Extract top negative product mentions from titles
      const productMentions: Record<string, number> = {};
      reviews.forEach(r => {
        const title = r.title || "";
        if (title.length > 3) {
          productMentions[title] = (productMentions[title] || 0) + 1;
        }
      });
      const topNegProducts = Object.entries(productMentions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Top negative keywords from content
      const negKeywords: Record<string, number> = {};
      const negPatterns = [
        "defective", "broken", "stopped working", "poor quality", "worst", "terrible",
        "disappointed", "waste of money", "never again", "return", "refund", "repair",
        "noise", "leak", "error", "malfunction", "warranty", "replacement", "issue",
        "problem", "fail", "damage", "crack", "rust", "smell", "mold", "ice"
      ];
      reviews.forEach(r => {
        const text = (r.content || "").toLowerCase();
        negPatterns.forEach(kw => {
          if (text.includes(kw)) {
            negKeywords[kw] = (negKeywords[kw] || 0) + 1;
          }
        });
      });
      const topNegKeywords = Object.entries(negKeywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      return {
        us: { total: usReviews.length, responded: usResponded, rate: usReviews.length > 0 ? ((usResponded / usReviews.length) * 100).toFixed(1) : "0" },
        uk: { total: ukReviews.length, responded: ukResponded, rate: ukReviews.length > 0 ? ((ukResponded / ukReviews.length) * 100).toFixed(1) : "0" },
        totalNeg: reviews.length,
        topNegProducts,
        topNegKeywords,
      };
    },
    staleTime: 1000 * 60 * 15,
  });
}

const BUCKET_STYLES: Record<RedditBucket, { bg: string; border: string; text: string; icon: React.ElementType; badgeBg: string }> = {
  REVIEW: { bg: "bg-success/5", border: "border-success/15", text: "text-success", icon: TrendingUp, badgeBg: "bg-success/10" },
  VOC: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", icon: AlertTriangle, badgeBg: "bg-red-500/10" },
  QUESTION: { bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-400", icon: AlertTriangle, badgeBg: "bg-blue-500/10" },
};

function BucketCard({ summary, t }: { summary: BucketSummary; t: (en: string, ko: string) => string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const style = BUCKET_STYLES[summary.bucket];
  const Icon = style.icon;

  const displayPosts = showAll ? summary.posts : summary.posts.slice(0, 5);

  const handleCopyKeywords = () => {
    const text = summary.topKeywords.map((kw) => `${kw.word} (${kw.count})`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success(t("Keywords copied!", "키워드 복사 완료!"));
  };

  const handleCopyPosts = () => {
    const text = summary.posts
      .slice(0, 20)
      .map((p: any) => `[${p.bucket}] ${p.productName || p.title || ""}\nKeywords: ${p.keywords.join(", ")}\nActions: ${p.actionTags.join(", ")}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success(t("Copied!", "복사 완료!"));
  };

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${style.text}`} />
          <h4 className={`font-semibold text-sm ${style.text}`}>
            {summary.icon} {t(summary.label, summary.labelKo)}
          </h4>
          <Badge variant="secondary" className={`text-[10px] ${style.badgeBg} ${style.text}`}>
            {summary.count}{t(" reviews", "건")}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleCopyKeywords}>
            <Hash className="h-3 w-3 mr-1" />
            {t("Copy Keywords", "키워드 복사")}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleCopyPosts}>
            <Copy className="h-3 w-3 mr-1" />
            {t("Copy All", "전체 복사")}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        {t(summary.description, summary.descriptionKo)}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {summary.actions.map((action) => (
          <Badge
            key={action.label}
            variant="outline"
            className={`text-[10px] px-2 py-0.5 ${style.border} ${style.text} gap-1`}
          >
            <span>{action.icon}</span>
            <ArrowRight className="h-2.5 w-2.5" />
            {t(action.label, action.labelKo)}
          </Badge>
        ))}
      </div>

      {summary.topKeywords.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-medium text-muted-foreground block mb-1.5">
            {t("Top Keywords", "상위 키워드")}
          </span>
          <div className="flex flex-wrap gap-1">
            {summary.topKeywords.map((kw) => (
              <Badge key={kw.word} variant="secondary" className="text-[9px] px-1.5 py-0">
                {kw.word} <span className="text-muted-foreground ml-0.5">({kw.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <span>{t("View classified products & keywords", "분류된 제품 · 키워드 보기")}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 mt-2">
            {displayPosts.map((post: any) => (
              <ProductKeywordItem key={post.id} post={post} style={style} t={t} />
            ))}
            {summary.posts.length > 5 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-[11px] text-primary hover:underline"
              >
                {t(`Show all ${summary.posts.length} items`, `전체 ${summary.posts.length}건 보기`)}
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ProductKeywordItem({
  post,
  style,
}: {
  post: any;
  style: typeof BUCKET_STYLES.REVIEW;
  t: (en: string, ko: string) => string;
}) {
  const productName = post.productName || post.title || "Unknown Product";
  return (
    <div className="rounded-md bg-background/50 border border-border/50 p-2.5">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-medium text-foreground line-clamp-1">
          📦 {productName}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={`text-[9px] ${style.text} ${style.border}`}>
            {post.sentiment || "neutral"}
          </Badge>
          <span className="text-[9px] text-muted-foreground">
            {post.source === "lge_com_us" ? "🇺🇸" : post.source === "lge_com_uk" ? "🇬🇧" : ""}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {post.keywords.slice(0, 5).map((kw: string) => (
          <Badge key={kw} variant="secondary" className="text-[9px] px-1.5 py-0">
            #{kw}
          </Badge>
        ))}
        {post.actionTags.slice(0, 2).map((tag: string) => (
          <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 border-muted">
            {tag.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ── VOC Deep Analysis Panel ──
function VocDeepAnalysisPanel({ t }: { t: (en: string, ko: string) => string }) {
  const { data, isLoading } = useVocDeepAnalysis();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("Analyzing VOC data...", "VOC 데이터 분석 중...")}
      </div>
    );
  }

  if (!data || data.totalNeg === 0) return null;

  const todos = [
    {
      priority: "🔴",
      text: t(
        `${data.us.total + data.uk.total} negative reviews this week — set up official LG response workflow for high-severity VOC`,
        `금주 부정 리뷰 ${data.us.total + data.uk.total}건 — 심각도 높은 VOC 대상 공식 LG 응대 워크플로우 구축 필요`
      ),
    },
    {
      priority: "🔴",
      text: t(
        `LG official response rate is currently not tracked — implement response tracking system via Bazaarvoice API`,
        `LG 공식 응대율 현재 미추적 — Bazaarvoice API 통한 응대 추적 시스템 구축 필요`
      ),
    },
    {
      priority: "🟡",
      text: t(
        `Top negative keywords: "${data.topNegKeywords.slice(0, 3).map(k => k.word).join('", "')}" — create FAQ & troubleshooting content`,
        `상위 부정 키워드: "${data.topNegKeywords.slice(0, 3).map(k => k.word).join('", "')}" — FAQ 및 트러블슈팅 콘텐츠 제작`
      ),
    },
    {
      priority: "🟡",
      text: t(
        "Set up automated alerts for products exceeding 50+ weekly negative reviews",
        "주간 부정 리뷰 50건 초과 제품에 대한 자동 알림 설정"
      ),
    },
    {
      priority: "🟢",
      text: t(
        "Establish weekly VOC triage meeting with CS/Product/Marketing teams",
        "CS/제품/마케팅 팀 간 주간 VOC 트리아지 미팅 정례화"
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="h-5 w-5 text-red-400" />
        <h4 className="font-semibold text-sm text-red-400">
          {t("VOC Deep Analysis — Weekly Negative Review Monitoring", "VOC 심층 분석 — 주간 부정 리뷰 모니터링")}
        </h4>
      </div>

      {/* Country breakdown cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { flag: "🇺🇸", label: "US", ...data.us },
          { flag: "🇬🇧", label: "UK", ...data.uk },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-red-500/15 bg-background/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{c.flag}</span>
              <span className="font-semibold text-sm text-foreground">{c.label}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MessageSquareWarning className="h-3 w-3" />
                  {t("Weekly Negative", "주간 부정 리뷰")}
                </span>
                <span className="text-sm font-bold text-red-400">{c.total}{t(" reviews", "건")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("LG Response Rate", "LG 응대율")}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold ${Number(c.rate) > 30 ? "text-success" : "text-orange-400"}`}>
                    {c.rate}%
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    ({c.responded}/{c.total})
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top negative keywords */}
      {data.topNegKeywords.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-muted-foreground block mb-1.5">
            {t("🔥 Top Negative Keywords (this week)", "🔥 주간 상위 부정 키워드")}
          </span>
          <div className="flex flex-wrap gap-1">
            {data.topNegKeywords.map((kw) => (
              <Badge key={kw.word} variant="outline" className="text-[9px] px-1.5 py-0 border-red-500/30 text-red-400">
                {kw.word} <span className="text-muted-foreground ml-0.5">({kw.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Top negative products */}
      {data.topNegProducts.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-muted-foreground block mb-1.5">
            {t("⚠️ Most Complained Products (this week)", "⚠️ 주간 불만 다발 제품")}
          </span>
          <div className="space-y-1">
            {data.topNegProducts.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-[11px] rounded-md bg-background/50 px-2 py-1 border border-border/50">
                <span className="text-foreground">
                  <span className="text-muted-foreground mr-1.5">#{i + 1}</span>
                  {p.name}
                </span>
                <Badge variant="secondary" className="text-[9px] px-1.5 text-red-400">
                  {p.count}{t(" complaints", "건")}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TO-DO Action Items */}
      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <ListTodo className="h-4 w-4 text-orange-400" />
          <span className="font-semibold text-xs text-orange-400">
            {t("📋 Action Items (TO-DO)", "📋 액션 아이템 (TO-DO)")}
          </span>
        </div>
        <div className="space-y-1.5">
          {todos.map((todo, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="shrink-0 mt-0.5">{todo.priority}</span>
              <span className="text-foreground">{todo.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LgComBucketDashboard() {
  const { t } = useLang();
  const [period, setPeriod] = useState<PeriodFilter>("weekly");
  const [country, setCountry] = useState<CountryFilter>("all");
  const { data: summaries, isLoading } = useLgComClassified(period, country);

  // Filter to only REVIEW + VOC
  const filteredSummaries = summaries?.filter(s => DISPLAY_BUCKETS.includes(s.bucket));
  const totalPosts = filteredSummaries?.reduce((s, b) => s + b.count, 0) || 0;

  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: "weekly", label: t("Weekly", "주간") },
    { value: "all", label: t("Cumulative", "누적") },
  ];
  const countryOptions: { value: CountryFilter; label: string; icon: string }[] = [
    { value: "all", label: t("All", "전체"), icon: "🌐" },
    { value: "US", label: "US", icon: "🇺🇸" },
    { value: "UK", label: "UK", icon: "🇬🇧" },
  ];

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-heading">
              {t("LG.com Review Auto-Classification", "LG.com 리뷰 자동 분류")}
            </CardTitle>
            {totalPosts > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {totalPosts}{t(" reviews analyzed", "건 분석")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Calendar className="h-3 w-3 text-muted-foreground ml-1.5" />
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
                    period === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Globe className="h-3 w-3 text-muted-foreground ml-1.5" />
              {countryOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCountry(opt.value)}
                  className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
                    country === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "Auto-classifies LG.com reviews into REVIEW / VOC buckets with marketing actions",
            "LG.com 리뷰를 리뷰 / VOC로 자동 분류하고 마케팅 액션을 연결합니다"
          )}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("Classifying LG.com reviews...", "LG.com 리뷰 분류 중...")}
          </div>
        ) : !filteredSummaries || totalPosts === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("No LG.com review data available.", "LG.com 리뷰 데이터가 없습니다.")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              {filteredSummaries.map((s) => {
                const pct = totalPosts > 0 ? ((s.count / totalPosts) * 100).toFixed(0) : "0";
                const style = BUCKET_STYLES[s.bucket];
                return (
                  <div key={s.bucket} className={`flex-1 rounded-lg ${style.bg} ${style.border} border p-2.5 text-center`}>
                    <div className={`text-lg font-bold ${style.text}`}>{s.count}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.icon} {t(s.label, s.labelKo)} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSummaries.map((s) => (
                <BucketCard key={s.bucket} summary={s} t={t} />
              ))}
            </div>

            {/* VOC Deep Analysis */}
            <VocDeepAnalysisPanel t={t} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
