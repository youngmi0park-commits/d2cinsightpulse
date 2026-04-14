import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, MessageSquare, AlertTriangle, Swords } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import type { SentimentResult } from "@/lib/sentiment";
import type { MarketingOutput } from "@/lib/formatMessage";
import type { GeoMessage } from "@/lib/formatMessage";
import type { ProductData } from "@/data/dummyData";
import { MarketingHub } from "./MarketingHub";
import { ReviewList } from "./ReviewList";
import { isAllPrivacyRestricted, isPrivacyRestricted } from "@/lib/reviewUtils";
import { UnifiedInsightPanel } from "@/components/UnifiedInsightPanel";


export interface AnalyzedProduct {
  product: ProductData;
  sentiment: SentimentResult;
  marketing: MarketingOutput;
  geoMessages: GeoMessage[];
}

interface SearchResultCardsProps {
  results: AnalyzedProduct[];
}

/** Count reviews per source channel */
function getSourceDistribution(reviews: { source: string }[]) {
  const counts: Record<string, number> = {};
  for (const r of reviews) {
    const key = r.source.startsWith("reddit") ? "Reddit"
      : r.source.startsWith("youtube") ? "YouTube"
      : r.source.startsWith("lge_com") ? "LG.com"
      : r.source.startsWith("amazon") ? "Amazon"
      : r.source.startsWith("bestbuy") ? "BestBuy"
      : r.source;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/** Composite score color */
function scoreColor(score: number): string {
  if (score >= 76) return "text-[#006600]";
  if (score >= 56) return "text-primary";
  if (score >= 31) return "text-amber-600";
  return "text-destructive";
}
function scoreBg(score: number): string {
  if (score >= 76) return "bg-[#006600]/10 border-[#006600]/20";
  if (score >= 56) return "bg-primary/10 border-primary/20";
  if (score >= 31) return "bg-amber-500/10 border-amber-500/20";
  return "bg-destructive/10 border-destructive/20";
}
function scoreLabel(score: number, t: (en: string, ko: string) => string): string {
  if (score >= 76) return t("Strongly Positive", "매우 긍정");
  if (score >= 56) return t("Positive", "긍정");
  if (score >= 31) return t("Mixed", "복합");
  return t("Negative", "부정");
}

function SentimentMiniBar({ sentiment }: { sentiment: SentimentResult }) {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  if (total === 0) return null;
  const pPct = Math.round((sentiment.positive / total) * 100);
  const mixPct = Math.round((sentiment.neutral / total) * 100);
  const nPct = Math.round((sentiment.negative / total) * 100);

  return (
    <div className="space-y-1">
      <div className="flex h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-[#006600]" style={{ width: `${pPct}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${mixPct}%` }} />
        <div className="h-full bg-destructive" style={{ width: `${nPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>👍 {pPct}%</span>
        <span>➖ {mixPct}%</span>
        <span>👎 {nPct}%</span>
      </div>
    </div>
  );
}

export function SearchResultCards({ results }: SearchResultCardsProps) {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const { t } = useLang();

  const toggleExpand = (name: string) => {
    setExpandedProduct((prev) => (prev === name ? null : name));
  };

  return (
    <div className="space-y-3">
      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {results.map((item) => {
          const isExpanded = expandedProduct === item.product.name;
          const sourceDist = getSourceDistribution(item.product.reviews);
          const reviewCount = item.product.reviews.length;
          const cs = item.sentiment.compositeScore;
          const allPrivacyRestricted = isAllPrivacyRestricted(item.product.reviews);
          const totalSentiment = Math.max(item.sentiment.positive + item.sentiment.negative + item.sentiment.neutral, 1);
          const positivePct = Math.round((item.sentiment.positive / totalSentiment) * 100);
          const negativePct = Math.round((item.sentiment.negative / totalSentiment) * 100);
          const previewInsight = allPrivacyRestricted
            ? `LG.com 요약 중심 보기 · 긍정 ${positivePct}% · 부정 ${negativePct}%`
            : (item.sentiment.topPositivePhrase || item.sentiment.topNegativePhrase);

          return (
            <Card
              key={item.product.name}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md border group ${
                isExpanded
                  ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/20"
              }`}
              onClick={() => toggleExpand(item.product.name)}
            >
              <div className="p-4 space-y-2.5">
                {/* Header: Name + Composite Score Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">
                      {item.product.displayName || item.product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {item.product.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Composite Score Badge */}
                    <div className={`px-2 py-0.5 rounded-md border text-xs font-bold ${scoreBg(cs)} ${scoreColor(cs)}`}>
                      {cs}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>

                {/* Category + SubCategory + Issue Category */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.product.subCategory && (
                    <Badge variant="secondary" className="text-[9px] bg-accent/50 text-accent-foreground">
                      {item.product.subCategory}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {item.product.category}
                  </Badge>
                  {item.sentiment.dominantIssueCategory !== "General" && (
                    <Badge variant="secondary" className="text-[9px]">
                      🏷️ {item.sentiment.dominantIssueCategory}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    <span>{reviewCount}{t(" reviews", "건")}</span>
                  </div>
                </div>

                {/* 3-bar Sentiment Breakdown */}
                <SentimentMiniBar sentiment={item.sentiment} />

                {/* Evidence Phrase (top) */}
                {previewInsight && (
                  <p className={`text-[10px] text-muted-foreground line-clamp-2 border-l-2 pl-2 ${
                    allPrivacyRestricted ? "border-primary/20" : "border-primary/30 italic"
                  }`}>
                    {allPrivacyRestricted ? previewInsight : `"${previewInsight}"`}
                  </p>
                )}

                {/* Flags: Price Sensitivity + Competitive */}
                <div className="flex flex-wrap gap-1">
                  {item.sentiment.priceSensitivityFlag && (
                    <Badge variant="destructive" className="text-[8px] px-1.5 py-0 h-4 gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> {t("Price", "가격")} ⚠️
                    </Badge>
                  )}
                  {item.sentiment.competitiveMentions.length > 0 && (
                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 border-amber-500/50 text-amber-700">
                      <Swords className="h-2.5 w-2.5" />
                      {item.sentiment.competitiveMentions.filter(c => c.win).length}W/{item.sentiment.competitiveMentions.filter(c => !c.win).length}L
                    </Badge>
                  )}
                  {/* Source Distribution */}
                  {Object.entries(sourceDist)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <Badge key={source} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                        {source} {count}
                        {source === "LG.com" && <span className="ml-0.5 opacity-60">(요약)</span>}
                      </Badge>
                    ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Accordion Detail */}
      {expandedProduct && (() => {
        const item = results.find((r) => r.product.name === expandedProduct);
        if (!item) return null;
        const cs = item.sentiment.compositeScore;
        const allPrivacyRestricted = isAllPrivacyRestricted(item.product.reviews);
        return (
          <div className="animate-slide-up border border-primary/20 rounded-xl bg-card p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                {item.product.category}
              </Badge>
              {item.product.subCategory && (
                <Badge variant="secondary" className="text-[10px]">{item.product.subCategory}</Badge>
              )}
              <h3 className="text-lg font-bold">
                {item.product.displayName || item.product.name}
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                {item.product.name}
              </span>
              <div className={`ml-auto px-3 py-1 rounded-lg border font-bold text-sm ${scoreBg(cs)} ${scoreColor(cs)}`}>
                {cs}/100 · {scoreLabel(cs, t)}
              </div>
            </div>

            {/* ── 리뷰 인사이트 ── */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold pb-2 border-b border-border">📊 리뷰 인사이트</h4>

              {/* Unified insight panel for all products */}
              <UnifiedInsightPanel
                sentiment={item.sentiment}
                productName={item.product.name}
                reviews={item.product.reviews}
                privacyMode={allPrivacyRestricted}
              />


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
            </div>

            {/* ── 실고객 리뷰 블록 ── */}
            {isAllPrivacyRestricted(item.product.reviews) ? (
              <div className="flex items-start gap-2.5 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <span className="text-lg">🔒</span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">LG.com 리뷰 원문 비공개</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    개인정보 보호 정책에 따라 LG.com 리뷰 원문은 표시되지 않습니다.
                    감성 분류 데이터를 기반으로 집계된 인사이트를 제공합니다.
                  </p>
                </div>
              </div>
            ) : item.product.reviews.some((r) => isPrivacyRestricted(r.source)) ? (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/15 bg-primary/5">
                <span className="text-sm">🔒</span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  LG.com 리뷰 원문은 개인정보 보호 정책에 따라 비공개됩니다. 타 채널 리뷰 기반으로 분석됩니다.
                </p>
              </div>
            ) : null}
            {/* Tagline — 솔직한 리뷰로 확인하세요 */}
            {item.marketing.tagline && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2">
                <span className="text-primary text-base">📊</span>
                <p className="text-xs font-medium text-foreground/90">{item.marketing.tagline}</p>
              </div>
            )}

            <div className="rounded-2xl bg-gradient-to-br from-secondary/30 via-muted/40 to-secondary/20 border border-border/60 p-5 space-y-4 mt-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-1 h-5 rounded-full bg-muted-foreground/50" />
                <h3 className="text-sm font-bold text-muted-foreground">💬 실고객 리뷰</h3>
              </div>
              <ReviewList reviews={item.product.reviews} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
