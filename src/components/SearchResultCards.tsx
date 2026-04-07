import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, MessageSquare, TrendingUp, TrendingDown, Minus, Copy, AlertTriangle, Swords, DollarSign, Languages } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SentimentResult } from "@/lib/sentiment";
import { maskCompetitorNames } from "@/lib/sentiment";
import type { MarketingOutput } from "@/lib/formatMessage";
import type { GeoMessage } from "@/lib/formatMessage";
import type { ProductData } from "@/data/dummyData";
import { SentimentChart } from "./SentimentChart";
import { KeywordCloud } from "./KeywordCloud";
import { MarketingHub } from "./MarketingHub";
import { ReviewList } from "./ReviewList";
import { isPrivacyRestricted, isAllPrivacyRestricted } from "@/lib/reviewUtils";


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

/** Normalize source string to display label */
function sourceLabel(source: string): string {
  if (source.startsWith("reddit")) return "Reddit";
  if (source.startsWith("youtube")) return "YouTube";
  if (source.startsWith("lge_com")) return "LG.com";
  if (source.startsWith("amazon")) return "Amazon";
  if (source.startsWith("bestbuy")) return "BestBuy";
  return source;
}

/** Get unique channel labels from reviews */
function getChannelLabels(reviews: { source?: string }[]): string[] {
  const set = new Set<string>();
  for (const r of reviews) {
    if (r.source) set.add(sourceLabel(r.source));
  }
  return Array.from(set).sort();
}

