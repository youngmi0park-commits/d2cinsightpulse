import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { AnalyzedProduct } from "@/components/SearchResultCards";
import type { CategoryMeta } from "@/data/categoryMap";

interface CategoryHubCardProps {
  categoryLabel: string;
  meta: CategoryMeta;
  products: AnalyzedProduct[];
}

function sentimentColor(score: number) {
  if (score >= 80) return { text: "text-[#15803D]", bg: "bg-[#15803D]" };
  if (score >= 60) return { text: "text-amber-600", bg: "bg-amber-500" };
  return { text: "text-red-600", bg: "bg-red-500" };
}

function getSourceDistribution(products: AnalyzedProduct[]) {
  const counts: Record<string, number> = {};
  for (const p of products) {
    for (const r of p.product.reviews) {
      const key = r.source?.startsWith("reddit") ? "Reddit"
        : r.source?.startsWith("youtube") ? "YouTube"
        : r.source?.startsWith("lge_com") ? "LG.com"
        : r.source?.startsWith("amazon") ? "Amazon"
        : r.source?.startsWith("bestbuy") ? "BestBuy"
        : r.source || "Other";
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

export function CategoryHubCard({ categoryLabel, meta, products }: CategoryHubCardProps) {
  const stats = useMemo(() => {
    let totalReviews = 0;
    let totalPositive = 0;
    let totalNegative = 0;
    let totalNeutral = 0;
    let scoreSum = 0;

    const positiveThemes: Record<string, number> = {};
    const negativeThemes: Record<string, number> = {};

    for (const p of products) {
      totalReviews += p.product.reviews.length;
      totalPositive += p.sentiment.positive;
      totalNegative += p.sentiment.negative;
      totalNeutral += p.sentiment.neutral;
      scoreSum += p.sentiment.compositeScore;

      // Aggregate keyword themes
      for (const kw of p.sentiment.keywords) {
        if (kw.sentiment === "positive") {
          positiveThemes[kw.word] = (positiveThemes[kw.word] || 0) + kw.count;
        } else if (kw.sentiment === "negative") {
          negativeThemes[kw.word] = (negativeThemes[kw.word] || 0) + kw.count;
        }
      }
    }

    const avgScore = products.length > 0 ? Math.round(scoreSum / products.length) : 0;
    const total = totalPositive + totalNegative + totalNeutral;
    const posPct = total > 0 ? Math.round((totalPositive / total) * 100) : 0;
    const negPct = total > 0 ? Math.round((totalNegative / total) * 100) : 0;
    const neuPct = total > 0 ? 100 - posPct - negPct : 0;

    const topPositive = Object.entries(positiveThemes).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topNegative = Object.entries(negativeThemes).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { totalReviews, avgScore, posPct, negPct, neuPct, topPositive, topNegative };
  }, [products]);

  const sources = useMemo(() => getSourceDistribution(products), [products]);
  const sc = sentimentColor(stats.avgScore);

  // Collect unique sub-categories
  const subCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.product.subCategory) set.add(p.product.subCategory);
    }
    return Array.from(set).slice(0, 6);
  }, [products]);

  // Generate marketing action signal
  const actionSignal = useMemo(() => {
    if (stats.negPct > 30) {
      const topIssue = stats.topNegative[0]?.[0] || "품질";
      return `"${topIssue}" 관련 부정 비율 ${stats.negPct}%로 높음. 해당 이슈 대응 콘텐츠 제작 및 PDP 개선 검토 필요.`;
    }
    if (stats.posPct > 70) {
      const topPraise = stats.topPositive[0]?.[0] || "성능";
      return `긍정 비율 ${stats.posPct}%로 높음. "${topPraise}" 중심 UGC 활용 및 소셜 캠페인 추천.`;
    }
    return `긍정 ${stats.posPct}% / 부정 ${stats.negPct}% 혼재. A/B 테스트 기반 메시지 최적화 권장.`;
  }, [stats]);

  return (
    <div className="w-full lg:w-[300px] shrink-0 rounded-xl border border-border overflow-hidden sticky top-4">
      {/* Dark Header */}
      <div className="p-4 text-white" style={{ backgroundColor: meta.color }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{meta.icon}</span>
          <h3 className="text-lg font-extrabold leading-tight">{categoryLabel}</h3>
        </div>
        {subCategories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {subCategories.map((sc) => (
              <span key={sc} className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">{sc}</span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="p-4 space-y-4" style={{ backgroundColor: meta.bgColor }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-lg bg-white/70 border border-border/50">
            <p className="text-[10px] text-muted-foreground">Sentiment</p>
            <p className={`text-xl font-bold ${sc.text}`}>{stats.avgScore}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/70 border border-border/50">
            <p className="text-[10px] text-muted-foreground">총 리뷰</p>
            <p className="text-xl font-bold text-foreground">{stats.totalReviews.toLocaleString()}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/70 border border-border/50">
            <p className="text-[10px] text-muted-foreground">긍정 비율</p>
            <p className="text-xl font-bold text-[#15803D]">{stats.posPct}%</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/70 border border-border/50">
            <p className="text-[10px] text-muted-foreground">부정 비율</p>
            <p className="text-xl font-bold text-red-600">{stats.negPct}%</p>
          </div>
        </div>

        {/* Stacked Bar */}
        <div className="space-y-1">
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-[#15803D] transition-all" style={{ width: `${stats.posPct}%` }} />
            <div className="bg-gray-400 transition-all" style={{ width: `${stats.neuPct}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${stats.negPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>👍 {stats.posPct}%</span>
            <span>➖ {stats.neuPct}%</span>
            <span>👎 {stats.negPct}%</span>
          </div>
        </div>

        {/* Top Positive */}
        {stats.topPositive.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-[#15803D]">✅ 카테고리 TOP 긍정 포인트</p>
            {stats.topPositive.map(([word, count]) => (
              <div key={word} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-white/70 border border-[#15803D]/15">
                <span className="text-foreground">✓ {word}</span>
                <span className="text-muted-foreground">{count}건</span>
              </div>
            ))}
          </div>
        )}

        {/* Top Negative */}
        {stats.topNegative.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-red-600">⚠️ 반복 부정 이슈</p>
            {stats.topNegative.map(([word, count]) => (
              <div key={word} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-white/70 border border-red-500/15">
                <span className="text-foreground">✕ {word}</span>
                <span className="text-muted-foreground">{count}건</span>
              </div>
            ))}
          </div>
        )}

        {/* Marketing Action Signal */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-300/50 space-y-1">
          <p className="text-[11px] font-bold text-amber-800">🎯 마케팅 액션 시그널</p>
          <p className="text-[11px] text-amber-900 leading-relaxed">{actionSignal}</p>
        </div>

        {/* Source Pills */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(sources).sort(([,a],[,b]) => b - a).map(([src, cnt]) => (
            <Badge key={src} variant="secondary" className="text-[10px] font-normal">
              {src} {cnt}건
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
