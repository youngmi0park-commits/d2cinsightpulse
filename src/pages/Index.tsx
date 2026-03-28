import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { GlobalFilterBar, type GlobalFilters } from "@/components/GlobalFilterBar";
import { DataStatusBar } from "@/components/DataStatusBar";
import { ChannelSentimentWidget } from "@/components/ChannelSentimentWidget";
import { TopKeywordsWidget } from "@/components/TopKeywordsWidget";
import { TopProductsWidget } from "@/components/TopProductsWidget";
import { SentimentChart } from "@/components/SentimentChart";
import { ReviewList } from "@/components/ReviewList";
import { KeywordCloud } from "@/components/KeywordCloud";
import { MarketingHub } from "@/components/MarketingHub";
import { CollectionCriteria } from "@/components/CollectionCriteria";
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
import { TrendingDashboard } from "@/components/TrendingDashboard";
import { LgComReviewDashboard } from "@/components/LgComReviewDashboard";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { ResultsGroupFilter, extractSubCategory, extractInch, type GroupMode } from "@/components/ResultsGroupFilter";
import type { ProductData } from "@/data/dummyData";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages, type MarketingOutput, type GeoMessage } from "@/lib/formatMessage";
import { useProductStats, toReviewFormat } from "@/hooks/useProductData";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Database, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";

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
  const { t, lang } = useLang();
  const { data: stats } = useProductStats();
  const [filters, setFilters] = useState<GlobalFilters>({
    country: "global",
    timeframe: "weekly",
  });

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
        setError(t(
          `No data found for "${query}". Data is collected automatically — please try again later or use a different keyword.`,
          `"${query}"에 대한 데이터를 찾을 수 없습니다.`
        ));
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

      analyzed.sort((a, b) => {
        const qLower = query.toLowerCase();
        const aExact = a.product.name.toLowerCase() === qLower ? 1 : 0;
        const bExact = b.product.name.toLowerCase() === qLower ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return b.product.reviews.length - a.product.reviews.length;
      });

      if (analyzed.length === 0) {
        setError(t(
          `Products found for "${query}" but no reviews collected yet.`,
          `"${query}" 관련 제품은 있지만 리뷰가 아직 수집되지 않았습니다.`
        ));
        setResults([]);
      } else {
        setResults(analyzed);
      }
    } catch (e) {
      console.error("Search error:", e);
      setError(t("An error occurred while searching. Please try again.", "검색 중 오류가 발생했습니다."));
      setResults([]);
    }

    setIsLoading(false);
  };

  const hasResults = results.length > 0;

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
      {/* Hero Section — warm cream */}
      <div className="relative overflow-hidden gradient-hero">
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="h-8 w-8 text-primary animate-pulse-glow" />
              <h1 className="text-4xl md:text-5xl font-bold font-heading">
                <span className="text-gradient">D2C Insight Pulse</span>
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground/70 italic mb-4">
              Feel the Pulse. Gain the Insight.
            </p>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
              {"Reddit · Amazon 등 주요 커뮤니티와 유통사 내 실사용자 리뷰를 수집·분석하여,\n마케팅 커뮤니케이션에 활용 가능한 메시지를 기획·제공하는 플랫폼입니다."}
            </p>
            {stats && (
              <div className="flex items-center justify-center gap-2 mt-5">
                <Badge variant="outline" className="gap-1.5 text-xs border-primary/30">
                  <Database className="h-3 w-3" />
                  {stats.productCount}개 제품 · {stats.reviewCount.toLocaleString()}건 실제 리뷰 수집됨
                </Badge>
              </div>
            )}
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </div>

      {/* Dashboard Widgets (visible when no search results) */}
      {!hasResults && !error && (
        <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
          <TrendingDashboard onProductClick={(m) => handleSearch(m)} />

          {/* Data Status Bar + Country Filter — below trending */}
          <DataStatusBar />
          <GlobalFilterBar filters={filters} onChange={setFilters} />

          <LgComReviewDashboard onProductClick={(m) => handleSearch(m)} />

          {/* Widget A: Channel Sentiment Overview */}
          <ChannelSentimentWidget filters={filters} />

          {/* Widget B: Top Keywords */}
          <TopKeywordsWidget filters={filters} />

          {/* Widget C: Top Products by Sentiment */}
          <TopProductsWidget filters={filters} onProductClick={(m) => handleSearch(m)} />

          <WeeklyInsightsPanel />




          <CollectionCriteria />
          <NewsletterSubscribe />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-6 max-w-[1400px] mx-auto">
          <div className="p-5 rounded-xl border border-destructive/30 bg-destructive/5 text-center flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasResults && (
        <div className="p-6 space-y-5 max-w-[1400px] mx-auto animate-slide-up">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold">
              📊 <span className="text-primary">"{searchQuery}"</span> {t("Search Results", "검색 결과")}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {results.length}{t(" products", "개 제품")}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
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
              <div className="space-y-3 mb-5">
                {Object.entries(groupedResults).map(([groupKey, items]) => (
                  <div key={groupKey}>
                    <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary mb-2">
                      {groupKey} ({items.length})
                    </Badge>
                    <TabsList className="h-auto p-1 bg-secondary/50 flex flex-wrap gap-1">
                      {items.map((item) => (
                        <TabsTrigger key={item.product.name} value={item.product.name} className="text-xs px-3 py-1.5">
                          {item.product.displayName || item.product.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                ))}
              </div>
              {filteredResults.map((item) => (
                <TabsContent key={item.product.name} value={item.product.name} className="space-y-5">
                  <ProductAnalysisView item={item} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <ProductAnalysisView item={filteredResults[0]} />
          )}
        </div>
      )}
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
        <h3 className="text-lg font-bold">{item.product.displayName || item.product.name}</h3>
        <span className="text-xs text-muted-foreground font-mono">{item.product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SentimentChart sentiment={item.sentiment} />
        <KeywordCloud keywords={item.sentiment.keywords} />
      </div>

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
      <ReviewList reviews={item.product.reviews} />
    </>
  );
}

export default Index;
