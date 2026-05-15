import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { DataStatusBar } from "@/components/DataStatusBar";
import { PageHeader } from "@/components/PageHeader";
import { TrendingDashboard } from "@/components/TrendingDashboard";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { CountryFilterBar, countryToSourceFilter } from "@/components/CountryFilterBar";
import type { ProductData } from "@/data/dummyData";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages, type MarketingOutput, type GeoMessage } from "@/lib/formatMessage";
import { useProductStats, toReviewFormat } from "@/hooks/useProductData";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Database, Activity, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { type AnalyzedProduct } from "@/components/SearchResultCards";
import { CategorySearchResults } from "@/components/CategorySearchResults";


const Index = () => {
  const [results, setResults] = useState<AnalyzedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const { t, lang } = useLang();
  const { data: stats } = useProductStats();


  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery(query);

    try {
      // Search across model_number, display_name, category, sub_category
      const { data: dbProducts, error: dbError } = await supabase
        .from("products")
        .select("*")
        .or(`model_number.ilike.%${query}%,display_name.ilike.%${query}%,category.ilike.%${query}%,sub_category.ilike.%${query}%`)
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

      // If query matches a category exactly, filter out products from other categories
      const categoryKeywords: Record<string, string[]> = {
        // TV
        "tv":              ["TV"],
        "oled":            ["TV"],
        "qled":            ["TV"],
        "4k tv":           ["TV"],
        "standbyme":       ["TV"],
        "lg tv":           ["TV"],
        "monitor":         ["Monitor"],
        "모니터":          ["Monitor"],
        // 냉장고
        "refrigerator":    ["Refrigerator"],
        "fridge":          ["Refrigerator"],
        "ice maker":       ["Refrigerator"],
        "french door":     ["Refrigerator"],
        "냉장고":          ["Refrigerator"],
        // 세탁기·건조기
        "washer":          ["Washer"],
        "washing machine": ["Washer"],
        "세탁기":          ["Washer"],
        "dryer":           ["Dryer"],
        "건조기":          ["Dryer"],
        // 식기세척기
        "dishwasher":      ["Dishwasher"],
        "식기세척기":      ["Dishwasher"],
        // 청소기
        "vacuum":          ["Vacuum"],
        "cordzero":        ["Vacuum"],
        "청소기":          ["Vacuum"],
        // 에어컨·공기청정기
        "air conditioner": ["Air Conditioner"],
        "ac":              ["Air Conditioner"],
        "에어컨":          ["Air Conditioner"],
        "dual inverter":   ["Air Conditioner"],
        "air purifier":    ["Air Purifier"],
        "puricare":        ["Air Purifier"],
        "aerotower":       ["Air Purifier"],
        "공기청정기":      ["Air Purifier"],
        // 기타
        "soundbar":        ["Soundbar", "Audio"],
        "사운드바":        ["Soundbar", "Audio"],
        "laptop":          ["Laptop"],
        "gram":            ["Laptop"],
        "노트북":          ["Laptop"],
        "range":           ["Range"],
        "oven":            ["Range"],
        "cooktop":         ["Cooktop"],
        "microwave":       ["Microwave"],
        "전자레인지":      ["Microwave"],
      };
      const qLower = query.toLowerCase().trim();
      const matchedCategories = categoryKeywords[qLower];
      let filteredProducts = dbProducts;
      if (matchedCategories) {
        const catFiltered = dbProducts.filter((p) =>
          matchedCategories.some((c) => p.category.toLowerCase() === c.toLowerCase())
        );
        if (catFiltered.length > 0) filteredProducts = catFiltered;
      }


      const sourcesFilter = countryToSourceFilter(selectedCountry);

      // Group products by display_name to consolidate fragmented entries
      const productGroups = new Map<string, typeof dbProducts>();
      for (const product of filteredProducts) {
        // Normalize display name for grouping (strip size prefix like "27" / "55 inch")
        const normName = product.display_name
          .replace(/^\d+["″]?\s*/i, "")
          .replace(/^\d+\s*inch\s*/i, "")
          .replace(/\s*\(.*?\)\s*$/, "")
          .trim();
        const key = normName || product.display_name;
        if (!productGroups.has(key)) productGroups.set(key, []);
        productGroups.get(key)!.push(product);
      }

      // ── 그룹 내 카테고리 다수결 — 오염 방지 ──
      for (const [key, prods] of productGroups) {
        const catCounts = prods.reduce<Record<string, number>>((acc, p) => {
          acc[p.category] = (acc[p.category] ?? 0) + 1;
          return acc;
        }, {});
        const dominantCat = Object.entries(catCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0];
        if (dominantCat) {
          productGroups.set(key, prods.filter(p => p.category === dominantCat));
        }
      }

      const analyzed: AnalyzedProduct[] = [];

      for (const [, products] of productGroups) {
        // Fetch reviews for ALL products in the group
        const allProductIds = products.map((p) => p.id);
        let reviewQuery = supabase
          .from("reviews")
          .select("*")
          .in("product_id", allProductIds)
          .order("collected_at", { ascending: false })
          .limit(200);

        if (sourcesFilter && sourcesFilter.length > 0) {
          reviewQuery = reviewQuery.in("source", sourcesFilter);
        }

        const { data: reviews } = await reviewQuery;

        const formattedReviews = (reviews || []).map(toReviewFormat);
        if (formattedReviews.length === 0) continue;

        // Use the product with the most recognizable name
        const sortedProducts = [...products].sort((a, b) => {
          const aScore = a.model_number.startsWith("MD") ? 0 : 1;
          const bScore = b.model_number.startsWith("MD") ? 0 : 1;
          return bScore - aScore || b.display_name.length - a.display_name.length;
        });
        const bestProduct = sortedProducts[0];

        const sentiment = analyzeSentiment(formattedReviews, bestProduct.category);
        const marketing = generateMarketingMessage(bestProduct.display_name, sentiment, lang);
        const geoMessages = generateGeoMarketingMessages(bestProduct.display_name, sentiment);

        analyzed.push({
          product: {
            name: bestProduct.model_number,
            displayName: bestProduct.display_name,
            category: bestProduct.category as any,
            subCategory: (bestProduct as any).sub_category || undefined,
            reviews: formattedReviews,
          },
          sentiment,
          marketing,
          geoMessages,
        });
      }

      analyzed.sort((a, b) => b.product.reviews.length - a.product.reviews.length);

      if (analyzed.length === 0) {
        setError(t(
          `Products found for "${query}" but no reviews collected yet${selectedCountry !== "all" ? ` for ${selectedCountry}` : ""}.`,
          `"${query}" 관련 제품은 있지만 ${selectedCountry !== "all" ? `${selectedCountry} 지역의 ` : ""}리뷰가 아직 수집되지 않았습니다.`
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section — warm cream */}
      <div className="relative overflow-hidden gradient-hero">
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="h-8 w-8 text-primary animate-pulse-glow" />
              <h1 className="text-4xl md:text-5xl font-bold font-heading">
                <span className="text-primary">Review-to-Asset Studio</span>
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground/70 italic mb-4">
              Turn Real Reviews into Ready-to-Use Marketing Assets.
            </p>
            <p className="text-[11px] md:text-xs max-w-2xl mx-auto leading-relaxed whitespace-pre-line" style={{ color: '#6B6B6B' }}>
              <strong className="text-foreground">고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.</strong>{"\n"}RTA Studio는 19개국, 100+ 채널의 실사용자 리뷰를 통합 분석하여{"\n"}숨겨진 인사이트를 발견하고, 즉시 활용 가능한 마케팅 에셋을 제공하는 올인원 플랫폼입니다.
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
            description="19개국, 100+ 채널에서 수집된 실사용자 리뷰를 플랫폼·국가별로 통합 분석합니다. 트렌딩 제품, 감성 변화, 주간 마케팅 액션 아이템을 한눈에 확인하세요."
          />
          <DataStatusBar />
          <TrendingDashboard onProductClick={(m) => handleSearch(m)} country={selectedCountry} />
          <OverviewDashboard country={selectedCountry} />
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

      {/* Search Results — Category Hub Layout */}
      {hasResults && (
        <div className="p-6 max-w-[1400px] mx-auto animate-slide-up">
          <CategorySearchResults
            results={results}
            searchQuery={searchQuery}
            selectedCountry={selectedCountry}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-8 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          고객의 진짜 목소리에서 출발해, 브랜드의 다음 움직임을 이끄는 인사이트 플랫폼 — Review-to-Asset Studio
        </p>
        <p className="text-xs text-muted-foreground">
          Produced by LG전자 D2C마케팅전략팀
        </p>
      </footer>
    </div>
  );
};


export default Index;
