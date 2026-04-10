import { useState, useEffect, useRef } from "react";
import type { SentimentResult, SentimentSignal } from "@/lib/sentiment";
import { useLang } from "@/contexts/LanguageContext";
import { maskCompetitorNames } from "@/lib/sentiment";
import { getPrivacySafeThemeLabels } from "@/lib/reviewUtils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface KeywordCloudProps {
  keywords: SentimentResult["keywords"];
  signals?: SentimentSignal[];
  privacyMode?: boolean;
}

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

function buildTranslationBlock(
  grouped: [string, { positive: SentimentSignal[]; negative: SentimentSignal[] }][],
  keywords?: { positive: string[]; negative: string[] }
): string {
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
  if (keywords) {
    const kwParts: string[] = ["[Keywords]"];
    if (keywords.positive.length > 0) {
      kwParts.push(`Positive: ${keywords.positive.slice(0, 3).join(" / ")}`);
    }
    if (keywords.negative.length > 0) {
      kwParts.push(`Negative: ${keywords.negative.slice(0, 3).join(" / ")}`);
    }
    lines.push(kwParts.join("\n"));
  }
  return lines.join("\n\n");
}

function parseTranslatedBlock(text: string, categories: string[]): Record<string, { pos?: string; neg?: string }> {
  const result: Record<string, { pos?: string; neg?: string }> = {};

  for (const cat of categories) {
    const pattern = new RegExp(`\\[${cat.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\]([\\s\\S]*?)(?=\\[|$)`, "i");
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

export function KeywordCloud({ keywords, signals = [], privacyMode = false }: KeywordCloudProps) {
  const { t } = useLang();
  const [translations, setTranslations] = useState<Record<string, { pos?: string; neg?: string }>>({});
  const [kwTranslations, setKwTranslations] = useState<{ positive: string[]; negative: string[] }>({ positive: [], negative: [] });
  const [isTranslating, setIsTranslating] = useState(false);
  const translatedRef = useRef(false);

  const grouped = groupByCategory(signals);
  const hasTopicView = grouped.length > 0;
  const categories = grouped.map(([cat]) => cat);
  const hasKeywords = keywords.positive.length > 0 || keywords.negative.length > 0;
  const privacyPositiveThemes = getPrivacySafeThemeLabels(keywords.positive, 4);
  const privacyNegativeThemes = getPrivacySafeThemeLabels(keywords.negative, 4);

  useEffect(() => {
    if (privacyMode || (!hasTopicView && !hasKeywords) || translatedRef.current || isTranslating) return;
    translatedRef.current = true;

    const doTranslate = async () => {
      setIsTranslating(true);
      try {
        const block = buildTranslationBlock(grouped, keywords);
        const { data } = await supabase.functions.invoke("translate-review", {
          body: { text: block },
        });
        if (data?.translated) {
          const parsed = parseTranslatedBlock(data.translated, [...categories, "Keywords"]);
          const kwTr = parsed["Keywords"];
          if (kwTr) {
            setKwTranslations({
              positive: kwTr.pos ? kwTr.pos.split(/\s*\/\s*/).filter(Boolean) : [],
              negative: kwTr.neg ? kwTr.neg.split(/\s*\/\s*/).filter(Boolean) : [],
            });
            delete parsed["Keywords"];
          }
          setTranslations(parsed);
        }
      } catch (e) {
        console.error("Translation error:", e);
      } finally {
        setIsTranslating(false);
      }
    };
    void doTranslate();
  }, [categories, grouped, hasKeywords, hasTopicView, isTranslating, keywords, privacyMode]);

  if (privacyMode) {
    return (
      <div className="gradient-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-heading">🔑 {t("Review Insight Summary", "리뷰 인사이트 요약")}</h3>
          <span className="text-[10px] text-muted-foreground">LG.com 2차 가공</span>
        </div>

        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-[11px] text-foreground/90 leading-relaxed">
          원문 대신 테마 중심의 요약 인사이트만 표시합니다.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-[hsl(var(--success))]">👍 주요 긍정 테마</p>
            <div className="flex flex-wrap gap-1.5">
              {privacyPositiveThemes.length > 0 ? (
                privacyPositiveThemes.map((theme) => (
                  <span
                    key={theme}
                    className="px-2 py-0.5 rounded-full text-[10px] border bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]"
                  >
                    {theme}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground">{t("No data", "없음")}</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-destructive">👎 주요 부정 테마</p>
            <div className="flex flex-wrap gap-1.5">
              {privacyNegativeThemes.length > 0 ? (
                privacyNegativeThemes.map((theme) => (
                  <span
                    key={theme}
                    className="px-2 py-0.5 rounded-full text-[10px] border bg-destructive/10 text-destructive border-destructive/20"
                  >
                    {theme}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground">{t("No data", "없음")}</span>
              )}
            </div>
          </div>
        </div>

        {grouped.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[10px] font-semibold text-muted-foreground">🏷️ {t("Key Topic Signals", "주요 테마 시그널")}</p>
            <div className="space-y-1.5">
              {grouped.slice(0, 4).map(([category, { positive, negative }]) => (
                <div key={category} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                  <span className="text-[11px] font-medium text-foreground">{category}</span>
                  <div className="flex items-center gap-1.5">
                    {positive.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]">
                        긍정 {positive.length}
                      </span>
                    )}
                    {negative.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        부정 {negative.length}
                      </span>
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

  return (
    <div className="gradient-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-heading">🔑 {t("Review Insight Summary", "리뷰 인사이트 요약")}</h3>
        {isTranslating && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("Translating…", "번역 중…")}
          </span>
        )}
      </div>

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
                          <span className="font-medium text-[hsl(var(--success))]">👍 긍정:</span> {tr.pos}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">{posText}</p>
                      </>
                    ) : (
                      <p className="text-[11px] text-foreground/80 leading-relaxed">
                        <span className="font-medium text-[hsl(var(--success))]">👍 긍정:</span> {posText}
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
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">{negText}</p>
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

      <div className="flex items-center gap-3 flex-wrap border-t border-border pt-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground">👍</span>
          {keywords.positive.length > 0 ? keywords.positive.slice(0, 3).map((kw, i) => (
            <span
              key={kw}
              className="px-2 py-0.5 rounded-full text-[10px] border bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)] flex flex-col items-center leading-tight"
            >
              <span>{kwTranslations.positive[i] || kw}</span>
              {kwTranslations.positive[i] && <span className="text-[8px] text-muted-foreground/60">{kw}</span>}
            </span>
          )) : <span className="text-[10px] text-muted-foreground">{t("No data", "없음")}</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground">👎</span>
          {keywords.negative.length > 0 ? keywords.negative.slice(0, 3).map((kw, i) => (
            <span
              key={kw}
              className="px-2 py-0.5 rounded-full text-[10px] border bg-destructive/10 text-destructive border-destructive/20 flex flex-col items-center leading-tight"
            >
              <span>{kwTranslations.negative[i] || kw}</span>
              {kwTranslations.negative[i] && <span className="text-[8px] text-muted-foreground/60">{kw}</span>}
            </span>
          )) : <span className="text-[10px] text-muted-foreground">{t("No data", "없음")}</span>}
        </div>
      </div>
    </div>
  );
}
