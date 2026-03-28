import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { TrendingUp, BarChart3, Loader2, Database, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useTrendingProducts, useTrendingKeywords, useProductStats, useSourceCounts, type DBTrendingKeyword } from "@/hooks/useProductData";

interface TrendingDashboardProps {
  onProductClick?: (modelNumber: string) => void;
}

export function TrendingDashboard({ onProductClick: _onProductClick }: TrendingDashboardProps) {
  const { t } = useLang();
  const { data: allTrendingProducts = [], isLoading } = useTrendingProducts();
  const { data: allKeywords = [] } = useTrendingKeywords();
  const { data: stats } = useProductStats();
  const { data: sourceCounts = {} } = useSourceCounts();

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

  // Count total platforms with data
  const totalPlatforms = useMemo(() => {
    return Object.keys(sourceCounts).length;
  }, [sourceCounts]);

  // Total reviews across all sources
  const totalReviews = useMemo(() => {
    return Object.values(sourceCounts).reduce((sum, c) => sum + c, 0);
  }, [sourceCounts]);

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

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">📋 {t(`Cross-Channel Weekly Trend Insight Report (${dateRangeLabel})`, `전채널 주간 트렌드 인사이트 리포트 (${dateRangeLabel})`)}</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{t("Loading real data...", "실제 데이터 로딩 중...")}</span>
          </div>
        ) : (
          insights.map((line, i) => (
            <p key={i} className="text-sm text-foreground/85 leading-relaxed">{line}</p>
          ))
        )}
      </div>
    </div>
  );
}
