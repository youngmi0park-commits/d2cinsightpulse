import { useState } from "react";
import { Wrench, AlertCircle, Image, LayoutTemplate, Sparkles, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CountryFilterBar, countryToSourceFilter } from "@/components/CountryFilterBar";
import { CategorySearchResults } from "@/components/CategorySearchResults";
import { analyzeSentiment } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages } from "@/lib/formatMessage";
import { useProductStats, toReviewFormat } from "@/hooks/useProductData";
import { type AnalyzedProduct } from "@/components/SearchResultCards";
import { Database } from "lucide-react";

const categoryKeywords: Record<string, string[]> = {
  tv: ["TV"], laptop: ["Laptop"], monitor: ["Monitor"],
  refrigerator: ["Refrigerator"], fridge: ["Refrigerator"],
  washer: ["Washer"], dryer: ["Dryer"], dishwasher: ["Dishwasher"],
  vacuum: ["Vacuum"], cordzero: ["Vacuum"],
  soundbar: ["Soundbar", "Audio"], "air purifier": ["Air Purifier"],
  puricare: ["Air Purifier"], aerotower: ["Air Purifier"],
  range: ["Range"], oven: ["Range"], microwave: ["Microwave"],
};

export default function ToolkitPage() {
  const { t, lang } = useLang();
  const [results, setResults] = useState<AnalyzedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const { data: stats } = useProductStats();

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery(query);

    try {
      const { data: dbProducts, error: dbError } = await supabase
        .from("products")
        .select("*")
        .or(`model_number.ilike.%${query}%,display_name.ilike.%${query}%,category.ilike.%${query}%,sub_category.ilike.%${query}%`)
        .eq("is_active", true);

      if (dbError) throw dbError;
      if (!dbProducts || dbProducts.length === 0) {
        setError(t(
          `No data found for "${query}". Please try a different keyword.`,
          `"${query}"에 대한 데이터를 찾을 수 없습니다.`
        ));
        setResults([]);
        setIsLoading(false);
        return;
      }

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

      // Group products by display_name
      const productGroups = new Map<string, typeof dbProducts>();
      for (const product of filteredProducts) {
        const normName = product.display_name
          .replace(/^\d+["″]?\s*/i, "")
          .replace(/^\d+\s*inch\s*/i, "")
          .replace(/\s*\(.*?\)\s*$/, "")
          .trim();
        const key = normName || product.display_name;
        if (!productGroups.has(key)) productGroups.set(key, []);
        productGroups.get(key)!.push(product);
      }

      const analyzed: AnalyzedProduct[] = [];

      for (const [, products] of productGroups) {
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
          `Products found for "${query}" but no reviews collected yet.`,
          `"${query}" 관련 제품은 있지만 리뷰가 아직 수집되지 않았습니다.`
        ));
        setResults([]);
      } else {
        setResults(analyzed);
      }
    } catch (e) {
      console.error("Search error:", e);
      setError(t("An error occurred while searching.", "검색 중 오류가 발생했습니다."));
      setResults([]);
    }

    setIsLoading(false);
  };

  const hasResults = results.length > 0;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Wrench}
        title="🚀 Marketing Asset Studio"
        description={t(
          "Search a product → Analyze reviews → Get AI-generated marketing copy, strategic insights, and media assets instantly.",
          "제품 검색 → 리뷰 분석 → AI 기반 마케팅 카피, 전략 인사이트, 미디어 에셋을 즉시 생성합니다."
        )}
      />

      {/* Search */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        {stats && (
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="gap-1.5 text-[10px] border-primary/30">
              <Database className="h-3 w-3" />
              {stats.productCount}개 제품 · {stats.reviewCount.toLocaleString()}건 리뷰
            </Badge>
          </div>
        )}
      </div>

      {/* Country Filter */}
      <CountryFilterBar
        selected={selectedCountry}
        onChange={(c) => {
          setSelectedCountry(c);
          if (searchQuery) setTimeout(() => handleSearch(searchQuery), 0);
        }}
      />

      {/* Error */}
      {error && (
        <div className="p-5 rounded-xl border border-destructive/30 bg-destructive/5 text-center flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Search Results — Same as Main page */}
      {hasResults && (
        <div className="animate-slide-up">
          <CategorySearchResults
            results={results}
            searchQuery={searchQuery}
            selectedCountry={selectedCountry}
          />
        </div>
      )}

      {/* Guide when no search */}
      {!hasResults && !error && (
        <div className="gradient-card rounded-xl border border-border border-dashed p-8 text-center space-y-3">
          <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t(
              "Search a product to start generating marketing assets.",
              "제품을 검색하면 리뷰 분석 인사이트와 마케팅 에셋이 자동 생성됩니다."
            )}
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            {t(
              "e.g. OLED C5, WashTower, UltraGear, Refrigerator...",
              "예: OLED C5, WashTower, UltraGear, 냉장고..."
            )}
          </p>
        </div>
      )}

      {/* Anita Creative Studio */}
      <a
        href="https://anita-twincrew.lovable.app/studio"
        target="_blank"
        rel="noopener noreferrer"
        className="group gradient-card rounded-xl border border-border p-5 md:p-6 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer block"
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shrink-0 shadow-md">
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-foreground">🎨 LG CreW Anita — AI Creative Studio</h3>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              {t(
                "Create product lifestyle images & banners in one place. Click to open Anita Studio.",
                "제품 라이프스타일 이미지 및 배너를 한 곳에서 제작합니다. 클릭하여 Anita Studio로 이동하세요."
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 pl-[4.5rem]">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3.5 py-1.5 text-[11px] font-semibold">
            <Image className="h-3.5 w-3.5" /> {t("Image Generation", "이미지 생성")}
          </span>
          <span className="text-muted-foreground text-xs">+</span>
          <span className="flex items-center gap-1.5 rounded-full bg-accent/30 text-accent-foreground px-3.5 py-1.5 text-[11px] font-semibold">
            <LayoutTemplate className="h-3.5 w-3.5" /> {t("Banner Creation", "배너 제작")}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
            {t("Open Studio →", "스튜디오 열기 →")}
          </span>
        </div>
      </a>
    </div>
  );
}
