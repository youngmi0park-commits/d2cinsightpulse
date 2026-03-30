import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, ThumbsUp, ThumbsDown, FileText, Star, Lightbulb, Users, Loader2
} from "lucide-react";

interface TopProduct {
  name: string;
  category: string;
  count: number;
}

export function LgComWeeklySummary() {
  const { t } = useLang();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["lgcom-weekly-summary-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, sentiment, sentiment_score, rating, product_id, products!inner(display_name, category, is_active)")
        .like("source", "lge_com%")
        .order("collected_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []).filter((r: any) => r.products?.is_active);
    },
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;

    const total = reviews.length;
    const pos = reviews.filter((r: any) => r.sentiment === "positive").length;
    const neg = reviews.filter((r: any) => r.sentiment === "negative").length;
    const neutral = total - pos - neg;

    const ratings = reviews.filter((r: any) => r.rating != null).map((r: any) => r.rating as number);
    const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : "–";

    // Top products by positive/negative
    const prodMap: Record<string, { name: string; category: string; pos: number; neg: number; total: number }> = {};
    for (const r of reviews) {
      const prod = (r as any).products;
      if (!prod) continue;
      const key = prod.display_name;
      if (!prodMap[key]) prodMap[key] = { name: prod.display_name, category: prod.category, pos: 0, neg: 0, total: 0 };
      prodMap[key].total++;
      if ((r as any).sentiment === "positive") prodMap[key].pos++;
      if ((r as any).sentiment === "negative") prodMap[key].neg++;
    }
    const topPos = Object.values(prodMap).sort((a, b) => b.pos - a.pos).slice(0, 3);
    const topNeg = Object.values(prodMap).sort((a, b) => b.neg - a.neg).slice(0, 3);
    const topMentioned = Object.values(prodMap).sort((a, b) => b.total - a.total).slice(0, 3);

    return { total, pos, neg, neutral, avgRating, topPos, topNeg, topMentioned };
  }, [reviews]);

  if (isLoading) {
    return (
      <Card className="gradient-card border-border">
        <CardContent className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("Loading...", "로딩 중...")}</span>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-heading">
            {t("LG.com Weekly Insight Summary", "LG.com 주간 인사이트 요약")}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {stats.total.toLocaleString()}{t(" reviews analyzed", "건 분석 완료")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <FileText className="h-4 w-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold text-foreground">{stats.total.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">{t("Total Reviews", "전체 리뷰")}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <Star className="h-4 w-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold text-foreground">{stats.avgRating}</div>
            <div className="text-[10px] text-muted-foreground">{t("Avg Rating", "평균 평점")}</div>
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
        </div>

        {/* Sentiment bar */}
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs font-semibold mb-2">{t("Sentiment Distribution", "감성 비율")}</div>
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="bg-success/70 transition-all" style={{ width: `${Math.round(stats.pos / stats.total * 100)}%` }} />
            <div className="bg-muted transition-all" style={{ width: `${Math.round(stats.neutral / stats.total * 100)}%` }} />
            <div className="bg-destructive/70 transition-all" style={{ width: `${Math.round(stats.neg / stats.total * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>✅ {t("Positive", "긍정")} {Math.round(stats.pos / stats.total * 100)}%</span>
            <span>⚪ {t("Neutral", "중립")} {Math.round(stats.neutral / stats.total * 100)}%</span>
            <span>🔴 {t("Negative", "부정")} {Math.round(stats.neg / stats.total * 100)}%</span>
          </div>
        </div>

        {/* Top products: positive & negative */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProductRankList
            icon={ThumbsUp}
            title={t("Positive Mentions TOP 3", "긍정 언급 TOP 3")}
            products={stats.topPos.map(p => ({ name: p.name, category: p.category, count: p.pos }))}
            color="success"
          />
          <ProductRankList
            icon={ThumbsDown}
            title={t("Negative Mentions TOP 3", "부정 언급 TOP 3")}
            products={stats.topNeg.map(p => ({ name: p.name, category: p.category, count: p.neg }))}
            color="destructive"
          />
        </div>

        {/* Key insight line */}
        {stats.topMentioned.length > 0 && (
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                {t(
                  `Most reviewed: ${stats.topMentioned[0].name} (${stats.topMentioned[0].total} reviews). ${stats.topPos[0]?.name || "–"} leads positive sentiment, while ${stats.topNeg[0]?.name || "–"} has the most negative feedback. Use the AI report below for detailed strategic analysis.`,
                  `가장 많은 리뷰: ${stats.topMentioned[0].name} (${stats.topMentioned[0].total}건). ${stats.topPos[0]?.name || "–"}이(가) 긍정 1위, ${stats.topNeg[0]?.name || "–"}이(가) 부정 1위입니다. 아래 AI 리포트에서 상세 전략 분석을 확인하세요.`
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductRankList({ icon: Icon, title, products, color }: {
  icon: any; title: string; products: TopProduct[]; color: "success" | "destructive";
}) {
  const isSuccess = color === "success";
  return (
    <div className={`rounded-lg border ${isSuccess ? "border-success/15 bg-success/5" : "border-destructive/15 bg-destructive/5"} p-3 space-y-1.5`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${isSuccess ? "text-success" : "text-destructive"}`} />
        <span className={`text-[11px] font-semibold ${isSuccess ? "text-success" : "text-destructive"}`}>{title}</span>
      </div>
      {products.map((p, i) => (
        <div key={p.name} className="flex items-center gap-2 bg-background/60 rounded px-2.5 py-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
            i === 0
              ? isSuccess ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-foreground truncate">{p.name}</div>
            <div className="text-[9px] text-muted-foreground">{p.category}</div>
          </div>
          <span className={`text-[11px] font-mono font-semibold shrink-0 ${isSuccess ? "text-success" : "text-destructive"}`}>{p.count}</span>
        </div>
      ))}
    </div>
  );
}
