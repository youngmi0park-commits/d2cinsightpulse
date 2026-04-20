import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Loader2, Store, Flag } from "lucide-react";

interface LgComProduct {
  product_id: string;
  model_number: string;
  display_name: string;
  category: string;
  region: string;
  review_count: number;
  avg_score: number;
  keywords: string[];
}

interface LgComReviewDashboardProps {
  onProductClick?: (modelNumber: string) => void;
}

function useLgComTop(region: string, sentiment: string, period: string) {
  return useQuery({
    queryKey: ["lgcom-top", region, sentiment, period],
    queryFn: async () => {
      if (period === "weekly") {
        const { data, error } = await supabase.rpc("get_lgcom_weekly_top_products", {
          p_region: region,
          p_sentiment: sentiment,
          p_limit: 10,
        });
        if (error) throw error;
        return (data || []) as LgComProduct[];
      }
      // Cumulative: query all reviews (no date filter) - use same RPC but we'll create a wider window
      const { data, error } = await supabase
        .from("reviews")
        .select("product_id, products!inner(model_number, display_name, category, is_active)")
        .like("source", `lge_com_${region === "all" ? "%" : region.toLowerCase()}`)
        .eq("sentiment", sentiment)
        .limit(1000);
      if (error) throw error;

      // Aggregate by product
      const prodMap: Record<string, LgComProduct> = {};
      for (const r of data || []) {
        const prod = r.products as any;
        if (!prod?.is_active) continue;
        const pid = r.product_id;
        if (!prodMap[pid]) {
          prodMap[pid] = {
            product_id: pid,
            model_number: prod.model_number,
            display_name: prod.display_name,
            category: prod.category,
            region: region === "all" ? "ALL" : region,
            review_count: 0,
            avg_score: 0,
            keywords: [],
          };
        }
        prodMap[pid].review_count++;
      }
      return Object.values(prodMap)
        .sort((a, b) => b.review_count - a.review_count)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 30,
  });
}

function ProductRankTable({
  products,
  sentiment,
  onProductClick,
  t,
}: {
  products: LgComProduct[];
  sentiment: "positive" | "negative";
  onProductClick?: (m: string) => void;
  t: (en: string, ko: string) => string;
}) {
  const isPositive = sentiment === "positive";

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t("No review data for this week yet", "이번 주 리뷰 데이터가 아직 없습니다")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium w-8">#</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium">{t("Product", "제품")}</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">{t("Region", "지역")}</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">{t("Reviews", "리뷰수")}</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">{t("Score", "점수")}</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">{t("Keywords", "키워드")}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr
              key={`${p.product_id}-${p.region}`}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onProductClick?.(p.model_number)}
            >
              <td className="py-2.5 px-2">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  i < 3
                    ? isPositive
                      ? "bg-success/15 text-success"
                      : "bg-red-500/20 text-red-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
              </td>
              <td className="py-2.5 px-2">
                <div className="flex flex-col gap-0.5">
                  {(() => {
                    const isGeneric = !p.display_name || /^LG Product/i.test(p.display_name) || /GENERIC/i.test(p.display_name);
                    const isGenericCategory = !p.category || p.category === "General";
                    // Always prefer display_name as primary; only fall back to model when display_name is unusable
                    const primaryName = isGeneric ? (isGenericCategory ? p.model_number : `LG ${p.category}`) : p.display_name;
                    // Hide model number entirely when we have a proper display name — it's just visual noise for marketers
                    const secondaryName = isGeneric ? (isGenericCategory ? "" : p.model_number) : "";
                    return (
                      <>
                        <span className="font-medium text-foreground text-xs leading-tight" title={p.model_number}>{primaryName}</span>
                        {secondaryName && <span className="text-[10px] text-muted-foreground font-mono">{secondaryName}</span>}
                      </>
                    );
                  })()}
                </div>
              </td>
              <td className="py-2.5 px-2 hidden sm:table-cell">
                <Badge variant="outline" className="text-[10px] gap-1 border-primary/20">
                  <Flag className="h-2.5 w-2.5" />
                  {p.region}
                </Badge>
              </td>
              <td className="py-2.5 px-2 text-right">
                <span className="font-mono font-semibold text-xs">{p.review_count}</span>
              </td>
              <td className="py-2.5 px-2 hidden md:table-cell">
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPositive ? "bg-success/70" : "bg-red-500"}`}
                      style={{ width: `${Math.min(p.avg_score || 0, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                    {(p.avg_score || 0).toFixed(0)}
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-2 hidden lg:table-cell">
                <div className="flex flex-wrap gap-1 max-w-[240px]">
                  {(p.keywords || []).slice(0, 3).map((kw, ki) => (
                    <Badge
                      key={ki}
                      variant="secondary"
                      className={`text-[9px] px-1.5 py-0 ${
                        isPositive
                          ? "bg-success/10 text-success border-success/15"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {kw.length > 30 ? kw.slice(0, 30) + "…" : kw}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LgComReviewDashboard({ onProductClick }: LgComReviewDashboardProps) {
  const { t } = useLang();
  const [region, setRegion] = useState("all");
  const [period, setPeriod] = useState<"weekly" | "cumulative">("weekly");

  const { data: positiveProducts, isLoading: posLoading } = useLgComTop(region, "positive", period);
  const { data: negativeProducts, isLoading: negLoading } = useLgComTop(region, "negative", period);

  const isLoading = posLoading || negLoading;

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-heading">
              {t("LG.com Review Dashboard", "LG.com 리뷰 대시보드")}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* Period toggle */}
            <div className="flex gap-0.5 bg-muted/50 rounded-full p-0.5">
              {[
                { value: "weekly" as const, label: t("Weekly", "주간") },
                { value: "cumulative" as const, label: t("Cumulative", "누적") },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    period === p.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Region toggle */}
            <div className="flex gap-0.5 bg-muted/50 rounded-full p-0.5">
              {[
                { value: "all", label: t("All", "전체") },
                { value: "US", label: "US" },
                { value: "UK", label: "UK" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRegion(r.value)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    region === r.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {period === "weekly"
            ? t("Top 10 products by positive/negative reviews this week", "이번 주 긍정/부정 리뷰 기준 Top 10 제품")
            : t("Top 10 products by cumulative positive/negative reviews", "누적 긍정/부정 리뷰 기준 Top 10 제품")}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t("Loading...", "로딩 중...")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Positive Top 10 */}
            <div className="rounded-lg border border-success/15 bg-success/5 p-3">
              <div className="flex items-center gap-2 mb-3">
                <ThumbsUp className="h-4 w-4 text-success" />
                <h4 className="font-semibold text-sm text-success">
                  {t("Top 10 Positive", "긍정 리뷰 Top 10")}
                </h4>
                <TrendingUp className="h-3.5 w-3.5 text-success/50" />
                {positiveProducts && positiveProducts.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-success/10 text-success ml-auto">
                    {positiveProducts.reduce((s, p) => s + p.review_count, 0)} {t("reviews", "건")}
                  </Badge>
                )}
              </div>
              <ProductRankTable
                products={positiveProducts || []}
                sentiment="positive"
                onProductClick={onProductClick}
                t={t}
              />
            </div>

            {/* Negative Top 10 */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-2 mb-3">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <h4 className="font-semibold text-sm text-red-400">
                  {t("Top 10 Negative", "부정 리뷰 Top 10")}
                </h4>
                <TrendingDown className="h-3.5 w-3.5 text-red-500/60" />
                {negativeProducts && negativeProducts.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-400 ml-auto">
                    {negativeProducts.reduce((s, p) => s + p.review_count, 0)} {t("reviews", "건")}
                  </Badge>
                )}
              </div>
              <ProductRankTable
                products={negativeProducts || []}
                sentiment="negative"
                onProductClick={onProductClick}
                t={t}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
