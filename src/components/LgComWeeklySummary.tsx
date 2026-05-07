import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { useTrendingDataWindow } from "@/hooks/useProductData";
import { DataWindowBadge } from "@/components/DataWindowBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PositiveReviewsDialog } from "@/components/PositiveReviewsDialog";
import {
  BarChart3, ThumbsUp, ThumbsDown, FileText, Star, Lightbulb, Loader2, Eye
} from "lucide-react";

interface TopProduct {
  name: string;
  category: string;
  count: number;
}

export function LgComWeeklySummary() {
  const { t } = useLang();
  const [openProduct, setOpenProduct] = useState<{ name: string; category: string } | null>(null);

  // Use weekly category counts for accurate totals
  const { data: weeklyCounts, isLoading: countsLoading } = useQuery({
    queryKey: ["lgcom-weekly-category-counts-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weekly_category_counts_by_country", {
        p_country: "all",
      });
      if (error) throw error;
      return (data || []) as { category: string; count: number }[];
    },
    staleTime: 5 * 60_000,
  });

  const weeklyTotal = useMemo(() => {
    if (!weeklyCounts) return 0;
    return weeklyCounts.reduce((s, r) => s + Number(r.count), 0);
  }, [weeklyCounts]);

  // Use unified data window: 7d normally, 30d fallback when sparse
  const { data: window } = useTrendingDataWindow("lge_com%");
  const sinceISO = window?.sinceISO;

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["lgcom-weekly-summary-reviews", sinceISO],
    enabled: !!sinceISO,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, sentiment, sentiment_score, rating, product_id, products!inner(display_name, category, is_active)")
        .like("source", "lge_com%")
        .gte("published_at", sinceISO!)
        .order("published_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []).filter((r: any) => r.products?.is_active);
    },
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;

    const sampled = reviews.length;
    const pos = reviews.filter((r: any) => r.sentiment === "positive").length;
    const neg = reviews.filter((r: any) => r.sentiment === "negative").length;
    const neutral = sampled - pos - neg;

    const ratings = reviews.filter((r: any) => r.rating != null).map((r: any) => r.rating as number);
    const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : "–";

    // Use actual weekly total from RPC
    const total = weeklyTotal > 0 ? weeklyTotal : sampled;
    const posPct = sampled > 0 ? Math.round(pos / sampled * 100) : 0;
    const negPct = sampled > 0 ? Math.round(neg / sampled * 100) : 0;
    const neuPct = 100 - posPct - negPct;

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

    return { total, posPct, negPct, neuPct, avgRating, topPos, topNeg, topMentioned };
  }, [reviews, weeklyTotal]);

  const isLoading = countsLoading || reviewsLoading;

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
    <>
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-heading">
            {t("LG.com Weekly Insight Summary", "LG.com 주간 인사이트 요약")}
          </CardTitle>
          <div className="ml-auto flex items-center gap-2">
            <DataWindowBadge sourceLike="lge_com%" />
            <Badge variant="secondary" className="text-[10px]" title={t("Reviews published within the active window", "활성 윈도우 내 작성된 리뷰 합계")}>
              {stats.total.toLocaleString()}{t(" reviews", "건")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <FileText className="h-4 w-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold text-foreground">{stats.total.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground" title={t("Reviews published within the last 7 days across all LG.com regions", "전체 LG.com 지역에서 최근 7일 내 작성된 리뷰 합계")}>{t("Weekly Total", "주간 합계")}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <Star className="h-4 w-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold text-foreground">{stats.avgRating}</div>
            <div className="text-[10px] text-muted-foreground" title={t("Average star rating from sampled weekly reviews (max 1,000)", "주간 샘플 리뷰(최대 1,000건)의 평균 별점")}>{t("Avg Rating", "평균 평점")}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-success" />
            <div className="text-lg font-bold text-success">{stats.posPct}%</div>
            <div className="text-[10px] text-muted-foreground" title={t("Positive sentiment ratio from sampled reviews", "샘플 리뷰 기반 긍정 감성 비율")}>{t("Positive", "긍정")}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <ThumbsDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <div className="text-lg font-bold text-destructive">{stats.negPct}%</div>
            <div className="text-[10px] text-muted-foreground" title={t("Negative sentiment ratio from sampled reviews", "샘플 리뷰 기반 부정 감성 비율")}>{t("Negative", "부정")}</div>
          </div>
        </div>

        {/* Sentiment bar */}
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs font-semibold mb-2">{t("Sentiment Distribution", "감성 비율")}</div>
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="bg-success/70 transition-all" style={{ width: `${stats.posPct}%` }} />
            <div className="bg-muted transition-all" style={{ width: `${stats.neuPct}%` }} />
            <div className="bg-destructive/70 transition-all" style={{ width: `${stats.negPct}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>✅ {t("Positive", "긍정")} {stats.posPct}%</span>
            <span>⚪ {t("Neutral", "중립")} {stats.neuPct}%</span>
            <span>🔴 {t("Negative", "부정")} {stats.negPct}%</span>
          </div>
        </div>

        {/* Top products: positive & negative */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProductRankList
            icon={ThumbsUp}
            title={t("Positive Mentions TOP 3", "긍정 언급 TOP 3")}
            products={stats.topPos.map(p => ({ name: p.name, category: p.category, count: p.pos }))}
            color="success"
            onSelect={(p) => setOpenProduct({ name: p.name, category: p.category })}
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
                  `This week: ${stats.topMentioned[0].name} most reviewed (${stats.topMentioned[0].total} reviews). ${stats.topPos[0]?.name || "\u2013"} leads positive, ${stats.topNeg[0]?.name || "\u2013"} has most negative feedback.`,
                  `\uC774\uBC88 \uC8FC: ${stats.topMentioned[0].name} \uCD5C\uB2E4 \uB9AC\uBDF0 (${stats.topMentioned[0].total}\uAC74). ${stats.topPos[0]?.name || "\u2013"}\uC774(\uAC00) \uAE0D\uC815 1\uC704, ${stats.topNeg[0]?.name || "\u2013"}\uC774(\uAC00) \uBD80\uC815 1\uC704\uC785\uB2C8\uB2E4.`
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    {openProduct && (
      <PositiveReviewsDialog
        open={!!openProduct}
        onOpenChange={(o) => !o && setOpenProduct(null)}
        productName={openProduct.name}
        category={openProduct.category}
        sourceLike="lge_com%"
        sinceISO={sinceISO}
      />
    )}
    </>
  );
}

function ProductRankList({ icon: Icon, title, products, color, onSelect }: {
  icon: any; title: string; products: TopProduct[]; color: "success" | "destructive";
  onSelect?: (p: TopProduct) => void;
}) {
  const isSuccess = color === "success";
  return (
    <div className={`rounded-lg border ${isSuccess ? "border-success/15 bg-success/5" : "border-destructive/15 bg-destructive/5"} p-3 space-y-1.5`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${isSuccess ? "text-success" : "text-destructive"}`} />
        <span className={`text-[11px] font-semibold ${isSuccess ? "text-success" : "text-destructive"}`}>{title}</span>
      </div>
      {products.map((p, i) => (
        <button
          key={p.name}
          type="button"
          onClick={() => onSelect?.(p)}
          disabled={!onSelect}
          className={`w-full flex items-center gap-2 bg-background/60 rounded px-2.5 py-1.5 text-left ${
            onSelect ? "hover:bg-background transition-colors cursor-pointer" : "cursor-default"
          }`}
        >
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
          {onSelect && <Eye className="h-3 w-3 text-muted-foreground shrink-0" />}
        </button>
      ))}
    </div>
  );
}
