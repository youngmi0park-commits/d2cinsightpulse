import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store, ThumbsUp, ThumbsDown, Filter, ChevronDown, Copy, Globe, Calendar,
  Loader2, Package, Hash, Sparkles, MessageSquareQuote
} from "lucide-react";
import { toast } from "sonner";

type SentimentFilter = "ALL" | "positive" | "negative";
type CountryFilter = "all" | "US" | "UK";
type PeriodFilter = "weekly" | "all";

function useLgComProductInsights(period: PeriodFilter, country: CountryFilter) {
  return useQuery({
    queryKey: ["lgcom-product-insights-v2", period, country],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("id, title, content, sentiment, sentiment_score, source, rating, products!inner(display_name, category)")
        .order("collected_at", { ascending: false });

      if (country === "US") query = query.eq("source", "lge_com_us");
      else if (country === "UK") query = query.eq("source", "lge_com_uk");
      else query = query.like("source", "lge_com%");

      if (period === "weekly") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("collected_at", weekAgo);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;

      // Group by product + sentiment → aggregate title phrases as insights
      const productMap: Record<string, {
        productName: string;
        category: string;
        sentiment: string;
        titlePhrases: Record<string, number>;
        snippets: string[]; // short content excerpts
        sources: Set<string>;
        count: number;
        avgRating: number;
        ratingCount: number;
      }> = {};

      for (const r of data || []) {
        const prod = (r as any).products;
        if (!prod) continue;
        const key = `${prod.display_name}__${r.sentiment}`;

        if (!productMap[key]) {
          productMap[key] = {
            productName: prod.display_name,
            category: prod.category,
            sentiment: r.sentiment || "neutral",
            titlePhrases: {},
            snippets: [],
            sources: new Set(),
            count: 0,
            avgRating: 0,
            ratingCount: 0,
          };
        }
        productMap[key].count++;
        productMap[key].sources.add(r.source);
        if (r.rating) {
          productMap[key].avgRating += r.rating;
          productMap[key].ratingCount++;
        }

        const title = (r.title || "").trim();
        if (title && title.length > 1) {
          productMap[key].titlePhrases[title] = (productMap[key].titlePhrases[title] || 0) + 1;
        }

        // Extract a meaningful snippet from content (first meaningful sentence, max 80 chars)
        if (r.content && productMap[key].snippets.length < 8) {
          const sentences = r.content
            .replace(/\n+/g, ". ")
            .split(/[.!?]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 15 && s.length < 120);
          if (sentences.length > 0) {
            const snippet = sentences[0].length > 80 ? sentences[0].slice(0, 77) + "..." : sentences[0];
            if (!productMap[key].snippets.includes(snippet)) {
              productMap[key].snippets.push(snippet);
            }
          }
        }
      }

      return Object.values(productMap)
        .map((p) => {
          // Sort title phrases by frequency, take top ones as "key comments"
          const sortedPhrases = Object.entries(p.titlePhrases)
            .sort((a, b) => b[1] - a[1]);
          
          // Top phrases (most frequent) as key insights
          const topPhrases = sortedPhrases.slice(0, 5).map(([phrase, count]) => ({ phrase, count }));
          
          // Extract single-word keywords from all titles for tag cloud
          const wordFreq: Record<string, number> = {};
          for (const [phrase, cnt] of sortedPhrases) {
            const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
            words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + cnt; });
          }
          const keywords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([w]) => w);

          return {
            productName: p.productName,
            category: p.category,
            sentiment: p.sentiment,
            count: p.count,
            topPhrases,
            keywords,
            snippets: p.snippets.slice(0, 3), // top 3 content excerpts
            avgRating: p.ratingCount > 0 ? (p.avgRating / p.ratingCount).toFixed(1) : null,
            sources: Array.from(p.sources),
          };
        })
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000 * 10,
  });
}

const STOP_WORDS = new Set([
  "the", "and", "for", "this", "that", "with", "but", "are", "was", "has", "have",
  "not", "very", "just", "been", "will", "its", "than", "also", "from", "they",
  "can", "had", "would", "could", "our", "your", "one", "all", "there", "their",
]);

const SENTIMENT_STYLES = {
  positive: { bg: "bg-success/8", border: "border-success/20", text: "text-success", icon: ThumbsUp },
  negative: { bg: "bg-destructive/8", border: "border-destructive/20", text: "text-destructive", icon: ThumbsDown },
  neutral: { bg: "bg-muted/30", border: "border-border", text: "text-muted-foreground", icon: Package },
};

