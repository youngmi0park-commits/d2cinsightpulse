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
    <div className="gradient-card rounded-xl border border-border p-4">
      <h3 className="text-xs font-bold mb-3 font-heading">
        🔑 {t("Key Topics & Keywords", "주제별 키워드")}
      </h3>

      {/* Keyword pills — compact */}
      <div className="space-y-2 mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1">
            👍 {t("Positive", "긍정")} ({keywords.positive.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {keywords.positive.length > 0 ? keywords.positive.slice(0, 12).map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-full text-[10px] border bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]"
              >
                {kw}
              </span>
            )) : <span className="text-[10px] text-muted-foreground">{t("No data", "데이터 없음")}</span>}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1">
            👎 {t("Negative", "부정")} ({keywords.negative.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {keywords.negative.length > 0 ? keywords.negative.slice(0, 12).map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-full text-[10px] border bg-destructive/10 text-destructive border-destructive/20"
              >
                {kw}
              </span>
            )) : <span className="text-[10px] text-muted-foreground">{t("No data", "데이터 없음")}</span>}
          </div>
        </div>
      </div>

      {/* Topic-grouped evidence */}
      {hasTopicView && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[10px] font-semibold text-muted-foreground">
            {t("Topic Evidence (max 3 per sentiment)", "주제별 근거 (긍부정 각 최대 3건)")}
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {grouped.map(([category, { positive, negative }]) => (
              <div key={category} className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                <p className="text-[10px] font-bold text-foreground mb-1.5">🏷️ {category}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {/* Positive comments */}
                  {positive.length > 0 && (
                    <div className="space-y-1">
                      {positive.map((sig, i) => (
                        <div key={i} className="flex items-start gap-1 text-[10px] p-1.5 rounded bg-[hsl(var(--success)/0.05)] border border-[hsl(var(--success)/0.1)]">
                          <span className="shrink-0">👍</span>
                          <span className="text-foreground leading-tight line-clamp-2">
                            "{maskCompetitorNames(sig.evidencePhrase)}"
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Negative comments */}
                  {negative.length > 0 && (
                    <div className="space-y-1">
                      {negative.map((sig, i) => (
                        <div key={i} className="flex items-start gap-1 text-[10px] p-1.5 rounded bg-destructive/5 border border-destructive/10">
                          <span className="shrink-0">👎</span>
                          <span className="text-foreground leading-tight line-clamp-2">
                            "{maskCompetitorNames(sig.evidencePhrase)}"
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