/** Strip PII from text (emails, phones, names) */
function stripPII(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "")
    .replace(/(?:my name is|I'?m)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Extract short excerpt from review text */
function excerpt(text: string, maxLen = 120): string {
  const clean = maskCompetitorNames(stripPII(text.replace(/\s+/g, " ").trim()));
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

/** Check if text is a placeholder (no real content) */
function isPlaceholder(text: string): boolean {
  return /개인정보 보호 정책|LG 리뷰 — 감성|긍정적 사용 경험|불만 또는 개선|중립적 의견/.test(text);
}

/** Display-ready excerpt — uses title fallback for placeholder reviews; LG.com shows sentiment summary only */
function summaryExcerpt(text: string, source?: string, sentimentType?: string, title?: string, rating?: number): string {
  const isLgCom = source?.startsWith("lge_com");

  if (isLgCom || isPlaceholder(text)) {
    // 2차 가공물만 표시 — 별점 제외, 긍부정 요약만
    const sentLabel = sentimentType === "positive" ? "👍 긍정적 사용 경험 확인"
      : sentimentType === "negative" ? "👎 불만 또는 개선 요청 확인"
      : "➖ 중립적 의견";
    if (title) return `${sentLabel} — ${title}`;
    // fallback from placeholder text
    const match = text.match(/감성:\s*(\w+),\s*점수:\s*(\d+)점/);
    if (match) {
      const label = match[1] === "positive" ? "👍 긍정" : match[1] === "negative" ? "👎 부정" : "➖ 중립";
      return `${label} (${match[2]}점)`;
    }
    return sentLabel;
  }
  return excerpt(text, 120);
}

/** Evidence & Signals section in expanded view */
function EvidenceSignalsSection({ sentiment, reviews }: { sentiment: SentimentResult; reviews: { text: string; sentiment?: string; source?: string; title?: string; rating?: number }[] }) {
  const { t } = useLang();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [signalTranslations, setSignalTranslations] = useState<Record<number, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const channels = getChannelLabels(reviews);

  const filteredReviews = selectedChannel
    ? reviews.filter((r) => r.source && sourceLabel(r.source) === selectedChannel)
    : reviews;

  const positiveReviews = filteredReviews.filter((r) => r.sentiment === "positive");
  const negativeReviews = filteredReviews.filter((r) => r.sentiment === "negative");

  const channelCounts = channels.map((ch) => {
    const chReviews = reviews.filter((r) => r.source && sourceLabel(r.source) === ch);
    return {
      label: ch,
      total: chReviews.length,
      positive: chReviews.filter((r) => r.sentiment === "positive").length,
      negative: chReviews.filter((r) => r.sentiment === "negative").length,
    };
  });

  /** Batch translate all visible excerpts + signals */
  const handleTranslateAll = useCallback(async () => {
    setIsTranslating(true);
    try {
      // Collect texts to translate
      const excerptTexts: { key: string; text: string }[] = [];
      [...positiveReviews.slice(0, 8), ...negativeReviews.slice(0, 8)].forEach((r, i) => {
        const key = `${r.sentiment}-${i}`;
        if (!translations[key]) {
          excerptTexts.push({ key, text: summaryExcerpt(r.text, r.source, undefined, r.title, r.rating) });
        }
      });

      const signalTexts: { idx: number; text: string }[] = [];
      sentiment.signals.slice(0, 10).forEach((sig, i) => {
        if (!signalTranslations[i]) {
          signalTexts.push({ idx: i, text: sig.evidencePhrase });
        }
      });

      // Translate in parallel (batch of up to 5 at a time)
      const allItems = [
        ...excerptTexts.map((e) => ({ type: "excerpt" as const, ...e })),
        ...signalTexts.map((s) => ({ type: "signal" as const, ...s })),
      ];

      const batchSize = 5;
      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (item) => {
            try {
              const { data } = await supabase.functions.invoke("translate-review", {
                body: { text: item.text },
              });
              return { ...item, translated: data?.translated || item.text };
            } catch {
              return { ...item, translated: item.text };
            }
          })
        );

        const newExcerptTrans: Record<string, string> = {};
        const newSignalTrans: Record<number, string> = {};
        for (const r of results) {
          if (r.type === "excerpt") newExcerptTrans[r.key] = r.translated;
          else newSignalTrans[r.idx] = r.translated;
        }
        setTranslations((prev) => ({ ...prev, ...newExcerptTrans }));
        setSignalTranslations((prev) => ({ ...prev, ...newSignalTrans }));
      }

      toast.success(t("Translation complete!", "번역 완료!"));
    } catch {
      toast.error(t("Translation failed", "번역 실패"));
    } finally {
      setIsTranslating(false);
    }
  }, [positiveReviews, negativeReviews, sentiment.signals, translations, signalTranslations, t]);

  const hasTranslations = Object.keys(translations).length > 0 || Object.keys(signalTranslations).length > 0;

  return (
    <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold flex items-center gap-1.5">
          🔍 {t("Key Evidence & Signals", "핵심 근거 & 시그널")}
        </h4>
        <button
          onClick={handleTranslateAll}
          disabled={isTranslating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          <Languages className="h-3.5 w-3.5" />
          {isTranslating ? t("Translating…", "번역 중…") : hasTranslations ? t("Re-translate", "재번역") : t("Translate to Korean", "국문 번역")}
        </button>
      </div>

      {/* Channel Filter Tabs */}
      {channels.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedChannel(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
              selectedChannel === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {t("All Channels", "전체 채널")} ({reviews.length})
          </button>
          {channelCounts.map((ch) => (
            <button
              key={ch.label}
              onClick={() => setSelectedChannel(ch.label === selectedChannel ? null : ch.label)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                selectedChannel === ch.label
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {ch.label} ({ch.total})
            </button>
          ))}
        </div>
      )}

      {/* Positive / Negative Comment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Positive Summary */}
        <div className="p-4 rounded-lg border border-[#006600]/20 bg-[#006600]/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#006600] flex items-center gap-1">
              👍 {t("Positive Summary", "긍정 코멘트 요약")}
            </p>
            <Badge variant="secondary" className="text-[9px] h-4">
              {positiveReviews.length}{t(" reviews", "건")}
            </Badge>
          </div>
          {sentiment.topPositivePhrase && (
            <p className="text-xs text-foreground font-medium border-l-2 border-[#006600]/30 pl-2 italic">
              "{sentiment.topPositivePhrase}"
            </p>
          )}
          {positiveReviews.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {positiveReviews.slice(0, 8).map((r, i) => {
                const key = `positive-${i}`;
                const ko = translations[key];
                return (
                  <div key={i} className="flex items-start gap-2 text-[11px] p-2 rounded bg-[#006600]/5 border border-[#006600]/10">
                    {r.source && (
                      <Badge variant="outline" className="text-[8px] shrink-0 h-4 px-1.5 border-[#006600]/20">
                        {sourceLabel(r.source)}
                      </Badge>
                    )}
                    <div className="flex-1 leading-relaxed space-y-0.5">
                      {ko && <span className="text-foreground font-medium block">"{ko}"</span>}
                      <span className={`text-foreground block ${ko ? "text-[10px] text-muted-foreground" : ""}`}>
                        "{summaryExcerpt(r.text, r.source, "positive", r.title, r.rating)}"
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">{t("No positive reviews in this channel.", "해당 채널에 긍정 리뷰가 없습니다.")}</p>
          )}
        </div>

        {/* Negative Summary */}
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-destructive flex items-center gap-1">
              👎 {t("Negative Summary", "부정 코멘트 요약")}
            </p>
            <Badge variant="secondary" className="text-[9px] h-4">
              {negativeReviews.length}{t(" reviews", "건")}
            </Badge>
          </div>
          {sentiment.topNegativePhrase && (
            <p className="text-xs text-foreground font-medium border-l-2 border-destructive/30 pl-2 italic">
              "{sentiment.topNegativePhrase}"
            </p>
          )}
          {negativeReviews.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {negativeReviews.slice(0, 8).map((r, i) => {
                const key = `negative-${i}`;
                const ko = translations[key];
                return (
                  <div key={i} className="flex items-start gap-2 text-[11px] p-2 rounded bg-destructive/5 border border-destructive/10">
                    {r.source && (
                      <Badge variant="outline" className="text-[8px] shrink-0 h-4 px-1.5 border-destructive/20">
                        {sourceLabel(r.source)}
                      </Badge>
                    )}
                    <div className="flex-1 leading-relaxed space-y-0.5">
                      {ko && <span className="text-foreground font-medium block">"{ko}"</span>}
                      <span className={`text-foreground block ${ko ? "text-[10px] text-muted-foreground" : ""}`}>
                        "{summaryExcerpt(r.text, r.source, "negative", r.title, r.rating)}"
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">{t("No negative reviews in this channel.", "해당 채널에 부정 리뷰가 없습니다.")}</p>
          )}
        </div>
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

      {/* Top signals list — Korean first, then English original */}
      {sentiment.signals.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground">{t("Top Sentiment Signals", "주요 감성 시그널")} ({sentiment.signals.length})</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {sentiment.signals.slice(0, 10).map((sig, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] p-1.5 rounded bg-muted/30">
                <span className={`shrink-0 ${sig.sentiment === "positive" ? "text-[#006600]" : sig.sentiment === "negative" ? "text-destructive" : "text-amber-600"}`}>
                  {sig.sentiment === "positive" ? "👍" : sig.sentiment === "negative" ? "👎" : "➖"}
                </span>
                <div className="flex-1 space-y-0.5">
                  {signalTranslations[i] && (
                    <span className="text-foreground font-medium block">"{signalTranslations[i]}"</span>
                  )}
                  <span className={`italic block ${signalTranslations[i] ? "text-[10px] text-muted-foreground" : "text-foreground"}`}>
                    "{sig.evidencePhrase}"
                  </span>
                </div>
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

            {/* ── 리뷰 인사이트 ── */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold pb-2 border-b border-border">📊 리뷰 인사이트</h4>

              {/* 1) 주요 긍/부정 키워드 & 주제별 요약 (맨 위) */}
              <KeywordCloud keywords={item.sentiment.keywords} signals={item.sentiment.signals} />

              {/* 2) 감성 분석 결과 그래프 */}
              <SentimentChart sentiment={item.sentiment} />

              {/* 3) 핵심 근거 & 시그널 */}
              <EvidenceSignalsSection sentiment={item.sentiment} reviews={item.product.reviews} />


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
