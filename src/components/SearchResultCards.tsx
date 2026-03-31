import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, MessageSquare, TrendingUp, TrendingDown, Minus, Copy, AlertTriangle, Swords, DollarSign } from "lucide-react";
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
import { ContentCreationActions } from "./ContentCreationActions";

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

function SentimentIcon({ sentiment }: { sentiment: SentimentResult }) {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  if (total === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const ratio = sentiment.positive / total;
  if (ratio >= 0.6) return <TrendingUp className="h-4 w-4 text-[#006600]" />;
  if (ratio <= 0.3) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function UsageSceneSection({ scenes }: { scenes: string[] }) {
  const { t } = useLang();
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied!", "복사됨!"));
  };

  return (
    <div className="gradient-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold flex items-center gap-1.5">
          📍 {t("Customer Real Using Scene", "고객 실제 Using Scene")}
        </h4>
        <button
          onClick={() => copyText(scenes.join("\n"))}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Copy className="h-3 w-3" /> {t("Copy", "복사")}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {scenes.map((scene, i) => (
          <div key={i} className="p-3 rounded-lg border border-[#006600]/15 bg-[#006600]/5 flex items-center gap-2.5">
            <span className="shrink-0">🏠</span>
            <span className="text-xs text-foreground">📍 {scene}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Evidence & Signals section in expanded view */
function EvidenceSignalsSection({ sentiment }: { sentiment: SentimentResult }) {
  const { t } = useLang();
  return (
    <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
      <h4 className="text-sm font-bold flex items-center gap-1.5">
        🔍 {t("Key Evidence & Signals", "핵심 근거 & 시그널")}
      </h4>

      {/* Top evidence phrases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sentiment.topPositivePhrase && (
          <div className="p-3 rounded-lg border border-[#006600]/20 bg-[#006600]/5">
            <p className="text-[10px] font-semibold text-[#006600] mb-1">👍 {t("Top Positive Evidence", "핵심 긍정 근거")}</p>
            <p className="text-xs text-foreground italic">"{sentiment.topPositivePhrase}"</p>
          </div>
        )}
        {sentiment.topNegativePhrase && (
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
            <p className="text-[10px] font-semibold text-destructive mb-1">👎 {t("Top Negative Evidence", "핵심 부정 근거")}</p>
            <p className="text-xs text-foreground italic">"{sentiment.topNegativePhrase}"</p>
          </div>
        )}
      </div>

      {/* Flags row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] gap-1">
          🏷️ {sentiment.dominantIssueCategory}
        </Badge>
        {sentiment.priceSensitivityFlag && (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <DollarSign className="h-3 w-3" /> {t("Price Sensitivity", "가격 민감도")} ⚠️
          </Badge>
        )}
        {sentiment.competitiveMentions.length > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-700">
            <Swords className="h-3 w-3" /> {t("Competitive", "경쟁")}
            {" "}
            {sentiment.competitiveMentions.filter(c => c.win).length}W / {sentiment.competitiveMentions.filter(c => !c.win).length}L
          </Badge>
        )}
      </div>

      {/* Top signals list */}
      {sentiment.signals.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground">{t("Top Sentiment Signals", "주요 감성 시그널")} ({sentiment.signals.length})</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {sentiment.signals.slice(0, 10).map((sig, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] p-1.5 rounded bg-muted/30">
                <span className={sig.sentiment === "positive" ? "text-[#006600]" : sig.sentiment === "negative" ? "text-destructive" : "text-amber-600"}>
                  {sig.sentiment === "positive" ? "👍" : sig.sentiment === "negative" ? "👎" : "➖"}
                </span>
                <span className="text-foreground flex-1 italic">"{sig.evidencePhrase}"</span>
                {sig.category && sig.category !== "General" && (
                  <Badge variant="secondary" className="text-[8px] shrink-0">{sig.category}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
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
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                {(item.sentiment.topPositivePhrase || item.sentiment.topNegativePhrase) && (
                  <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-l-2 border-primary/30 pl-2">
                    "{item.sentiment.topPositivePhrase || item.sentiment.topNegativePhrase}"
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

            {/* ── STEP 2: 리뷰 인사이트 ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">2</span>
                <h4 className="text-sm font-bold">📊 리뷰 인사이트</h4>
              </div>

              {/* Evidence & Signals */}
              <EvidenceSignalsSection sentiment={item.sentiment} />

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
            </div>

            {/* ── STEPS 3–6: 목표→채널→콘텐츠→생성 ── */}
            <ContentCreationActions
              productName={item.product.name}
              displayName={item.product.displayName}
            />

            {/* ── 실고객 리뷰 (참고용, 최하단) ── */}
            <ReviewList reviews={item.product.reviews} />
          </div>
        );
      })()}
    </div>
  );
}
