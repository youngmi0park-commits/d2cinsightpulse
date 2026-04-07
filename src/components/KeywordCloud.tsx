import type { SentimentResult, SentimentSignal } from "@/lib/sentiment";
import { useLang } from "@/contexts/LanguageContext";
import { maskCompetitorNames } from "@/lib/sentiment";

interface KeywordCloudProps {
  keywords: SentimentResult["keywords"];
  signals?: SentimentSignal[];
}

/** Group signals by category, then split pos/neg, max 3 each */
function groupByCategory(signals: SentimentSignal[]) {
  const map = new Map<string, { positive: SentimentSignal[]; negative: SentimentSignal[] }>();

  for (const sig of signals) {
    const cat = sig.category || "General";
    if (!map.has(cat)) map.set(cat, { positive: [], negative: [] });
    const bucket = map.get(cat)!;
    if (sig.sentiment === "positive" && bucket.positive.length < 3) {
      bucket.positive.push(sig);
    } else if (sig.sentiment === "negative" && bucket.negative.length < 3) {
      bucket.negative.push(sig);
    }
  }

  // Sort by total signal count desc, filter out empty
  return [...map.entries()]
    .filter(([, v]) => v.positive.length + v.negative.length > 0)
    .sort(([, a], [, b]) => (b.positive.length + b.negative.length) - (a.positive.length + a.negative.length));
}

export function KeywordCloud({ keywords, signals = [] }: KeywordCloudProps) {
  const { t } = useLang();

  const grouped = groupByCategory(signals);
  const hasTopicView = grouped.length > 0;

  return (
    <div className="gradient-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="text-xs font-bold font-heading">
        🔑 {t("Review Insight Summary", "리뷰 인사이트 요약")}
      </h3>

      {/* 1) Topic prose summary — TOP */}
      {hasTopicView && (
        <div className="space-y-2">
          {grouped.map(([category, { positive, negative }]) => {
            const posText = positive.map((s) => maskCompetitorNames(s.evidencePhrase)).join(" / ");
            const negText = negative.map((s) => maskCompetitorNames(s.evidencePhrase)).join(" / ");
            return (
              <div key={category} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[11px] font-bold text-foreground mb-1">🏷️ {category}</p>
                {positive.length > 0 && (
                  <p className="text-[11px] text-foreground/80 leading-relaxed mb-0.5">
                    <span className="font-medium text-[#006600]">👍 긍정:</span> {posText}
                  </p>
                )}
                {negative.length > 0 && (
                  <p className="text-[11px] text-foreground/80 leading-relaxed">
                    <span className="font-medium text-destructive">👎 부정:</span> {negText}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2) Top 3 keyword pills — compact */}
      <div className="flex items-center gap-3 flex-wrap border-t border-border pt-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground">👍</span>
          {keywords.positive.length > 0 ? keywords.positive.slice(0, 3).map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 rounded-full text-[10px] border bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]"
            >
              {kw}
            </span>
          )) : <span className="text-[10px] text-muted-foreground">{t("No data", "없음")}</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground">👎</span>
          {keywords.negative.length > 0 ? keywords.negative.slice(0, 3).map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 rounded-full text-[10px] border bg-destructive/10 text-destructive border-destructive/20"
            >
              {kw}
            </span>
          )) : <span className="text-[10px] text-muted-foreground">{t("No data", "없음")}</span>}
        </div>
      </div>
    </div>
  );
}
