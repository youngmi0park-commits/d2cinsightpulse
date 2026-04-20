import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { countryToSourceFilter } from "@/components/CountryFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ── Competitor brand mapping (initials only) ── */
const COMPETITOR_PATTERNS: { pattern: RegExp; label: string; code: string }[] = [
  { pattern: /\bsamsung\b/i, label: "SS", code: "SS" },
  { pattern: /\bgalaxy\b/i, label: "SS", code: "SS" },
  { pattern: /\bsony\b/i, label: "SN", code: "SN" },
  { pattern: /\bbravia\b/i, label: "SN", code: "SN" },
  { pattern: /\btcl\b/i, label: "C브랜드", code: "C" },
  { pattern: /\bhisense\b/i, label: "C브랜드", code: "C" },
  { pattern: /\bvizio\b/i, label: "C브랜드", code: "C" },
  { pattern: /\bwhirlpool\b/i, label: "기타 가전", code: "ETC" },
  { pattern: /\bge\s+(appliance|profile|washer|dryer|fridge)/i, label: "기타 가전", code: "ETC" },
  { pattern: /\bbosch\b/i, label: "기타 가전", code: "ETC" },
  { pattern: /\belectrolux\b/i, label: "기타 가전", code: "ETC" },
  { pattern: /\bmaytag\b/i, label: "기타 가전", code: "ETC" },
  { pattern: /\bkenmore\b/i, label: "기타 가전", code: "ETC" },
];

interface CompetitorMention {
  code: string;
  label: string;
  count: number;
  positiveContext: number;
  negativeContext: number;
  sampleContexts: string[];
}

function useCompetitorMentions(country: string, range: "all" | "weekly") {
  const sourcesFilter = country !== "all" ? countryToSourceFilter(country) : null;
  return useQuery({
    queryKey: ["reddit-competitor-mentions", country, range],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("content, sentiment")
        .like("source", "reddit%")
        .limit(2000);
      if (range === "weekly") {
        // Use collected_at — Firecrawl Reddit posts have NULL published_at
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        query = query.gte("collected_at", weekAgo);
      }
      if (sourcesFilter) {
        const redditSources = sourcesFilter.filter(s => s.startsWith("reddit"));
        if (redditSources.length === 0) return [];
        query = query.in("source", redditSources);
      }
      const { data, error } = await query;
      if (error) throw error;

      const mentions: Record<string, CompetitorMention> = {};

      for (const review of data || []) {
        for (const cp of COMPETITOR_PATTERNS) {
          if (cp.pattern.test(review.content)) {
            if (!mentions[cp.code]) {
              mentions[cp.code] = {
                code: cp.code,
                label: cp.label,
                count: 0,
                positiveContext: 0,
                negativeContext: 0,
                sampleContexts: [],
              };
            }
            const m = mentions[cp.code];
            m.count++;
            if (review.sentiment === "positive") m.positiveContext++;
            else if (review.sentiment === "negative") m.negativeContext++;

            if (m.sampleContexts.length < 3) {
              // Extract sentence containing competitor mention
              const sentences = review.content.split(/[.!?]+/);
              const relevant = sentences.find((s) => cp.pattern.test(s));
              if (relevant) {
                // Mask competitor names
                const masked = relevant.trim().slice(0, 120)
                  .replace(/samsung/gi, "SS사")
                  .replace(/galaxy/gi, "SS사")
                  .replace(/sony/gi, "SN사")
                  .replace(/bravia/gi, "SN사")
                  .replace(/tcl|hisense|vizio/gi, "C브랜드")
                  .replace(/whirlpool|bosch|electrolux|maytag|kenmore/gi, "기타가전");
                m.sampleContexts.push(masked);
              }
            }
          }
        }
      }

      return Object.values(mentions).sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000 * 10,
  });
}

const BRAND_COLORS: Record<string, string> = {
  SS: "border-blue-500/20 bg-blue-500/5",
  SN: "border-violet-500/20 bg-violet-500/5",
  C: "border-amber-500/20 bg-amber-500/5",
  ETC: "border-border bg-secondary/20",
};

export function RedditCompetitorMentions({ country = "all" }: { country?: string }) {
  const [range, setRange] = useState<"all" | "weekly">("weekly");
  const { data: mentions, isLoading } = useCompetitorMentions(country, range);
  const totalMentions = mentions?.reduce((s, m) => s + m.count, 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">경쟁사 언급 분석</CardTitle>
            {totalMentions > 0 && (
              <Badge variant="secondary" className="text-[10px]">{totalMentions}건 언급</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setRange("weekly")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                range === "weekly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >주간</button>
            <button
              onClick={() => setRange("all")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                range === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >전체</button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Reddit에서 LG 제품과 함께 언급된 경쟁사 브랜드를 이니셜로 분석합니다. 비교 맥락과 감성을 파악하세요.
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">
          ※ 경쟁사 브랜드명은 직접 노출하지 않으며, 이니셜 또는 범주명으로만 표기합니다.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">분석 중...</div>
        ) : !mentions || mentions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            경쟁사 언급 데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="flex gap-2">
              {mentions.map((m) => {
                const pct = totalMentions > 0 ? Math.round((m.count / totalMentions) * 100) : 0;
                return (
                  <div key={m.code} className={`flex-1 rounded-lg border p-2.5 text-center ${BRAND_COLORS[m.code] || BRAND_COLORS.ETC}`}>
                    <div className="text-lg font-bold text-foreground">{m.count}</div>
                    <div className="text-[10px] text-muted-foreground">{m.label} ({pct}%)</div>
                  </div>
                );
              })}
            </div>

            {/* Detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mentions.map((m) => {
                const neutralCount = m.count - m.positiveContext - m.negativeContext;
                return (
                  <div key={m.code} className={`rounded-lg border p-4 space-y-3 ${BRAND_COLORS[m.code] || BRAND_COLORS.ETC}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{m.label}</span>
                        <Badge variant="secondary" className="text-[9px]">{m.count}건</Badge>
                      </div>
                    </div>

                    {/* Sentiment breakdown */}
                    <div className="flex gap-3 text-[10px]">
                      <span className="flex items-center gap-1 text-success">
                        <TrendingUp className="h-3 w-3" />LG 유리 {m.positiveContext}건
                      </span>
                      <span className="flex items-center gap-1 text-destructive">
                        <TrendingDown className="h-3 w-3" />LG 불리 {m.negativeContext}건
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Minus className="h-3 w-3" />중립 {neutralCount}건
                      </span>
                    </div>

                    {/* Sample contexts (masked) */}
                    {m.sampleContexts.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">언급 맥락 (마스킹됨)</p>
                        {m.sampleContexts.map((ctx, i) => (
                          <p key={i} className="text-[10px] text-foreground/70 leading-relaxed italic pl-2 border-l-2 border-border">
                            "{ctx}…"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
