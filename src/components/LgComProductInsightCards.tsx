import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductSearchInput } from "@/components/ProductSearchInput";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ThumbsUp, ThumbsDown, Filter, ChevronDown, Copy, Globe, Calendar,
  Loader2, Package, Hash, Sparkles, MessageSquareQuote, Search, X
} from "lucide-react";
import { toast } from "sonner";
import { resolveCategoryEn } from "@/lib/categoryInference";

type SentimentFilter = "ALL" | "positive" | "negative";
type CountryFilter = "all" | "US" | "UK";
type PeriodFilter = "weekly" | "all";

/* ─── Hook: product-specific review details ─── */
function useProductReviewDetails(productId: string | null, country: CountryFilter) {
  return useQuery({
    queryKey: ["lgcom-product-review-details", productId, country],
    queryFn: async () => {
      if (!productId) return null;

      let query = supabase
        .from("reviews")
        .select("id, title, content, sentiment, sentiment_score, rating, source, published_at, product_id")
        .eq("product_id", productId)
        .order("published_at", { ascending: false });

      if (country === "US") query = query.eq("source", "lge_com_us");
      else if (country === "UK") query = query.eq("source", "lge_com_uk");
      else query = query.like("source", "lge_com%");

      const { data, error } = await query.limit(200);
      if (error) throw error;

      const reviews = data || [];
      const posReviews = reviews.filter(r => r.sentiment === "positive");
      const negReviews = reviews.filter(r => r.sentiment === "negative");

      const extractMentions = (revs: typeof reviews) => {
        const titleFreq: Record<string, number> = {};
        const snippets: string[] = [];

        for (const r of revs) {
          const title = (r.title || "").trim();
          if (title && title.length > 1) {
            titleFreq[title] = (titleFreq[title] || 0) + 1;
          }
          if (r.content && snippets.length < 5) {
            const text = r.content.replace(/^\[LG 리뷰.*?\]\s*/, "").replace(/개인정보 보호 정책에 따라.*$/, "").trim();
            if (text.length > 20 && !text.startsWith("[")) {
              const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15 && s.length < 150);
              if (sentences.length > 0 && !snippets.includes(sentences[0])) {
                snippets.push(sentences[0].length > 100 ? sentences[0].slice(0, 97) + "..." : sentences[0]);
              }
            }
          }
        }

        return {
          topMentions: Object.entries(titleFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([phrase, count]) => ({ phrase, count })),
          snippets: snippets.slice(0, 5),
        };
      };

      const ratings = reviews.filter(r => r.rating != null).map(r => r.rating!);
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

      return {
        total: reviews.length,
        posCount: posReviews.length,
        negCount: negReviews.length,
        avgRating,
        positive: extractMentions(posReviews),
        negative: extractMentions(negReviews),
      };
    },
    enabled: !!productId,
    staleTime: 60_000 * 5,
  });
}

