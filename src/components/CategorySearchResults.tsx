import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, MessageSquare, ArrowUpDown } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import type { AnalyzedProduct } from "@/components/SearchResultCards";
import { CategoryHubCard } from "@/components/CategoryHubCard";
import { MarketingAssetStudio } from "@/components/MarketingAssetStudio";
import { resolveCategoryMeta, getCategoryLabel, GROUP_ORDER } from "@/data/categoryMap";
import { SentimentChart } from "./SentimentChart";
import { KeywordCloud } from "./KeywordCloud";
import { ReviewList } from "./ReviewList";
import { MarketingHub } from "./MarketingHub";

interface CategorySearchResultsProps {
  results: AnalyzedProduct[];
  searchQuery: string;
  selectedCountry: string;
}

type SortMode = "reviews" | "sentiment" | "name";

function sentimentScoreColor(score: number) {
  if (score >= 80) return "border-[#15803D] text-[#15803D] bg-[#15803D]/10";
  if (score >= 60) return "border-amber-500 text-amber-600 bg-amber-500/10";
  return "border-red-500 text-red-600 bg-red-500/10";
}

function sentimentPillColor(score: number) {
  if (score >= 80) return "bg-[#15803D] text-white";
  if (score >= 60) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}

/** Get source distribution for a product */
function getSourceDist(reviews: { source?: string }[]) {
  const counts: Record<string, number> = {};
  for (const r of reviews) {
    const s = r.source || "";
    const key = s.startsWith("reddit") ? "Reddit"
      : s.startsWith("youtube") ? "YouTube"
      : s.startsWith("lge_com") ? "LG.com"
      : s.startsWith("amazon") ? "Amazon"
      : s.startsWith("bestbuy") ? "BestBuy"
      : s || "Other";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/** Mini sentiment bar */
function MiniSentimentBar({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  const total = positive + negative + neutral;
  if (total === 0) return null;
  const pPct = Math.round((positive / total) * 100);
  const nPct = Math.round((negative / total) * 100);
  const neuPct = 100 - pPct - nPct;
  return (
    <div className="space-y-0.5">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        <div className="bg-[#15803D]" style={{ width: `${pPct}%` }} />
        <div className="bg-gray-400" style={{ width: `${neuPct}%` }} />
        <div className="bg-red-500" style={{ width: `${nPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>👍{pPct}%</span>
        <span>👎{nPct}%</span>
      </div>
    </div>
  );
}

/** Expanded product detail */
function ProductDetail({ item }: { item: AnalyzedProduct }) {
  const sources = getSourceDist(item.product.reviews);
  const positivePoints = (item.sentiment.keywords.positive || []).slice(0, 5);
  const negativePoints = (item.sentiment.keywords.negative || []).slice(0, 5);

  // Best review quote
  const bestQuote = item.sentiment.topPositivePhrase || item.sentiment.topNegativePhrase;

  // Marketing action
  const negPct = item.sentiment.positive + item.sentiment.negative + item.sentiment.neutral > 0
    ? Math.round((item.sentiment.negative / (item.sentiment.positive + item.sentiment.negative + item.sentiment.neutral)) * 100)
    : 0;
  const actionText = negPct > 30
    ? `부정 비율 ${negPct}%로 높음. 주요 이슈 대응 콘텐츠 제작 필요.`
    : `긍정 비율이 높음. UGC 활용 및 소셜 확산 전략 추천.`;

  return (
    <div className="px-4 pb-4 space-y-4 animate-slide-up">
      {/* Best Quote */}
      {bestQuote && (
        <p className="text-xs italic text-muted-foreground border-l-3 border-primary/40 pl-3 py-1">
          "{bestQuote}"
        </p>
      )}

      {/* Two-column: Positive + Negative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-[#15803D]/20 bg-[#15803D]/5 space-y-2">
          <p className="text-[11px] font-bold text-[#15803D]">✓ 긍정 포인트</p>
          {positivePoints.length > 0 ? positivePoints.map(word => (
            <div key={word} className="text-[11px] text-foreground flex items-center gap-1.5">
              <span className="text-[#15803D]">✓</span> {word}
            </div>
          )) : <p className="text-[10px] text-muted-foreground">데이터 부족</p>}
        </div>
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-2">
          <p className="text-[11px] font-bold text-red-600">✕ 부정 이슈</p>
          {negativePoints.length > 0 ? negativePoints.map(word => (
            <div key={word} className="text-[11px] text-foreground flex items-center gap-1.5">
              <span className="text-red-500">✕</span> {word}
            </div>
          )) : <p className="text-[10px] text-muted-foreground">데이터 부족</p>}
        </div>
      </div>

      {/* Source pills */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(sources).sort(([,a],[,b]) => b - a).map(([src, cnt]) => (
          <Badge key={src} variant="secondary" className="text-[10px] font-normal">
            {src} {cnt}건
          </Badge>
        ))}
      </div>

      {/* Marketing Action */}
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-300/50">
        <p className="text-[11px] font-bold text-amber-800">🎯 마케팅 액션</p>
        <p className="text-[11px] text-amber-900 mt-1">{actionText}</p>
      </div>

      {/* Full detail sections */}
      <div className="space-y-4 pt-2 border-t border-border">
        <KeywordCloud keywords={item.sentiment.keywords} signals={item.sentiment.signals} />
        <SentimentChart sentiment={item.sentiment} />
        {item.product.reviews.length > 0 && (
          <MarketingHub
            geoMessages={item.geoMessages}
            productName={item.product.name}
            displayName={item.product.displayName}
            totalReviews={item.product.reviews.length}
            marketing={item.marketing}
            sentiment={item.sentiment}
            reviews={item.product.reviews}
          />
        )}
        <div className="rounded-2xl bg-gradient-to-br from-secondary/30 via-muted/40 to-secondary/20 border border-border/60 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-1 h-5 rounded-full bg-muted-foreground/50" />
            <h3 className="text-sm font-bold text-muted-foreground">💬 실고객 리뷰</h3>
          </div>
          <ReviewList reviews={item.product.reviews} />
        </div>
      </div>
    </div>
  );
}

export function CategorySearchResults({ results, searchQuery, selectedCountry }: CategorySearchResultsProps) {
  const { t } = useLang();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("reviews");
  const [showAll, setShowAll] = useState(false);

  // Group products by resolved category label
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, { meta: ReturnType<typeof resolveCategoryMeta>; products: AnalyzedProduct[] }>();

    for (const item of results) {
      const label = getCategoryLabel(item.product.category, item.product.subCategory);
      const meta = resolveCategoryMeta(item.product.category, item.product.subCategory);

      if (!groups.has(label)) {
        groups.set(label, { meta, products: [] });
      }
      groups.get(label)!.products.push(item);
    }

    // Sort groups by GROUP_ORDER
    const sorted = Array.from(groups.entries()).sort(([_aLabel, aData], [_bLabel, bData]) => {
      const aIdx = GROUP_ORDER.indexOf(aData.meta.group);
      const bIdx = GROUP_ORDER.indexOf(bData.meta.group);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });

    return sorted;
  }, [results]);

  // Auto-select first category
  const effectiveCategory = activeCategory || categoryGroups[0]?.[0] || null;
  const activeGroup = categoryGroups.find(([label]) => label === effectiveCategory);
  const activeProducts = activeGroup?.[1].products || [];
  const activeMeta = activeGroup?.[1].meta || { group: "Other", icon: "📦", color: "#6B7280", bgColor: "#F9FAFB" };

  // Sort products
  const sortedProducts = useMemo(() => {
    const sorted = [...activeProducts];
    if (sortMode === "reviews") sorted.sort((a, b) => b.product.reviews.length - a.product.reviews.length);
    else if (sortMode === "sentiment") sorted.sort((a, b) => b.sentiment.compositeScore - a.sentiment.compositeScore);
    else sorted.sort((a, b) => a.product.displayName.localeCompare(b.product.displayName));
    return sorted;
  }, [activeProducts, sortMode]);

  const visibleProducts = showAll ? sortedProducts : sortedProducts.slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold">
          📊 <span className="text-primary">"{searchQuery}"</span> {t("Search Results", "검색 결과")}
        </h2>
        <Badge variant="secondary" className="text-xs">
          {results.length}{t(" products", "개 제품")}
        </Badge>
        {selectedCountry !== "all" && (
          <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
            🌐 {selectedCountry}
          </Badge>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categoryGroups.map(([label, { meta, products: prods }]) => {
          const totalReviews = prods.reduce((s, p) => s + p.product.reviews.length, 0);
          const avgScore = prods.length > 0
            ? Math.round(prods.reduce((s, p) => s + p.sentiment.compositeScore, 0) / prods.length)
            : 0;
          const isActive = label === effectiveCategory;

          return (
            <button
              key={label}
              onClick={() => {
                setActiveCategory(label);
                setExpandedProduct(null);
                setShowAll(false);
              }}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-left ${
                isActive
                  ? "border-2 shadow-md"
                  : "border-border hover:border-primary/30 bg-card"
              }`}
              style={isActive ? { borderColor: meta.color, backgroundColor: meta.bgColor } : undefined}
            >
              <span className="text-lg">{meta.icon}</span>
              <div>
                <p className={`text-xs font-bold ${isActive ? "" : "text-foreground"}`} style={isActive ? { color: meta.color } : undefined}>
                  {label}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{prods.length}개 제품</span>
                  <span className="text-[10px] text-muted-foreground">{totalReviews}건</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${sentimentPillColor(avgScore)}`}>
                    {avgScore}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      {effectiveCategory && activeGroup && (
        <>
        <div className="flex flex-col lg:flex-row gap-5">
          {/* LEFT: Category Hub Card */}
          <CategoryHubCard
            categoryLabel={effectiveCategory}
            meta={activeMeta}
            products={activeProducts}
          />

          {/* RIGHT: Product List */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Product List Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                {activeMeta.icon} {effectiveCategory} 제품 리스트
                <Badge variant="secondary" className="text-[10px]">{activeProducts.length}개</Badge>
              </h3>
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="text-[11px] border border-border rounded-md px-2 py-1 bg-background text-foreground"
                >
                  <option value="reviews">리뷰 많은 순</option>
                  <option value="sentiment">감성 높은 순</option>
                  <option value="name">이름순</option>
                </select>
              </div>
            </div>

            {/* Product Rows */}
            <div className="space-y-1">
              {visibleProducts.map((item, idx) => {
                const cs = item.sentiment.compositeScore;
                const isExpanded = expandedProduct === item.product.name;
                const rank = idx + 1;

                return (
                  <div key={item.product.name} className="border border-border rounded-lg bg-card overflow-hidden transition-all">
                    {/* Row */}
                    <button
                      onClick={() => setExpandedProduct(isExpanded ? null : item.product.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      {/* Rank */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          rank <= 3 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {rank}
                      </div>

                      {/* Name + model + tags */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{item.product.displayName}</p>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">{item.product.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5" style={{ borderColor: activeMeta.color + "40", color: activeMeta.color }}>
                            {item.product.category}
                          </Badge>
                          {item.product.subCategory && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-accent/50">
                              {item.product.subCategory}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Right side: score + review count + chevron */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{item.product.reviews.length}건</span>
                        </div>
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${sentimentScoreColor(cs)}`}>
                          {cs}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Thin sentiment bar */}
                    <div className="px-4 pb-2">
                      <MiniSentimentBar
                        positive={item.sentiment.positive}
                        negative={item.sentiment.negative}
                        neutral={item.sentiment.neutral}
                      />
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && <ProductDetail item={item} />}
                  </div>
                );
              })}
            </div>

            {/* Show More */}
            {!showAll && sortedProducts.length > 10 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-3 text-center text-sm font-medium text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors"
              >
                더보기 ({sortedProducts.length - 10}개 더)
              </button>
            )}
          </div>
        </div>

        {/* Marketing Asset Studio — below the hub */}
        {(() => {
          // Compute aggregated stats for studio
          let totalR = 0, totalP = 0, totalN = 0, totalNeu = 0, scoreSum = 0;
          const posThemes: Record<string, number> = {};
          const negThemes: Record<string, number> = {};
          let bestQuote = "";
          const srcCounts: Record<string, number> = {};

          for (const p of activeProducts) {
            totalR += p.product.reviews.length;
            totalP += p.sentiment.positive;
            totalN += p.sentiment.negative;
            totalNeu += p.sentiment.neutral;
            scoreSum += p.sentiment.compositeScore;
            if (!bestQuote && p.sentiment.topPositivePhrase) bestQuote = p.sentiment.topPositivePhrase;
            for (const w of p.sentiment.keywords.positive || []) posThemes[w] = (posThemes[w] || 0) + 1;
            for (const w of p.sentiment.keywords.negative || []) negThemes[w] = (negThemes[w] || 0) + 1;
            for (const r of p.product.reviews) {
              const key = r.source?.startsWith("reddit") ? "Reddit"
                : r.source?.startsWith("youtube") ? "YouTube"
                : r.source?.startsWith("lge_com") ? "LG.com"
                : r.source?.startsWith("amazon") ? "Amazon"
                : r.source?.startsWith("bestbuy") ? "BestBuy"
                : r.source || "Other";
              srcCounts[key] = (srcCounts[key] || 0) + 1;
            }
          }

          const total = totalP + totalN + totalNeu;
          const posPct = total > 0 ? Math.round((totalP / total) * 100) : 0;
          const negPct = total > 0 ? Math.round((totalN / total) * 100) : 0;
          const avgScore = activeProducts.length > 0 ? Math.round(scoreSum / activeProducts.length) : 0;
          const topPos = Object.entries(posThemes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
          const topNeg = Object.entries(negThemes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([w]) => w);

          return (
            <MarketingAssetStudio
              categoryName={effectiveCategory}
              sentimentScore={avgScore}
              positivePct={posPct}
              negativePct={negPct}
              totalReviews={totalR}
              topPositivePoints={topPos}
              topNegativePoints={topNeg}
              bestReviewQuote={bestQuote}
              sources={srcCounts}
            />
          );
        })()}
      )}
    </div>
  );
}
