import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, MessageSquare, TrendingUp, TrendingDown, Minus, MapPin, Copy } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { SentimentResult } from "@/lib/sentiment";
import type { MarketingOutput } from "@/lib/formatMessage";
import type { GeoMessage } from "@/lib/formatMessage";
import type { ProductData } from "@/data/dummyData";
import { SentimentChart } from "./SentimentChart";
import { KeywordCloud } from "./KeywordCloud";
import { MarketingHub } from "./MarketingHub";
import { ReviewList } from "./ReviewList";

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

function SentimentMiniBar({ sentiment }: { sentiment: SentimentResult }) {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  if (total === 0) return null;
  const pPct = Math.round((sentiment.positive / total) * 100);
  const nPct = Math.round((sentiment.negative / total) * 100);

  return (
    <div className="flex items-center gap-2 w-full max-w-[180px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-[#006600]" style={{ width: `${pPct}%` }} />
        <div className="h-full bg-destructive" style={{ width: `${nPct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {pPct}% / {nPct}%
      </span>
    </div>
  );
}

function SentimentIcon({ sentiment }: { sentiment: SentimentResult }) {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  if (total === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const ratio = sentiment.positive / total;
  if (ratio >= 0.6) return <TrendingUp className="h-4 w-4 text-[#006600]" />;
  if (ratio <= 0.3) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
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

          return (
            <Card
              key={item.product.name}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md border ${
                isExpanded
                  ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
              onClick={() => toggleExpand(item.product.name)}
            >
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">
                      {item.product.displayName || item.product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {item.product.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <SentimentIcon sentiment={item.sentiment} />
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Category + Review Count */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {item.product.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    <span>{reviewCount}{t(" reviews", "건")}</span>
                  </div>
                </div>

                {/* Sentiment Mini Bar */}
                <SentimentMiniBar sentiment={item.sentiment} />

                {/* Source Distribution */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(sourceDist)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <Badge
                        key={source}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 h-4 font-normal"
                      >
                        {source} {count}
                      </Badge>
                    ))}
                </div>

                {/* Top Usage Scenes (preview) */}
                {item.sentiment.usageScenes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.sentiment.usageScenes.slice(0, 3).map((scene, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[9px] text-[#006600] bg-[#006600]/8 border border-[#006600]/15 rounded-md px-1.5 py-0.5"
                      >
                        📍 {scene}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Accordion Detail */}
      {expandedProduct && (() => {
        const item = results.find((r) => r.product.name === expandedProduct);
        if (!item) return null;
        return (
          <div className="animate-slide-up border border-primary/20 rounded-xl bg-card p-5 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                {item.product.category}
              </Badge>
              <h3 className="text-lg font-bold">
                {item.product.displayName || item.product.name}
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                {item.product.name}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SentimentChart sentiment={item.sentiment} />
              <KeywordCloud keywords={item.sentiment.keywords} />
            </div>

            {/* 고객 실제 Using Scene */}
            {item.sentiment.usageScenes.length > 0 && (
              <UsageSceneSection scenes={item.sentiment.usageScenes} />
            )}

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
            <ReviewList reviews={item.product.reviews} />
          </div>
        );
      })()}
    </div>
  );
}
