import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, ExternalLink, MessageSquare, ShoppingCart, ThumbsUp, ThumbsDown, BarChart3, ArrowUpRight, ArrowDownRight, Monitor, Tv, Star, Shield, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  redditTrending, amazonTrending,
  redditKeywords, amazonKeywords,
  rtingsTrending, rtingsKeywords,
  trustedReviewsTrending, trustedReviewsKeywords,
  consumerReportsTrending, consumerReportsKeywords,
  cnetTrending, cnetKeywords,
  trustpilotTrending, trustpilotKeywords,
  bestreviewsTrending, bestreviewsKeywords,
  type TrendingProduct, type TrendingKeyword,
} from "@/data/trendingData";

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

function ProductTable({ products, onProductClick }: { products: TrendingProduct[]; onProductClick?: (m: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium w-8">#</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium">제품</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">카테고리</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">언급수</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">감성점수</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">변동</th>
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

function KeywordPanel({ keywords }: { keywords: TrendingKeyword[] }) {
  const positive = keywords.filter((k) => k.sentiment === "positive");
  const negative = keywords.filter((k) => k.sentiment === "negative");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ThumbsUp className="h-4 w-4 text-green-600" />
          <h4 className="text-sm font-semibold text-green-800">긍정 키워드</h4>
        </div>
        <div className="space-y-2">
          {positive.map((kw) => (
            <div key={kw.keyword} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{kw.keyword}</span>
                {kw.change > 20 && <ArrowUpRight className="h-3 w-3 text-green-600" />}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((kw.count / 3500) * 100, 100)}%` }} />
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
          <h4 className="text-sm font-semibold text-red-800">부정 키워드</h4>
        </div>
        <div className="space-y-2">
          {negative.map((kw) => (
            <div key={kw.keyword} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{kw.keyword}</span>
                {kw.change > 20 && <ArrowDownRight className="h-3 w-3 text-red-500" />}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-red-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((kw.count / 3500) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-mono text-red-700 w-12 text-right">{kw.count.toLocaleString()}</span>
              </div>
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
  products: TrendingProduct[];
  keywords: TrendingKeyword[];
  emoji: string;
}

export function TrendingDashboard({ onProductClick }: TrendingDashboardProps) {
  const sources: SourceTabConfig[] = [
    { value: "reddit", label: "Reddit", icon: <MessageSquare className="h-4 w-4" />, products: redditTrending, keywords: redditKeywords, emoji: "🔥" },
    { value: "amazon", label: "Amazon", icon: <ShoppingCart className="h-4 w-4" />, products: amazonTrending, keywords: amazonKeywords, emoji: "🔥" },
    { value: "rtings", label: "RTINGS", icon: <Monitor className="h-4 w-4" />, products: rtingsTrending, keywords: rtingsKeywords, emoji: "📊" },
    { value: "trusted_reviews", label: "Trusted Reviews", icon: <Star className="h-4 w-4" />, products: trustedReviewsTrending, keywords: trustedReviewsKeywords, emoji: "⭐" },
    { value: "consumer_reports", label: "Consumer Reports", icon: <Shield className="h-4 w-4" />, products: consumerReportsTrending, keywords: consumerReportsKeywords, emoji: "🛡️" },
    { value: "cnet", label: "CNET", icon: <Tv className="h-4 w-4" />, products: cnetTrending, keywords: cnetKeywords, emoji: "📡" },
    { value: "trustpilot", label: "Trustpilot", icon: <Award className="h-4 w-4" />, products: trustpilotTrending, keywords: trustpilotKeywords, emoji: "💬" },
    { value: "bestreviews", label: "BestReviews", icon: <BarChart3 className="h-4 w-4" />, products: bestreviewsTrending, keywords: bestreviewsKeywords, emoji: "🏆" },
  ];

  const allProducts = useMemo(() => {
    const merged = new Map<string, { displayName: string; category: string; totalMentions: number; avgSentiment: number; sourceCount: number; maxChange: number }>();
    sources.forEach((s) => {
      s.products.forEach((p) => {
        const existing = merged.get(p.modelNumber);
        if (existing) {
          existing.totalMentions += p.mentions;
          existing.avgSentiment = (existing.avgSentiment * existing.sourceCount + p.sentimentScore) / (existing.sourceCount + 1);
          existing.sourceCount += 1;
          if (Math.abs(p.changePercent) > Math.abs(existing.maxChange)) existing.maxChange = p.changePercent;
        } else {
          merged.set(p.modelNumber, { displayName: p.displayName, category: p.category, totalMentions: p.mentions, avgSentiment: p.sentimentScore, sourceCount: 1, maxChange: p.changePercent });
        }
      });
    });
    return [...merged.entries()].sort((a, b) => b[1].totalMentions - a[1].totalMentions);
  }, []);

  // keyword → associated top products (from same source)
  const keywordProductMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    sources.forEach((s) => {
      const topProduct = s.products[0]; // top product per source
      if (!topProduct) return;
      s.keywords.forEach((k) => {
        if (!map.has(k.keyword)) map.set(k.keyword, new Map());
        const prodMap = map.get(k.keyword)!;
        // weight by keyword count
        prodMap.set(topProduct.displayName, (prodMap.get(topProduct.displayName) || 0) + k.count);
        // also associate rank 2 product if exists
        if (s.products[1]) {
          prodMap.set(s.products[1].displayName, (prodMap.get(s.products[1].displayName) || 0) + Math.round(k.count * 0.5));
        }
      });
    });
    // resolve to top 2 products per keyword
    const result = new Map<string, string[]>();
    map.forEach((prodMap, keyword) => {
      const sorted = [...prodMap.entries()].sort((a, b) => b[1] - a[1]);
      result.set(keyword, sorted.slice(0, 2).map(([name]) => name));
    });
    return result;
  }, []);

  const allKeywords = useMemo(() => {
    const merged = new Map<string, { count: number; sentiment: "positive" | "negative"; change: number }>();
    sources.forEach((s) => {
      s.keywords.forEach((k) => {
        const existing = merged.get(k.keyword);
        if (existing) {
          existing.count += k.count;
          existing.change = Math.max(existing.change, k.change);
        } else {
          merged.set(k.keyword, { ...k });
        }
      });
    });
    return [...merged.entries()].sort((a, b) => b[1].count - a[1].count);
  }, []);

  const top3 = allProducts.slice(0, 3);
  const risingProduct = allProducts.filter(([, v]) => v.maxChange > 0).sort((a, b) => b[1].maxChange - a[1].maxChange)[0];
  const topPosKeywords = allKeywords.filter(([, v]) => v.sentiment === "positive").slice(0, 3);
  const topNegKeywords = allKeywords.filter(([, v]) => v.sentiment === "negative").slice(0, 3);
  const totalMentions = allProducts.reduce((sum, [, v]) => sum + v.totalMentions, 0);
  const avgSentiment = Math.round(allProducts.reduce((sum, [, v]) => sum + v.avgSentiment, 0) / allProducts.length);

  const formatKwWithProducts = (kws: [string, { count: number }][]) =>
    kws.map(([kw]) => {
      const prods = keywordProductMap.get(kw);
      return prods?.length ? `"${kw}" (${prods.join(", ")})` : `"${kw}"`;
    }).join(", ");

  const insights = [
    `📊 전체 ${sources.length}개 채널에서 총 ${totalMentions.toLocaleString()}건의 제품 언급이 수집되었으며, 평균 감성점수는 ${avgSentiment}점입니다.`,
    `🏆 주간 언급량 TOP 3: ${top3.map(([, v], i) => `${i + 1}위 ${v.displayName} (${v.totalMentions.toLocaleString()}건)`).join(", ")}`,
    risingProduct ? `🚀 가장 급상승 제품: ${risingProduct[1].displayName} (주간 변동 +${risingProduct[1].maxChange}%) — 신규 출시 및 전문 리뷰 확산 영향` : "",
    `👍 긍정 키워드 TOP 3: ${formatKwWithProducts(topPosKeywords)} — 화질·가성비·편의성 중심의 호평이 지속되고 있습니다.`,
    `⚠️ 부정 키워드 TOP 3: ${formatKwWithProducts(topNegKeywords)} — CS 응대 및 소프트웨어 개선이 필요한 것으로 분석됩니다.`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold font-heading">📡 실시간 트렌딩 대시보드</h2>
        <Badge variant="secondary" className="text-xs">
          Live · 주간 집계
        </Badge>
      </div>

      {/* 전채널 트렌드 요약 인사이트 */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">📋 전채널 주간 트렌드 인사이트 리포트</h3>
        </div>
        {insights.map((line, i) => (
          <p key={i} className="text-sm text-foreground/85 leading-relaxed">{line}</p>
        ))}
      </div>

      <Tabs defaultValue="reddit" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {sources.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.label.split(" ")[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {sources.map((s) => (
          <TabsContent key={s.value} value={s.value} className="space-y-6 mt-4">
            <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                {s.emoji} {s.label} 언급량 TOP {s.products.length}
              </h3>
              <ProductTable products={s.products} onProductClick={onProductClick} />
            </div>
            <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                💬 {s.label} 주요 긍·부정 키워드
              </h3>
              <KeywordPanel keywords={s.keywords} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
