import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SentimentChart } from "@/components/SentimentChart";
import { ReviewList } from "@/components/ReviewList";
import { MarketingHub } from "@/components/MarketingHub";
import { KeywordCloud } from "@/components/KeywordCloud";
import { CollectionCriteria } from "@/components/CollectionCriteria";

import { RedditCountryInsights } from "@/components/RedditCountryInsights";
import { RedditBucketDashboard } from "@/components/RedditBucketDashboard";
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
import { TrendingDashboard } from "@/components/TrendingDashboard";
import { LgComReviewDashboard } from "@/components/LgComReviewDashboard";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import type { ProductData } from "@/data/dummyData";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages, type MarketingOutput, type GeoMessage } from "@/lib/formatMessage";
import { useProductStats, toReviewFormat } from "@/hooks/useProductData";
import { supabase } from "@/integrations/supabase/client";
import heroBanner from "@/assets/hero-banner.jpg";
import { Activity, BarChart3, Zap, Globe, Database, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { ResultsGroupFilter, extractSubCategory, extractInch, type GroupMode } from "@/components/ResultsGroupFilter";

interface AnalyzedProduct {
  product: ProductData;
  sentiment: SentimentResult;
  marketing: MarketingOutput;
  geoMessages: GeoMessage[];
}

const Index = () => {
  const [results, setResults] = useState<AnalyzedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("subcategory");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const { t, lang, toggleLang } = useLang();
  const { data: stats } = useProductStats();
  

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery(query);

    try {
      const { data: dbProducts, error: dbError } = await supabase
        .from("products")
        .select("*")
        .or(`model_number.ilike.%${query}%,display_name.ilike.%${query}%,category.ilike.%${query}%`)
        .eq("is_active", true);

      if (dbError) throw dbError;

      if (!dbProducts || dbProducts.length === 0) {
        setError(
          t(
            `No data found for "${query}". Data is collected automatically — please try again later or use a different keyword.`,
            `"${query}"에 대한 데이터를 찾을 수 없습니다. 데이터는 자동으로 수집됩니다 — 나중에 다시 시도하거나 다른 키워드를 사용해 보세요.`
          )
        );
        setResults([]);
        setIsLoading(false);
        return;
      }

      const analyzed: AnalyzedProduct[] = [];
      for (const product of dbProducts) {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("*")
          .eq("product_id", product.id)
          .order("collected_at", { ascending: false })
          .limit(50);

        const formattedReviews = (reviews || []).map(toReviewFormat);
        if (formattedReviews.length === 0) continue;

        const sentiment = analyzeSentiment(formattedReviews);
        const marketing = generateMarketingMessage(product.display_name, sentiment, lang);
        const geoMessages = generateGeoMarketingMessages(product.display_name, sentiment);

        analyzed.push({
          product: {
            name: product.model_number,
            displayName: product.display_name,
            category: product.category as any,
            reviews: formattedReviews,
          },
          sentiment,
          marketing,
          geoMessages,
        });
      }

      // Sort: exact model_number match first, then by review count
      analyzed.sort((a, b) => {
        const qLower = query.toLowerCase();
        const aExact = a.product.name.toLowerCase() === qLower ? 1 : 0;
        const bExact = b.product.name.toLowerCase() === qLower ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return b.product.reviews.length - a.product.reviews.length;
      });

      if (analyzed.length === 0) {
        setError(
          t(
            `Products found for "${query}" but no reviews collected yet. Reviews are collected daily — check back soon.`,
            `"${query}" 관련 제품은 있지만 리뷰가 아직 수집되지 않았습니다. 리뷰는 매일 자동 수집됩니다.`
          )
        );
        setResults([]);
      } else {
        setResults(analyzed);
      }
    } catch (e) {
      console.error("Search error:", e);
      setError(
        t(
          "An error occurred while searching. Please try again.",
          "검색 중 오류가 발생했습니다. 다시 시도해 주세요."
        )
      );
      setResults([]);
    }

    setIsLoading(false);
  };

  const hasResults = results.length > 0;

  // Apply filter to results
  const filteredResults = selectedFilter
    ? results.filter((item) => {
        if (groupMode === "subcategory") return extractSubCategory(item.product.displayName) === selectedFilter;
        if (groupMode === "inch") return (extractInch(item.product.displayName) || t("Unknown", "미분류")) === selectedFilter;
        return item.product.name === selectedFilter;
      })
    : results;

  const isMulti = filteredResults.length > 1;

  const groupedResults = filteredResults.reduce<Record<string, AnalyzedProduct[]>>((acc, item) => {
    let key: string;
    if (groupMode === "subcategory") key = extractSubCategory(item.product.displayName);
    else if (groupMode === "inch") key = extractInch(item.product.displayName) || t("Unknown", "미분류");
    else key = item.product.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden gradient-hero">
        <img
          src={heroBanner}
          alt="Dashboard visualization"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-lighten"
        />
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="h-8 w-8 text-primary animate-pulse-glow" />
              <h1 className="text-4xl md:text-5xl font-bold font-heading">
                <span className="text-gradient">
                  D2C Insight Pulse
                </span>
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground/70 italic mb-4">
              Feel the Pulse. Gain the Insight.
            </p>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
              {t(
                "A platform that collects and analyzes real user reviews from major communities and retailers like Reddit and Amazon,\nand provides marketing communication messages.",
                "Reddit · Amazon 등 주요 커뮤니티와 유통사 내 실사용자 리뷰를 수집·분석하여,\n마케팅 커뮤니케이션에 활용 가능한 메시지를 기획·제공하는 플랫폼입니다."
              )}
            </p>
            {stats && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <Badge variant="outline" className="gap-1.5 text-xs border-primary/30">
                  <Database className="h-3 w-3" />
                  {stats.reviewCount > 0
                    ? t(
                        `${stats.productCount} products · ${stats.reviewCount} real reviews collected`,
                        `${stats.productCount}개 제품 · ${stats.reviewCount}건 실제 리뷰 수집됨`
                      )
                    : t(
                        `${stats.productCount} products registered · Awaiting first collection`,
                        `${stats.productCount}개 제품 등록됨 · 첫 수집 대기 중`
                      )}
                </Badge>
              </div>
            )}
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </div>

      {/* Stats Bar */}
      {!hasResults && !error && (
        <div className="container mx-auto px-4 py-12 space-y-10">
          <TrendingDashboard onProductClick={(modelNumber) => handleSearch(modelNumber)} />

          <LgComReviewDashboard onProductClick={(modelNumber) => handleSearch(modelNumber)} />

          <WeeklyInsightsPanel />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: t("Sentiment Analysis", "감성 분석"), desc: t("Automatic positive/negative/neutral classification & scoring", "긍정·부정·중립 자동 분류 및 점수화") },
              { icon: Zap, title: t("Keyword Extraction", "키워드 추출"), desc: t("Auto-extraction of key pros & cons keywords", "장점·단점 핵심 키워드 자동 추출") },
              { icon: Activity, title: t("Marketing Conversion", "마케팅 변환"), desc: t("Auto-generation of Q&A and review guides", "Q&A 및 리뷰 가이드 자동 생성") },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="gradient-card rounded-xl border border-border p-6 text-center hover:border-primary/30 transition-colors">
                <Icon className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold font-heading mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <CollectionCriteria />
            <RedditCountryInsights />
            <NewsletterSubscribe />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="container mx-auto px-4 py-8">
          <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-center flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="container mx-auto px-4 py-8 space-y-6 animate-slide-up">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold font-heading">
              📊 <span className="text-gradient">"{searchQuery}"</span> {t("Search Results", "검색 결과")}
            </h2>
            <Badge variant="secondary" className="text-sm">
              {results.length}{t(" products", "개 제품")}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
              <Database className="h-3 w-3" />
              {t("Live Data", "실제 데이터")}
            </Badge>
          </div>

          <ResultsGroupFilter
            products={results.map((r) => ({
              name: r.product.name,
              displayName: r.product.displayName,
              category: r.product.category,
            }))}
            groupMode={groupMode}
            onGroupModeChange={setGroupMode}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
          />

          {filteredResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("No products match the selected filter.", "선택한 필터에 해당하는 제품이 없습니다.")}
            </p>
          ) : isMulti ? (
            <Tabs defaultValue={filteredResults[0].product.name} className="w-full">
              <div className="space-y-3 mb-6">
                {Object.entries(groupedResults).map(([groupKey, items]) => (
                  <div key={groupKey}>
                    <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary mb-2">
                      {groupKey} ({items.length})
                    </Badge>
                    <TabsList className="h-auto p-1 bg-secondary/50 flex flex-wrap gap-1">
                      {items.map((item) => {
                        const posCount = item.sentiment.positive;
                        const negCount = item.sentiment.negative;
                        const neuCount = item.sentiment.neutral;
                        const isHot = posCount >= 10 && posCount > negCount + neuCount;
                        const isWarn = negCount >= 10 && negCount > posCount + neuCount;
                        return (
                          <TabsTrigger
                            key={item.product.name}
                            value={item.product.name}
                            className={`text-xs px-3 py-1.5 ${
                              isHot
                                ? "text-success font-bold shadow-[0_0_8px_hsl(var(--success)/0.3)] border border-success/40"
                                : isWarn
                                  ? "text-destructive font-bold shadow-[0_0_8px_hsl(var(--destructive)/0.3)] border border-destructive/40"
                                  : ""
                            }`}
                          >
                            {isHot && <span className="mr-1">🔥</span>}
                            {isWarn && <span className="mr-1">⚠️</span>}
                            {item.product.displayName || item.product.name}
                            {isHot && (
                              <span className="ml-1.5 text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">
                                +{posCount}
                              </span>
                            )}
                            {isWarn && (
                              <span className="ml-1.5 text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">
                                -{negCount}
                              </span>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>
                ))}
              </div>

              {filteredResults.map((item) => (
                <TabsContent key={item.product.name} value={item.product.name} className="space-y-6">
                  <ProductAnalysisView item={item} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <ProductAnalysisView item={filteredResults[0]} />
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 flex flex-col items-center gap-1.5">
          <p className="text-sm text-muted-foreground text-center leading-snug">
            {t(
              "Starting from real customer voices, an insight platform that drives the brand's next move — D2C Insight Pulse",
              "고객의 진짜 목소리에서 출발해, 브랜드의 다음 움직임을 이끄는 인사이트 플랫폼 — D2C Insight Pulse"
            )}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            {t(
              "Presented by LG Electronics D2C Marketing Strategy Team",
              "Presented by LG전자 D2C마케팅전략팀"
            )}
          </p>
          <button
            onClick={toggleLang}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            <Globe className="h-4 w-4" />
            {lang === "ko" ? "Switch to English (Original)" : "한국어로 전환 (번역)"}
          </button>
        </div>
      </footer>
    </div>
  );
};

function ProductAnalysisView({ item }: { item: AnalyzedProduct }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
          {item.product.category}
        </Badge>
        <h3 className="text-xl font-bold font-heading">
          {item.product.displayName || item.product.name}
        </h3>
        <span className="text-sm text-muted-foreground font-mono">
          {item.product.name}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentChart sentiment={item.sentiment} />
        <KeywordCloud keywords={item.sentiment.keywords} />
      </div>

      {item.product.reviews.length > 0 && (
        <>
          <MarketingHub
            geoMessages={item.geoMessages}
            productName={item.product.name}
            displayName={item.product.displayName}
            totalReviews={item.product.reviews.length}
            marketing={item.marketing}
            sentiment={item.sentiment}
            reviews={item.product.reviews}
          />
          {/* ActionPlanPanel hidden — re-enable when sufficient data is available */}
        </>
      )}
      <ReviewList reviews={item.product.reviews} />
    </>
  );
}

export default Index;
