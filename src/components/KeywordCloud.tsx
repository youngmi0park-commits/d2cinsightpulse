import { useState, useEffect, useRef } from "react";
import type { SentimentResult, SentimentSignal } from "@/lib/sentiment";
import { useLang } from "@/contexts/LanguageContext";
import { maskCompetitorNames } from "@/lib/sentiment";
import { supabase } from "@/integrations/supabase/client";
import { Languages, Loader2 } from "lucide-react";

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

  return [...map.entries()]
    .filter(([, v]) => v.positive.length + v.negative.length > 0)
    .sort(([, a], [, b]) => (b.positive.length + b.negative.length) - (a.positive.length + a.negative.length));
}

/** Build a single text block from grouped signals for batch translation */
function buildTranslationBlock(grouped: [string, { positive: SentimentSignal[]; negative: SentimentSignal[] }][]): string {
  const lines: string[] = [];
  for (const [category, { positive, negative }] of grouped) {
    const parts: string[] = [`[${category}]`];
    if (positive.length > 0) {
      parts.push(`Positive: ${positive.map((s) => maskCompetitorNames(s.evidencePhrase)).join(" / ")}`);
    }
    if (negative.length > 0) {
      parts.push(`Negative: ${negative.map((s) => maskCompetitorNames(s.evidencePhrase)).join(" / ")}`);
    }
    lines.push(parts.join("\n"));
  }
  return lines.join("\n\n");
}

/** Parse translated block back into category map */
function parseTranslatedBlock(text: string, categories: string[]): Record<string, { pos?: string; neg?: string }> {
  const result: Record<string, { pos?: string; neg?: string }> = {};
  
  // Try to split by category headers
  for (const cat of categories) {
    const pattern = new RegExp(`\\[${cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]([\\s\\S]*?)(?=\\[|$)`, 'i');
    const match = text.match(pattern);
    if (match) {
      const block = match[1];
      const posMatch = block.match(/(?:긍정|Positive)[:\s：]*(.*?)(?=(?:부정|Negative)|$)/is);
      const negMatch = block.match(/(?:부정|Negative)[:\s：]*(.*?)$/is);
      result[cat] = {
        pos: posMatch?.[1]?.trim() || undefined,
        neg: negMatch?.[1]?.trim() || undefined,
      };
    }
  }
  return result;
}

export function KeywordCloud({ keywords, signals = [] }: KeywordCloudProps) {
  const { t } = useLang();
  const [translations, setTranslations] = useState<Record<string, { pos?: string; neg?: string }>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const translatedRef = useRef(false);

  const grouped = groupByCategory(signals);
  const hasTopicView = grouped.length > 0;
  const categories = grouped.map(([cat]) => cat);

  // Auto-translate on mount
  useEffect(() => {
    if (!hasTopicView || translatedRef.current || isTranslating) return;
    translatedRef.current = true;

    const doTranslate = async () => {
      setIsTranslating(true);
      try {
        const block = buildTranslationBlock(grouped);
        const { data } = await supabase.functions.invoke("translate-review", {
          body: { text: block },
        });
        if (data?.translated) {
          const parsed = parseTranslatedBlock(data.translated, categories);
          setTranslations(parsed);
        }
      } catch (e) {
        console.error("Translation error:", e);
      } finally {
        setIsTranslating(false);
      }
    };
    doTranslate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTopicView]);

  return (
    <div className="gradient-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-heading">
          🔑 {t("Review Insight Summary", "리뷰 인사이트 요약")}
        </h3>
        {isTranslating && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("Translating…", "번역 중…")}
          </span>
        )}
      </div>

      {/* 1) Topic prose summary — TOP, with Korean translation */}
      {hasTopicView && (
        <div className="space-y-2">
          {grouped.map(([category, { positive, negative }]) => {
            const posText = positive.map((s) => maskCompetitorNames(s.evidencePhrase)).join(" / ");
            const negText = negative.map((s) => maskCompetitorNames(s.evidencePhrase)).join(" / ");
            const tr = translations[category];

            return (
              <div key={category} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[11px] font-bold text-foreground mb-1">🏷️ {category}</p>
                {positive.length > 0 && (
                  <div className="mb-1">
                    {tr?.pos ? (
                      <>
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          <span className="font-medium text-[#006600]">👍 긍정:</span> {tr.pos}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">
                          {posText}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-foreground/80 leading-relaxed">
                        <span className="font-medium text-[#006600]">👍 긍정:</span> {posText}
                      </p>
                    )}
                  </div>
                )}
                {negative.length > 0 && (
                  <div>
                    {tr?.neg ? (
                      <>
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          <span className="font-medium text-destructive">👎 부정:</span> {tr.neg}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">
                          {negText}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-foreground/80 leading-relaxed">
                        <span className="font-medium text-destructive">👎 부정:</span> {negText}
                      </p>
                    )}
                  </div>
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