/* ─── Hook: aggregated product insights ─── */
function useLgComProductInsights(period: PeriodFilter, country: CountryFilter) {
  return useQuery({
    queryKey: ["lgcom-product-insights-v2", period, country],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("id, title, content, sentiment, sentiment_score, source, rating, products!inner(display_name, category, model_number)")
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

      const productMap: Record<string, {
        productName: string; category: string; modelNumber: string; sentiment: string;
        titlePhrases: Record<string, number>; snippets: string[];
        sources: Set<string>; count: number; avgRating: number; ratingCount: number;
      }> = {};

      for (const r of data || []) {
        const prod = (r as any).products;
        if (!prod) continue;
        const key = `${prod.display_name}__${r.sentiment}`;

        if (!productMap[key]) {
          productMap[key] = {
            productName: prod.display_name, category: prod.category, modelNumber: prod.model_number,
            sentiment: r.sentiment || "neutral", titlePhrases: {}, snippets: [],
            sources: new Set(), count: 0, avgRating: 0, ratingCount: 0,
          };
        }
        productMap[key].count++;
        productMap[key].sources.add(r.source);
        if (r.rating) { productMap[key].avgRating += r.rating; productMap[key].ratingCount++; }

        const title = (r.title || "").trim();
        if (title && title.length > 1) {
          productMap[key].titlePhrases[title] = (productMap[key].titlePhrases[title] || 0) + 1;
        }

        if (r.content && productMap[key].snippets.length < 8) {
          const text = r.content.replace(/^\[LG 리뷰.*?\]\s*/, "").replace(/개인정보 보호 정책에 따라.*$/, "").trim();
          if (text.length > 20 && !text.startsWith("[")) {
            const sentences = text.split(/[.!?]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 15 && s.length < 120);
            if (sentences.length > 0 && !productMap[key].snippets.includes(sentences[0])) {
              productMap[key].snippets.push(sentences[0].length > 80 ? sentences[0].slice(0, 77) + "..." : sentences[0]);
            }
          }
        }
      }

      return Object.values(productMap)
        .map((p) => {
          const sortedPhrases = Object.entries(p.titlePhrases).sort((a, b) => b[1] - a[1]);
          const topPhrases = sortedPhrases.slice(0, 5).map(([phrase, count]) => ({ phrase, count }));
          const wordFreq: Record<string, number> = {};
          for (const [phrase, cnt] of sortedPhrases) {
            phrase.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
              .forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + cnt; });
          }
          const keywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
          return {
            productName: p.productName, category: p.category, modelNumber: p.modelNumber, sentiment: p.sentiment,
            count: p.count, topPhrases, keywords, snippets: p.snippets.slice(0, 3),
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
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; display_name: string; model_number: string; category: string } | null>(null);

  const { data: insights, isLoading } = useLgComProductInsights(period, country);
  const { data: productDetails, isLoading: detailsLoading } = useProductReviewDetails(selectedProduct?.id || null, country);

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

  const handleCopyProductDetail = () => {
    if (!selectedProduct || !productDetails) return;
    const lines = [
      `📦 ${selectedProduct.display_name} (${selectedProduct.model_number})`,
      `카테고리: ${selectedProduct.category}`,
      `리뷰 총 ${productDetails.total}건 | 긍정 ${productDetails.posCount} | 부정 ${productDetails.negCount} | 평점 ${productDetails.avgRating || "N/A"}`,
      "", "✅ 긍정 언급:",
      ...productDetails.positive.topMentions.map(m => `  • "${m.phrase}" (${m.count}건)`),
      "", "❌ 부정 언급:",
      ...productDetails.negative.topMentions.map(m => `  • "${m.phrase}" (${m.count}건)`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("제품 분석 결과 복사 완료!");
  };

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

        {/* Product Search */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">{t("Search a product — see what's being said on LG.com", "제품 검색 — LG.com에서 이 제품에 대해 어떤 이야기가 오가는지 확인")}</span>
          </div>
          <div className="flex items-center gap-2">
            <ProductSearchInput
              onSelect={(product) => setSelectedProduct(product)}
              placeholder={t("Search product name or model...", "제품명 또는 모델명 검색...")}
              className="flex-1 max-w-md"
            />
            {selectedProduct && (
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* ─── Product Detail View ─── */}
        {selectedProduct && (
          <div className="mb-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2" title={selectedProduct.model_number}>
                    📦 {selectedProduct.display_name}
                    <Badge variant="secondary" className="text-[10px]">{selectedProduct.category}</Badge>
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{selectedProduct.model_number}</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleCopyProductDetail}>
                  <Copy className="h-3 w-3" /> {t("Copy All", "전체 복사")}
                </Button>
              </div>

              {detailsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">{t("Analyzing reviews...", "리뷰 분석 중...")}</span>
                </div>
              ) : productDetails && productDetails.total > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: t("Total", "총 리뷰"), value: productDetails.total, color: "text-foreground" },
                      { label: t("Positive", "긍정"), value: productDetails.posCount, color: "text-success" },
                      { label: t("Negative", "부정"), value: productDetails.negCount, color: "text-destructive" },
                      { label: t("Avg Rating", "평균 평점"), value: productDetails.avgRating ? `⭐ ${productDetails.avgRating}` : "—", color: "text-foreground" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-2 rounded-lg bg-background/60 border border-border/50">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Positive mentions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs font-bold text-success">{t("Positive Mentions", "긍정 언급")} TOP 10</span>
                    </div>
                    {productDetails.positive.topMentions.length > 0 ? (
                      <div className="space-y-1">
                        {productDetails.positive.topMentions.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 bg-success/5 border border-success/10 rounded-md px-3 py-1.5">
                            <span className="text-[10px] font-bold text-success/70 w-4">{i + 1}</span>
                            <span className="text-xs text-foreground flex-1">"{m.phrase}"</span>
                            <Badge variant="outline" className="text-[9px] border-success/20 text-success shrink-0">×{m.count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground pl-5">{t("No positive mentions found", "긍정 언급 없음")}</p>
                    )}
                    {productDetails.positive.snippets.length > 0 && (
                      <div className="pl-5 space-y-1 mt-1">
                        <p className="text-[10px] text-muted-foreground font-medium">💬 {t("Sample comments", "코멘트 샘플")}</p>
                        {productDetails.positive.snippets.map((s, i) => (
                          <p key={i} className="text-[10px] text-foreground/70 leading-relaxed pl-2 border-l-2 border-success/20 italic">{s}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Negative mentions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs font-bold text-destructive">{t("Negative Mentions", "부정 언급")} TOP 10</span>
                    </div>
                    {productDetails.negative.topMentions.length > 0 ? (
                      <div className="space-y-1">
                        {productDetails.negative.topMentions.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 bg-destructive/5 border border-destructive/10 rounded-md px-3 py-1.5">
                            <span className="text-[10px] font-bold text-destructive/70 w-4">{i + 1}</span>
                            <span className="text-xs text-foreground flex-1">"{m.phrase}"</span>
                            <Badge variant="outline" className="text-[9px] border-destructive/20 text-destructive shrink-0">×{m.count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground pl-5">{t("No negative mentions found", "부정 언급 없음")}</p>
                    )}
                    {productDetails.negative.snippets.length > 0 && (
                      <div className="pl-5 space-y-1 mt-1">
                        <p className="text-[10px] text-muted-foreground font-medium">💬 {t("Sample comments", "코멘트 샘플")}</p>
                        {productDetails.negative.snippets.map((s, i) => (
                          <p key={i} className="text-[10px] text-foreground/70 leading-relaxed pl-2 border-l-2 border-destructive/20 italic">{s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("No LG.com reviews found for this product.", "이 제품에 대한 LG.com 리뷰가 없습니다.")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Aggregated Grid ─── */}
        {!selectedProduct && (
          <>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
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
              <div className="flex items-center gap-1.5">
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
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t("Analyzing product insights...", "제품 인사이트 분석 중...")}</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayed.map((item, idx) => {
                    const style = SENTIMENT_STYLES[item.sentiment as keyof typeof SENTIMENT_STYLES] || SENTIMENT_STYLES.neutral;
                    const Icon = style.icon;
                    return (
                      <div
                        key={`${item.productName}-${item.sentiment}-${idx}`}
                        className={`rounded-lg border ${style.border} ${style.bg} p-3.5 space-y-2.5 hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className={`text-[9px] ${style.text} ${style.border} gap-1`}>
                            <Icon className="h-3 w-3" />
                            {item.sentiment?.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            {item.avgRating && <span className="text-[10px] font-medium text-foreground">⭐ {item.avgRating}</span>}
                            <span className="text-[10px] font-mono font-semibold text-muted-foreground">{item.count}{t(" mentions", "건")}</span>
                            {item.sources?.map((s: string) => (
                              <span key={s} className="text-[10px]">{s === "lge_com_us" ? "🇺🇸" : s === "lge_com_uk" ? "🇬🇧" : ""}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground line-clamp-2">📦 {item.productName}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
                        </div>
                        {item.topPhrases.length > 0 && (
                          <div className="space-y-1 bg-background/50 rounded-md p-2">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                              <MessageSquareQuote className="h-3 w-3" />
                              <span className="font-medium">{t("Key Comments", "주요 코멘트")}</span>
                            </div>
                            {item.topPhrases.map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px]">
                                <span className="text-foreground truncate flex-1">"{p.phrase}"</span>
                                <Badge variant="secondary" className="text-[8px] px-1 py-0 ml-1 shrink-0">×{p.count}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.snippets && item.snippets.length > 0 && (
                          <div className="space-y-1 border-t border-border/30 pt-2">
                            <div className="text-[10px] text-muted-foreground font-medium">💬 {t("Review Excerpts", "리뷰 발췌")}</div>
                            {item.snippets.map((s: string, i: number) => (
                              <p key={i} className="text-[10px] text-foreground/80 leading-relaxed pl-2 border-l-2 border-primary/20">{s}</p>
                            ))}
                          </div>
                        )}
                        {item.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.keywords.map((kw) => (
                              <Badge key={kw} variant="secondary" className="text-[9px] px-1.5 py-0">
                                <Hash className="h-2.5 w-2.5 mr-0.5" />{kw}
                              </Badge>
                            ))}
                          </div>
                        )}
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
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