export function LgComProductInsightCards() {
  const { t } = useLang();
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("ALL");
  const [country, setCountry] = useState<CountryFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("weekly");
  const [showCount, setShowCount] = useState(12);

  const { data: insights, isLoading } = useLgComProductInsights(period, country);

  const filtered = useMemo(() => {
    if (!insights) return [];
    if (sentimentFilter === "ALL") return insights;
    return insights.filter((p) => p.sentiment === sentimentFilter);
  }, [insights, sentimentFilter]);

  const displayed = filtered.slice(0, showCount);

  const counts = useMemo(() => {
    if (!insights) return { total: 0, positive: 0, negative: 0 };
    return {
      total: insights.length,
      positive: insights.filter((p) => p.sentiment === "positive").length,
      negative: insights.filter((p) => p.sentiment === "negative").length,
    };
  }, [insights]);

  const handleCopy = (item: typeof displayed[0]) => {
    const phrases = item.topPhrases.map(p => `• "${p.phrase}" (${p.count}건)`).join("\n");
    const text = `[${item.sentiment?.toUpperCase()}] ${item.productName} (${item.category})\n${item.avgRating ? `⭐ ${item.avgRating}` : ""}\n언급 ${item.count}건\n\n주요 코멘트:\n${phrases}\n\n키워드: ${item.keywords.join(", ")}`;
    navigator.clipboard.writeText(text);
    toast.success("복사 완료!");
  };

  if (isLoading) {
    return (
      <Card className="gradient-card border-border">
        <CardContent className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("Analyzing product insights...", "제품 인사이트 분석 중...")}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-heading">
              {t("Product Insight Cards", "제품 인사이트 카드")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Period */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <Calendar className="h-3 w-3 text-muted-foreground ml-1.5" />
              {(["weekly", "all"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => { setPeriod(v); setShowCount(12); }}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium transition-colors ${
                    period === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "weekly" ? t("Weekly", "주간") : t("All", "전체")}
                </button>
              ))}
            </div>
            {/* Country */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <Globe className="h-3 w-3 text-muted-foreground ml-1.5" />
              {([
                { v: "all" as const, l: "🌐", label: t("All", "전체") },
                { v: "US" as const, l: "🇺🇸", label: "US" },
                { v: "UK" as const, l: "🇬🇧", label: "UK" },
              ]).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => { setCountry(opt.v); setShowCount(12); }}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium transition-colors ${
                    country === opt.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.l} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "Which products are getting positive/negative mentions and what comments are being made",
            "어떤 제품이 긍정/부정 언급되고 있고, 어떤 코멘트가 달리는지 한눈에 확인하세요"
          )}
        </p>

        {/* Sentiment filter */}
        <div className="flex items-center gap-1.5 mt-3">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {([
            { v: "ALL" as const, label: t("All", "전체"), count: counts.total },
            { v: "positive" as const, label: t("Positive", "긍정"), count: counts.positive },
            { v: "negative" as const, label: t("Negative", "부정"), count: counts.negative },
          ]).map((b) => (
            <button
              key={b.v}
              onClick={() => { setSentimentFilter(b.v); setShowCount(12); }}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                sentimentFilter === b.v
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label} ({b.count})
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((item, idx) => {
            const style = SENTIMENT_STYLES[item.sentiment as keyof typeof SENTIMENT_STYLES] || SENTIMENT_STYLES.neutral;
            const Icon = style.icon;
            return (
              <div
                key={`${item.productName}-${item.sentiment}-${idx}`}
                className={`rounded-lg border ${style.border} ${style.bg} p-3.5 space-y-2.5 hover:shadow-md transition-shadow`}
              >
                {/* Header: sentiment + count + rating */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={`text-[9px] ${style.text} ${style.border} gap-1`}>
                    <Icon className="h-3 w-3" />
                    {item.sentiment?.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {item.avgRating && (
                      <span className="text-[10px] font-medium text-foreground">⭐ {item.avgRating}</span>
                    )}
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                      {item.count}{t(" mentions", "건")}
                    </span>
                    {item.sources?.map((s: string) => (
                      <span key={s} className="text-[10px]">
                        {s === "lge_com_us" ? "🇺🇸" : s === "lge_com_uk" ? "🇬🇧" : ""}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Product name */}
                <div>
                  <p className="text-xs font-semibold text-foreground line-clamp-2">
                    📦 {item.productName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
                </div>

                {/* Key comment phrases — the main insight */}
                {item.topPhrases.length > 0 && (
                  <div className="space-y-1 bg-background/50 rounded-md p-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                      <MessageSquareQuote className="h-3 w-3" />
                      <span className="font-medium">{t("Key Comments", "주요 코멘트")}</span>
                    </div>
                    {item.topPhrases.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground truncate flex-1">"{p.phrase}"</span>
                        <Badge variant="secondary" className="text-[8px] px-1 py-0 ml-1 shrink-0">
                          ×{p.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Keywords */}
                {item.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-[9px] px-1.5 py-0">
                        <Hash className="h-2.5 w-2.5 mr-0.5" />{kw}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-[9px] text-muted-foreground">LG.com Verified</span>
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px]" onClick={() => handleCopy(item)}>
                    <Copy className="h-2.5 w-2.5 mr-0.5" />{t("Copy", "복사")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length > showCount && (
          <button
            onClick={() => setShowCount((p) => p + 12)}
            className="w-full mt-4 py-2 text-xs text-primary hover:underline flex items-center justify-center gap-1"
          >
            <ChevronDown className="h-3 w-3" />
            {t("Show more", "더보기")} ({filtered.length - showCount}{t(" remaining", "건 남음")})
          </button>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("No product insights available for this filter.", "해당 필터의 제품 인사이트가 없습니다.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
