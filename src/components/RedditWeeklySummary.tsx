import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { countryToSourceFilter } from "@/components/CountryFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, TrendingUp, AlertTriangle, HelpCircle,
  ThumbsUp, ThumbsDown, BarChart3, Users, Lightbulb
} from "lucide-react";
import { classifyRedditPost, generateBucketSummaries } from "@/lib/redditBucketClassifier";

export function RedditWeeklySummary({ country = "all" }: { country?: string }) {
  const { t } = useLang();
  const sourcesFilter = country !== "all" ? countryToSourceFilter(country) : null;

  const { data: classified } = useQuery({
    queryKey: ["reddit-weekly-summary", country],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("id, content, title, sentiment, sentiment_score, source, product_id, products!inner(display_name, category)")
        .like("source", "reddit%")
        .order("collected_at", { ascending: false })
        .limit(500);
      if (sourcesFilter) {
        const redditSources = sourcesFilter.filter(s => s.startsWith("reddit"));
        if (redditSources.length === 0) return [];
        query = query.in("source", redditSources);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const stats = useMemo(() => {
    if (!classified || classified.length === 0) return null;

    const total = classified.length;
    const pos = classified.filter((r: any) => r.sentiment === "positive").length;
    const neg = classified.filter((r: any) => r.sentiment === "negative").length;
    const neutral = total - pos - neg;

    // Bucket classification
    const buckets = generateBucketSummaries(classified.map((r: any) => classifyRedditPost(r)));

    // Top products by mention
    const prodMap: Record<string, { name: string; category: string; pos: number; neg: number; total: number }> = {};
    for (const r of classified) {
      const prod = (r as any).products;
      if (!prod) continue;
      const key = prod.display_name;
      if (!prodMap[key]) prodMap[key] = { name: prod.display_name, category: prod.category, pos: 0, neg: 0, total: 0 };
      prodMap[key].total++;
      if ((r as any).sentiment === "positive") prodMap[key].pos++;
      if ((r as any).sentiment === "negative") prodMap[key].neg++;
    }
    const topProducts = Object.values(prodMap).sort((a, b) => b.total - a.total).slice(0, 5);
    const topPos = Object.values(prodMap).sort((a, b) => b.pos - a.pos).slice(0, 3);
    const topNeg = Object.values(prodMap).sort((a, b) => b.neg - a.neg).slice(0, 3);

    return { total, pos, neg, neutral, buckets, topProducts, topPos, topNeg };
  }, [classified]);

  if (!stats) return null;

  const reviewBucket = stats.buckets.find(b => b.bucket === "REVIEW");
  const vocBucket = stats.buckets.find(b => b.bucket === "VOC");
  const questionBucket = stats.buckets.find(b => b.bucket === "QUESTION");

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg font-heading">
            {t("Reddit Weekly Insight Summary", "Reddit 주간 인사이트 요약")}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {stats.total.toLocaleString()}{t(" signals analyzed", "건 분석 완료")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <MessageSquare className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <div className="text-lg font-bold text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">{t("Total Signals", "전체 시그널")}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-success" />
            <div className="text-lg font-bold text-success">{Math.round(stats.pos / stats.total * 100)}%</div>
            <div className="text-[10px] text-muted-foreground">{t("Positive", "긍정")}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <ThumbsDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <div className="text-lg font-bold text-destructive">{Math.round(stats.neg / stats.total * 100)}%</div>
            <div className="text-[10px] text-muted-foreground">{t("Negative", "부정")}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold text-foreground">{Math.round(stats.neutral / stats.total * 100)}%</div>
            <div className="text-[10px] text-muted-foreground">{t("Neutral", "중립")}</div>
          </div>
        </div>

        {/* Bucket breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { bucket: reviewBucket, icon: TrendingUp, label: "Review", color: "text-success", border: "border-success/15", bg: "bg-success/5" },
            { bucket: vocBucket, icon: AlertTriangle, label: "VOC", color: "text-red-400", border: "border-red-500/15", bg: "bg-red-500/5" },
            { bucket: questionBucket, icon: HelpCircle, label: "Question", color: "text-blue-400", border: "border-blue-500/15", bg: "bg-blue-500/5" },
          ].map(({ bucket, icon: Icon, label, color, border, bg }) => (
            <div key={label} className={`rounded-lg border ${border} ${bg} p-3`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className={`text-xs font-semibold ${color}`}>{label}</span>
              </div>
              <div className="text-lg font-bold text-foreground">{bucket?.posts.length || 0}<span className="text-[10px] text-muted-foreground font-normal ml-0.5">{t("posts", "건")}</span></div>
              {bucket && bucket.topKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {bucket.topKeywords.slice(0, 3).map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">{kw.word}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Top products: positive & negative */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Positive */}
          <div className="rounded-lg border border-success/15 bg-success/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5 text-success" />
              <span className="text-[11px] font-semibold text-success">{t("Positive Mentions TOP 3", "긍정 언급 TOP 3")}</span>
            </div>
            {stats.topPos.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 bg-background/60 rounded px-2.5 py-1.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  i === 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-[9px] text-muted-foreground">{p.category}</div>
                </div>
                <span className="text-[11px] font-mono font-semibold text-success shrink-0">{p.pos}</span>
              </div>
            ))}
          </div>
          {/* Negative */}
          <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
              <span className="text-[11px] font-semibold text-destructive">{t("Negative Mentions TOP 3", "부정 언급 TOP 3")}</span>
            </div>
            {stats.topNeg.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 bg-background/60 rounded px-2.5 py-1.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  i === 0 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-[9px] text-muted-foreground">{p.category}</div>
                </div>
                <span className="text-[11px] font-mono font-semibold text-destructive shrink-0">{p.neg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key insight line */}
        {stats.topProducts.length > 0 && (
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                {t(
                  `Most discussed: ${stats.topProducts[0].name} (${stats.topProducts[0].total} mentions). ${stats.topPos[0]?.name || "–"} leads in positive sentiment while ${stats.topNeg[0]?.name || "–"} has the highest negative mentions. See detailed analysis below.`,
                  `가장 많이 언급된 제품은 ${stats.topProducts[0].name} (${stats.topProducts[0].total}건)입니다. ${stats.topPos[0]?.name || "–"}이(가) 긍정 언급 1위, ${stats.topNeg[0]?.name || "–"}이(가) 부정 언급 1위를 기록했습니다. 아래에서 상세 분석을 확인하세요.`
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
