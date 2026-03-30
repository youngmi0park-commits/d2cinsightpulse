import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { TrendingUp, BarChart3, Loader2, Database, Layers, Store, MessageCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useTrendingProducts, useTrendingKeywords, useProductStats, useSourceCounts, type DBTrendingKeyword } from "@/hooks/useProductData";

interface TrendingDashboardProps {
  onProductClick?: (modelNumber: string) => void;
}

interface ChannelTopProduct {
  product_id: string;
  model_number: string;
  display_name: string;
  category: string;
  count: number;
}

function useChannelTopProducts(sourcePrefix: string, sentiment: string, limit = 3) {
  return useQuery({
    queryKey: ["channel-top-products", sourcePrefix, sentiment, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("product_id, products!inner(model_number, display_name, category, is_active)")
        .like("source", `${sourcePrefix}%`)
        .eq("sentiment", sentiment)
        .limit(1000);

      if (error) throw error;

      const prodMap: Record<string, ChannelTopProduct> = {};
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
            count: 0,
          };
        }
        prodMap[pid].count++;
      }
      return Object.values(prodMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    staleTime: 1000 * 60 * 5,
  });
}

function ChannelSection({
  icon: Icon,
  label,
  iconColor,
  borderColor,
  bgColor,
  totalCount,
  posProducts,
  negProducts,
  posLoading,
  negLoading,
  t,
}: {
  icon: any;
  label: string;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  totalCount: number;
  posProducts: ChannelTopProduct[];
  negProducts: ChannelTopProduct[];
  posLoading: boolean;
  negLoading: boolean;
  t: (en: string, ko: string) => string;
}) {
  const loading = posLoading || negLoading;

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="font-semibold text-sm text-foreground">{label}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {totalCount.toLocaleString()}{t(" reviews", "건")}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("Loading...", "로딩 중...")}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Positive Top 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-3 w-3 text-success" />
              <span className="text-[11px] font-semibold text-success">{t("Positive TOP 3", "긍정 TOP 3")}</span>
            </div>
            {posProducts.length > 0 ? posProducts.map((p, i) => (
              <div key={p.product_id} className="flex items-center gap-2 bg-background/60 rounded px-2.5 py-1.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  i === 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate">{p.display_name || p.model_number}</div>
                  <div className="text-[9px] text-muted-foreground">{p.category}</div>
                </div>
                <span className="text-[11px] font-mono font-semibold text-success shrink-0">{p.count}</span>
              </div>
            )) : (
              <p className="text-[10px] text-muted-foreground">{t("No data", "데이터 없음")}</p>
            )}
          </div>

          {/* Negative Top 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ThumbsDown className="h-3 w-3 text-destructive" />
              <span className="text-[11px] font-semibold text-destructive">{t("Negative TOP 3", "부정 TOP 3")}</span>
            </div>
            {negProducts.length > 0 ? negProducts.map((p, i) => (
              <div key={p.product_id} className="flex items-center gap-2 bg-background/60 rounded px-2.5 py-1.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  i === 0 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate">{p.display_name || p.model_number}</div>
                  <div className="text-[9px] text-muted-foreground">{p.category}</div>
                </div>
                <span className="text-[11px] font-mono font-semibold text-destructive shrink-0">{p.count}</span>
              </div>
            )) : (
              <p className="text-[10px] text-muted-foreground">{t("No data", "데이터 없음")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrendingDashboard({ onProductClick: _onProductClick }: TrendingDashboardProps) {
  const { t } = useLang();
  const { data: allTrendingProducts = [], isLoading } = useTrendingProducts();
  const { data: allKeywords = [] } = useTrendingKeywords();
  const { data: stats } = useProductStats();
  const { data: sourceCounts = {} } = useSourceCounts();

  // Channel top products
  const { data: lgcomPos = [], isLoading: lgcomPosL } = useChannelTopProducts("lge_com", "positive");
  const { data: lgcomNeg = [], isLoading: lgcomNegL } = useChannelTopProducts("lge_com", "negative");
  const { data: redditPos = [], isLoading: redditPosL } = useChannelTopProducts("reddit", "positive");
  const { data: redditNeg = [], isLoading: redditNegL } = useChannelTopProducts("reddit", "negative");

  const lastCollection = stats?.lastCollection;
  const lastCollectedAt = lastCollection?.completed_at
    ? new Date(lastCollection.completed_at)
    : null;

  const today = new Date();
  const weekAgo = subDays(today, 7);
  const dateRangeLabel = `${format(weekAgo, "yyyy.MM.dd")} ~ ${format(today, "yyyy.MM.dd")}`;
  const lastSyncLabel = lastCollectedAt
    ? format(lastCollectedAt, "yyyy.MM.dd HH:mm")
    : null;

  const totalPlatforms = useMemo(() => Object.keys(sourceCounts).length, [sourceCounts]);
  const totalReviews = useMemo(() => Object.values(sourceCounts).reduce((sum, c) => sum + c, 0), [sourceCounts]);

  const lgcomCount = sourceCounts["lge_com"] || 0;
  const redditCount = sourceCounts["reddit"] || 0;

  const totalMentions = allTrendingProducts.reduce((sum, p) => sum + p.mentions, 0);
  const avgSentiment = allTrendingProducts.length > 0
    ? Math.round(allTrendingProducts.reduce((sum, p) => sum + p.sentimentScore, 0) / allTrendingProducts.length)
    : 0;
  const top3 = allTrendingProducts.slice(0, 3);

  const posKeywords = allKeywords.filter(k => k.sentiment === "positive").slice(0, 3);
  const negKeywords = allKeywords.filter(k => k.sentiment === "negative").slice(0, 3);

  const formatKwList = (kws: DBTrendingKeyword[]) =>
    kws.map(kw => `"${kw.keyword}"`).join(", ");

  const collectionStatusLine = lastSyncLabel
    ? t(
        `🔄 Last synced: ${lastSyncLabel} (${lastCollection?.items_collected ?? 0} items collected, status: ${lastCollection?.status ?? "unknown"})`,
        `🔄 마지막 동기화: ${lastSyncLabel} (${lastCollection?.items_collected ?? 0}건 수집, 상태: ${lastCollection?.status === "completed" ? "완료" : lastCollection?.status === "running" ? "수집중" : lastCollection?.status ?? "알 수 없음"})`
      )
    : t(
        "🔄 No collection has been run yet.",
        "🔄 아직 수집이 실행되지 않았습니다."
      );

  const insights = totalReviews > 0 ? [
    collectionStatusLine,
    t(
      `📊 Total ${totalReviews.toLocaleString()} reviews collected across ${totalPlatforms} channels. Average sentiment score: ${avgSentiment}.`,
      `📊 전체 ${totalPlatforms}개 채널에서 총 ${totalReviews.toLocaleString()}건의 리뷰가 수집되었으며, 평균 감성점수는 ${avgSentiment}점입니다.`
    ),
    t(
      `🌐 LG.com: ${lgcomCount.toLocaleString()} reviews · Reddit: ${redditCount.toLocaleString()} signals`,
      `🌐 LG.com: ${lgcomCount.toLocaleString()}건 · Reddit: ${redditCount.toLocaleString()}건`
    ),
    top3.length > 0 ? t(
      `🏆 Weekly Mentions TOP 3: ${top3.map((p, i) => `#${i + 1} ${p.displayName} (${p.mentions.toLocaleString()})`).join(", ")}`,
      `🏆 주간 언급량 TOP 3: ${top3.map((p, i) => `${i + 1}위 ${p.displayName} (${p.mentions.toLocaleString()}건)`).join(", ")}`
    ) : "",
    posKeywords.length > 0 ? t(
      `👍 Positive Keywords TOP 3: ${formatKwList(posKeywords)}`,
      `👍 긍정 키워드 TOP 3: ${formatKwList(posKeywords)}`
    ) : "",
    negKeywords.length > 0 ? t(
      `⚠️ Negative Keywords TOP 3: ${formatKwList(negKeywords)}`,
      `⚠️ 부정 키워드 TOP 3: ${formatKwList(negKeywords)}`
    ) : "",
  ].filter(Boolean) : [
    collectionStatusLine,
    t(
      "📊 No data collected yet. Data will appear here once the automated collection runs.",
      "📊 아직 수집된 데이터가 없습니다. 자동 수집이 실행되면 여기에 데이터가 표시됩니다."
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold font-heading">📡 {t("Real-time Trending Dashboard", "실시간 트렌딩 대시보드")}</h2>
        <Badge variant="secondary" className="text-xs gap-1">
          <Database className="h-3 w-3" />
          {t(`Live · Weekly (${dateRangeLabel})`, `Live · 주간 집계 (${dateRangeLabel})`)}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1.5 border-primary/30 text-primary">
          <Layers className="h-3 w-3" />
          {t(`${totalPlatforms} platforms collecting`, `${totalPlatforms}개 플랫폼 수집중`)}
        </Badge>
        {lastSyncLabel && (
          <Badge variant="outline" className="text-xs gap-1">
            🔄 {t(`Synced ${lastSyncLabel}`, `${lastSyncLabel} 동기화`)}
          </Badge>
        )}
      </div>

      {/* Overall weekly summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">📋 {t(`Cross-Channel Weekly Trend Insight Report (${dateRangeLabel})`, `전채널 주간 트렌드 인사이트 리포트 (${dateRangeLabel})`)}</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{t("Loading real data...", "실제 데이터 로딩 중...")}</span>
          </div>
        ) : (
          <div className="space-y-1">
            {insights.map((line, i) => (
              <p key={i} className="text-sm text-foreground/85 leading-relaxed">{line}</p>
            ))}
          </div>
        )}

        {/* Channel-specific breakdowns */}
        {totalReviews > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-primary/10">
            <ChannelSection
              icon={Store}
              label={t("LG.com Review Analysis", "🏬 LG.com 리뷰 분석")}
              iconColor="text-primary"
              borderColor="border-primary/15"
              bgColor="bg-card/60"
              totalCount={lgcomCount}
              posProducts={lgcomPos}
              negProducts={lgcomNeg}
              posLoading={lgcomPosL}
              negLoading={lgcomNegL}
              t={t}
            />
            <ChannelSection
              icon={MessageCircle}
              label={t("Reddit Signal Analysis", "💬 Reddit 시그널 분석")}
              iconColor="text-orange-500"
              borderColor="border-orange-500/15"
              bgColor="bg-card/60"
              totalCount={redditCount}
              posProducts={redditPos}
              negProducts={redditNeg}
              posLoading={redditPosL}
              negLoading={redditNegL}
              t={t}
            />
          </div>
        )}
      </div>
    </div>
  );
}
