import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { TrendingUp, BarChart3, Loader2, Database, Layers, Store, MessageCircle, ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useTrendingProducts, useTrendingKeywords, useProductStats, useSourceCounts, type DBTrendingKeyword } from "@/hooks/useProductData";

interface KeyTakeawayItem {
  product: string;
  category: string;
  positive_msg: string;
  negative_msg: string;
  marketer_action: string;
}

function useChannelKeyTakeaway(channel: "lgcom" | "reddit") {
  return useQuery({
    queryKey: ["channel-key-takeaway", channel],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-overview-summary", {
        body: { channel },
      });
      if (error) throw error;
      return (data?.overview?.key_takeaway as KeyTakeawayItem[]) || [];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}

interface TrendingDashboardProps {
  onProductClick?: (modelNumber: string) => void;
  country?: string;
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

export function TrendingDashboard({ onProductClick: _onProductClick, country: _country }: TrendingDashboardProps) {
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

  // Auto-fetch KEY TAKEAWAY per channel
  const { data: lgcomTakeaway = [], isLoading: lgcomTakeawayL } = useChannelKeyTakeaway("lgcom");
  const { data: redditTakeaway = [], isLoading: redditTakeawayL } = useChannelKeyTakeaway("reddit");

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
  // Deduplicate products by displayName, keeping highest mentions
  const uniqueProducts = allTrendingProducts.reduce<typeof allTrendingProducts>((acc, p) => {
    if (!acc.find(x => x.displayName === p.displayName)) acc.push(p);
    return acc;
  }, []);
  const top3 = uniqueProducts.slice(0, 3);

  // Deduplicate keywords
  const dedupeKeywords = (kws: DBTrendingKeyword[]) => {
    const seen = new Set<string>();
    return kws.filter(k => {
      const key = k.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const posKeywords = dedupeKeywords(allKeywords.filter(k => k.sentiment === "positive")).slice(0, 3);
  const negKeywords = dedupeKeywords(allKeywords.filter(k => k.sentiment === "negative")).slice(0, 3);

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
      `👍 Positive Keywords TOP 3: ${posKeywords.map(kw => `"${kw.keyword}"`).join(", ")}`,
      `👍 긍정 키워드 TOP 3: ${posKeywords.map(kw => `"${kw.keyword}"`).join(", ")}`
    ) : "",
    posKeywords.length > 0 ? `   └ ${posKeywords.map(kw => `${kw.keyword}: ${kw.count}건 언급`).join(" · ")}` : "",
    negKeywords.length > 0 ? t(
      `⚠️ Negative Keywords TOP 3: ${negKeywords.map(kw => `"${kw.keyword}"`).join(", ")}`,
      `⚠️ 부정 키워드 TOP 3: ${negKeywords.map(kw => `"${kw.keyword}"`).join(", ")}`
    ) : "",
    negKeywords.length > 0 ? `   └ ${negKeywords.map(kw => `${kw.keyword}: ${kw.count}건 언급`).join(" · ")}` : "",
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

        {/* KEY TAKEAWAY — 채널별 마케터 인사이트 */}
        {totalReviews > 0 && (
          <div className="pt-3 border-t border-primary/10 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                💡 KEY TAKEAWAY — {t("Marketer Insights", "마케터 인사이트")}
              </h4>
              {(lgcomTakeawayL || redditTakeawayL) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
              )}
            </div>

            {(lgcomTakeawayL && redditTakeawayL) ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <span className="text-xs text-muted-foreground">{t("Generating AI insights...", "AI 인사이트 생성 중... (최초 1회 약 30~60초 소요)")}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* LG.com Key Takeaway */}
                <KeyTakeawayBlock
                  label="🏪 LG.COM"
                  color="text-primary"
                  borderColor="border-primary/20"
                  items={lgcomTakeaway}
                  loading={lgcomTakeawayL}
                  t={t}
                />
                {/* Reddit Key Takeaway */}
                <KeyTakeawayBlock
                  label="💬 REDDIT"
                  color="text-orange-500"
                  borderColor="border-orange-500/20"
                  items={redditTakeaway}
                  loading={redditTakeawayL}
                  t={t}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Key Takeaway Block ───── */
function KeyTakeawayBlock({ label, color, borderColor, items, loading, t }: {
  label: string; color: string; borderColor: string;
  items: KeyTakeawayItem[]; loading: boolean;
  t: (en: string, ko: string) => string;
}) {
  if (loading) {
    return (
      <div className={`rounded-lg border ${borderColor} bg-amber-50/30 dark:bg-amber-500/5 p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-bold ${color}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2 py-3 justify-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
          <span className="text-[10px] text-muted-foreground">{t("Loading...", "로딩 중...")}</span>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={`rounded-lg border ${borderColor} bg-amber-50/30 dark:bg-amber-500/5 p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-bold ${color}`}>{label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-center py-2">{t("No data", "데이터 없음")}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${borderColor} bg-amber-50/30 dark:bg-amber-500/5 p-4 space-y-2.5`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${color}`}>{label}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} className="bg-background/60 rounded-lg px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold">
              {item.category}
            </Badge>
            <span className="text-[11px] font-bold text-foreground">{item.product}</span>
          </div>
          <div className="text-[11px] text-success leading-relaxed">👍 {item.positive_msg}</div>
          <div className="text-[11px] text-destructive leading-relaxed">👎 {item.negative_msg}</div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-500/10 rounded px-2.5 py-1.5 leading-relaxed">
            🎯 {item.marketer_action}
          </div>
        </div>
      ))}
    </div>
  );
}
