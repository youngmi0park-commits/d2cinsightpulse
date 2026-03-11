import { format, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Minus, ExternalLink, MessageSquare, ShoppingCart, ThumbsUp, ThumbsDown, BarChart3, ArrowUpRight, ArrowDownRight, Monitor, Tv, Star, Shield, Award, Loader2, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useTrendingProducts, useTrendingKeywords, useProductStats, type DBTrendingProduct, type DBTrendingKeyword } from "@/hooks/useProductData";

interface TrendingDashboardProps {
  onProductClick?: (modelNumber: string) => void;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function SentimentBar({ score }: { score: number }) {
  const color = score >= 85 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{score}</span>
    </div>
  );
}

function ProductTable({ products, onProductClick, t }: { products: DBTrendingProduct[]; onProductClick?: (m: string) => void; t: (en: string, ko: string) => string }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        {t("No trending data yet for this channel", "이 채널에 대한 트렌딩 데이터가 아직 없습니다")}
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
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">{t("Category", "카테고리")}</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">{t("Mentions", "언급수")}</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">{t("Sentiment", "감성점수")}</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">{t("Change", "변동")}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.modelNumber}
              className="border-b border-border/50 hover:bg-primary/5 transition-colors cursor-pointer group"
              onClick={() => onProductClick?.(p.modelNumber)}
            >
              <td className="py-2.5 px-2">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  p.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {p.rank}
                </span>
              </td>
              <td className="py-2.5 px-2">
                <div>
                  <span className="font-mono text-xs font-medium group-hover:text-primary transition-colors">
                    {p.modelNumber}
                  </span>
                  <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-muted-foreground">{p.displayName}</span>
              </td>
              <td className="py-2.5 px-2 hidden sm:table-cell">
                <Badge variant="outline" className="text-xs">{p.category}</Badge>
              </td>
              <td className="py-2.5 px-2 text-right font-mono text-xs">
                {p.mentions.toLocaleString()}
              </td>
              <td className="py-2.5 px-2 hidden md:table-cell">
                <SentimentBar score={p.sentimentScore} />
              </td>
              <td className="py-2.5 px-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendIcon trend={p.trend} />
                  <span className={`text-xs font-mono ${
                    p.changePercent > 0 ? "text-green-600" : p.changePercent < 0 ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {p.changePercent > 0 ? "+" : ""}{p.changePercent}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeywordPanel({ keywords, t }: { keywords: DBTrendingKeyword[]; t: (en: string, ko: string) => string }) {
  const positive = keywords.filter((k) => k.sentiment === "positive");
  const negative = keywords.filter((k) => k.sentiment === "negative" || k.sentiment === "neutral");

  if (keywords.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        {t("No keyword data yet for this channel", "이 채널에 대한 키워드 데이터가 아직 없습니다")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ThumbsUp className="h-4 w-4 text-green-600" />
          <h4 className="text-sm font-semibold text-green-800">{t("Positive Keywords", "긍정 키워드")}</h4>
        </div>
        <div className="space-y-2">
          {positive.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("No data yet", "데이터 없음")}</p>
          ) : positive.map((kw) => (
            <div key={kw.keyword} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm shrink-0">{kw.keyword}</span>
                {kw.relatedProducts && kw.relatedProducts.length > 0 && (
                  <span className="text-[10px] text-green-600/70 truncate">
                    ({kw.relatedProducts.join(", ")})
                  </span>
                )}
                {kw.change > 20 && <ArrowUpRight className="h-3 w-3 text-green-600 shrink-0" />}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((kw.count / Math.max(...keywords.map(k => k.count), 1)) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-mono text-green-700 w-12 text-right">{kw.count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ThumbsDown className="h-4 w-4 text-red-500" />
          <h4 className="text-sm font-semibold text-red-800">{t("Negative Keywords", "부정 키워드")}</h4>
        </div>
        <div className="space-y-2.5">
          {negative.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("No data yet", "데이터 없음")}</p>
          ) : negative.map((kw) => (
            <div key={kw.keyword} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm shrink-0">{kw.keyword}</span>
                  {kw.relatedProducts && kw.relatedProducts.length > 0 && (
                    <span className="text-[10px] text-red-500/70 truncate">
                      ({kw.relatedProducts.join(", ")})
                    </span>
                  )}
                  {kw.change > 20 && <ArrowDownRight className="h-3 w-3 text-red-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-red-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((kw.count / Math.max(...keywords.map(k => k.count), 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs font-mono text-red-700 w-12 text-right">{kw.count.toLocaleString()}</span>
                </div>
              </div>
              {kw.relatedCountries && kw.relatedCountries.length > 0 && (
                <div className="flex items-center gap-1 ml-0.5">
                  <span className="text-[10px] text-red-400/80 font-medium">
                    {t("Mentioned in:", "언급 국가:")} {kw.relatedCountries.join(", ")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SourceTabConfig {
  value: string;
  label: string;
  icon: React.ReactNode;
  emoji: string;
}

const SOURCE_TABS: SourceTabConfig[] = [
  { value: "reddit", label: "Reddit", icon: <MessageSquare className="h-4 w-4" />, emoji: "🔥" },
  { value: "amazon", label: "Amazon", icon: <ShoppingCart className="h-4 w-4" />, emoji: "🔥" },
  { value: "rtings", label: "RTINGS", icon: <Monitor className="h-4 w-4" />, emoji: "📊" },
  { value: "trusted_reviews", label: "Trusted Reviews", icon: <Star className="h-4 w-4" />, emoji: "⭐" },
  { value: "consumer_reports", label: "Consumer Reports", icon: <Shield className="h-4 w-4" />, emoji: "🛡️" },
  { value: "cnet", label: "CNET", icon: <Tv className="h-4 w-4" />, emoji: "📡" },
  { value: "trustpilot", label: "Trustpilot", icon: <Award className="h-4 w-4" />, emoji: "💬" },
  { value: "bestreviews", label: "BestReviews", icon: <BarChart3 className="h-4 w-4" />, emoji: "🏆" },
];

function SourceTabContent({ source, onProductClick, t }: { source: SourceTabConfig; onProductClick?: (m: string) => void; t: (en: string, ko: string) => string }) {
  const { data: products = [], isLoading: productsLoading } = useTrendingProducts(source.value);
  const { data: keywords = [], isLoading: keywordsLoading } = useTrendingKeywords(source.value);

  if (productsLoading || keywordsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          {source.emoji} {source.label} {t(`Mentions TOP ${Math.max(products.length, 10)}`, `언급량 TOP ${Math.max(products.length, 10)}`)}
        </h3>
        <ProductTable products={products} onProductClick={onProductClick} t={t} />
      </div>
      <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          💬 {source.label} {t("Key Positive & Negative Keywords", "주요 긍·부정 키워드")}
        </h3>
        <KeywordPanel keywords={keywords} t={t} />
      </div>
    </div>
  );
}

export function TrendingDashboard({ onProductClick }: TrendingDashboardProps) {
  const { t } = useLang();
  const { data: allTrendingProducts = [], isLoading } = useTrendingProducts();
  const { data: allKeywords = [] } = useTrendingKeywords();
  const { data: stats } = useProductStats();

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

  const totalMentions = allTrendingProducts.reduce((sum, p) => sum + p.mentions, 0);
  const avgSentiment = allTrendingProducts.length > 0
    ? Math.round(allTrendingProducts.reduce((sum, p) => sum + p.sentimentScore, 0) / allTrendingProducts.length)
    : 0;
  const top3 = allTrendingProducts.slice(0, 3);
  const risingProduct = [...allTrendingProducts].sort((a, b) => b.changePercent - a.changePercent).find(p => p.changePercent > 0);

  const posKeywords = allKeywords.filter(k => k.sentiment === "positive").slice(0, 3);
  const negKeywords = allKeywords.filter(k => k.sentiment === "negative").slice(0, 3);

  const formatKwList = (kws: DBTrendingKeyword[]) =>
    kws.map(kw => {
      const prods = kw.relatedProducts?.length ? ` (${kw.relatedProducts.join(", ")})` : "";
      return `"${kw.keyword}"${prods}`;
    }).join(", ");

  const collectionStatusLine = lastSyncLabel
    ? t(
        `🔄 Last synced: ${lastSyncLabel} (${lastCollection?.items_collected ?? 0} items collected, status: ${lastCollection?.status ?? "unknown"})`,
        `🔄 마지막 동기화: ${lastSyncLabel} (${lastCollection?.items_collected ?? 0}건 수집, 상태: ${lastCollection?.status === "completed" ? "완료" : lastCollection?.status === "running" ? "수집중" : lastCollection?.status ?? "알 수 없음"})`
      )
    : t(
        "🔄 No collection has been run yet.",
        "🔄 아직 수집이 실행되지 않았습니다."
      );

  const insights = totalMentions > 0 ? [
    collectionStatusLine,
    t(
      `📊 A total of ${totalMentions.toLocaleString()} product mentions were collected across ${SOURCE_TABS.length} channels, with an average sentiment score of ${avgSentiment}.`,
      `📊 전체 ${SOURCE_TABS.length}개 채널에서 총 ${totalMentions.toLocaleString()}건의 제품 언급이 수집되었으며, 평균 감성점수는 ${avgSentiment}점입니다.`
    ),
    top3.length > 0 ? t(
      `🏆 Weekly Mentions TOP 3: ${top3.map((p, i) => `#${i + 1} ${p.displayName} (${p.mentions.toLocaleString()})`).join(", ")}`,
      `🏆 주간 언급량 TOP 3: ${top3.map((p, i) => `${i + 1}위 ${p.displayName} (${p.mentions.toLocaleString()}건)`).join(", ")}`
    ) : "",
    risingProduct ? t(
      `🚀 Fastest Rising Product: ${risingProduct.displayName} (weekly change +${risingProduct.changePercent}%)`,
      `🚀 가장 급상승 제품: ${risingProduct.displayName} (주간 변동 +${risingProduct.changePercent}%)`
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

      <Tabs defaultValue="amazon" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {SOURCE_TABS.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.label.split(" ")[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {SOURCE_TABS.map((s) => (
          <TabsContent key={s.value} value={s.value} className="space-y-6 mt-4">
            <SourceTabContent source={s} onProductClick={onProductClick} t={t} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
