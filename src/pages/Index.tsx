import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { PageHeader } from "@/components/PageHeader";
import { TrendingDashboard } from "@/components/TrendingDashboard";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { ResultsGroupFilter, extractSubCategory, extractInch, type GroupMode } from "@/components/ResultsGroupFilter";
import type { ProductData } from "@/data/dummyData";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages, type MarketingOutput, type GeoMessage } from "@/lib/formatMessage";
import { useProductStats, toReviewFormat } from "@/hooks/useProductData";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Database, Activity, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { SearchResultCards, type AnalyzedProduct } from "@/components/SearchResultCards";


const Index = () => {
  const [results, setResults] = useState<AnalyzedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("subcategory");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const { t, lang } = useLang();
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


  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section — warm cream */}
      <div className="relative overflow-hidden gradient-hero">
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="h-8 w-8 text-primary animate-pulse-glow" />
              <h1 className="text-4xl md:text-5xl font-bold font-heading">
                <span className="text-primary">D2C Insight Pulse</span>
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground/70 italic mb-4">
              Feel the Pulse. Gain the Insight.
            </p>
            <p className="text-[11px] md:text-xs max-w-2xl mx-auto leading-relaxed whitespace-pre-line" style={{ color: '#6B6B6B' }}>
              <strong className="text-foreground">고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.</strong>{"\n"}D2C Insight Pulse는 LG.com과 Reddit 등 주요 채널의 실사용자 리뷰를 깊이 있게 분석합니다.{"\n"}방대한 데이터 속 숨겨진 인사이트를 발견하고, 즉시 활용 가능한 최적의 마케팅 메시지를 제공하는 데이터 플랫폼입니다.
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
          <PageHeader
            icon={LayoutDashboard}
            title="📊 Main Overview"
            description="전체 채널의 리뷰 수집 현황과 주요 트렌드를 한눈에 파악할 수 있는 대시보드입니다. 실시간 트렌딩 제품, 채널별 리뷰 통계, 주간 TOP 3 마케팅 액션 아이템을 확인하세요."
          />
          <TrendingDashboard onProductClick={(m) => handleSearch(m)} />
          <OverviewDashboard />
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
          ) : (
            <SearchResultCards results={filteredResults} />
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-8 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          고객의 진짜 목소리에서 출발해, 브랜드의 다음 움직임을 이끄는 인사이트 플랫폼 — D2C Insight Pulse
        </p>
        <p className="text-xs text-muted-foreground">
          Presented by LG전자 D2C마케팅전략팀
        </p>
      </footer>
    </div>
  );
};


export default Index;
