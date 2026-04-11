import { useState } from "react";
import { Store, Globe, Search, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LgComWeeklyReport } from "@/components/LgComWeeklyReport";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { CategorySearchResults } from "@/components/CategorySearchResults";
import { useLang } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { analyzeSentiment } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages } from "@/lib/formatMessage";
import { toReviewFormat } from "@/hooks/useProductData";
import { type AnalyzedProduct } from "@/components/SearchResultCards";
import { AlertCircle } from "lucide-react";

const BV_COUNTRIES = [
  { value: "all", label: "전체", labelEn: "All", flag: "🌐" },
  { value: "US", label: "미국", labelEn: "US", flag: "🇺🇸" },
  { value: "UK", label: "영국", labelEn: "UK", flag: "🇬🇧" },
  { value: "DE", label: "독일", labelEn: "DE", flag: "🇩🇪" },
  { value: "AU", label: "호주", labelEn: "AU", flag: "🇦🇺" },
  { value: "IN", label: "인도", labelEn: "IN", flag: "🇮🇳" },
  { value: "TW", label: "대만", labelEn: "TW", flag: "🇹🇼" },
  { value: "JP", label: "일본", labelEn: "JP", flag: "🇯🇵" },
  { value: "TH", label: "태국", labelEn: "TH", flag: "🇹🇭" },
];

const COUNTRY_SOURCE_MAP: Record<string, string[]> = {
  US: ["lge_com_us"],
  UK: ["lge_com_uk"],
  DE: ["lge_com_de"],
  AU: ["lge_com_au"],
  IN: ["lge_com_in"],
  TW: ["lge_com_tw"],
  JP: ["lge_com_jp"],
  TH: ["lge_com_th"],
};

/* Compact inline summary — total + country split */
function CompactDataBar() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({
    queryKey: ["lgcom-country-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lgcom_country_counts");
      if (error) throw error;
      return (data || []) as { country: string; count: number }[];
    },
    staleTime: 60_000,
  });

  const total = data?.reduce((s, c) => s + Number(c.count), 0) || 0;
  const FLAG: Record<string, string> = {
    US: "🇺🇸", UK: "🇬🇧", DE: "🇩🇪", AU: "🇦🇺",
    IN: "🇮🇳", TW: "🇹🇼", JP: "🇯🇵", TH: "🇹🇭",
  };

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground px-1 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>
        <span>{t("reviews collected", "건 수집")}</span>
      </div>
      <span className="text-border">|</span>
      {data?.map((c) => (
        <span key={c.country} className="flex items-center gap-1">
          {FLAG[c.country] || "🌐"} {c.country}{" "}
          <span className="font-medium text-foreground">{Number(c.count).toLocaleString()}</span>
        </span>
      ))}
    </div>
  );
}

const LgComPage = () => {
  const { t, lang } = useLang();
  const [selectedCountry, setSelectedCountry] = useState("all");

  // Product search state
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<AnalyzedProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    setSearchQuery(query);

    try {
      const { data: dbProducts, error: dbError } = await supabase
        .from("products")
        .select("*")
        .or(`model_number.ilike.%${query}%,display_name.ilike.%${query}%,category.ilike.%${query}%,sub_category.ilike.%${query}%`)
        .eq("is_active", true);

      if (dbError) throw dbError;
      if (!dbProducts || dbProducts.length === 0) {
        setSearchError(t(`No data found for "${query}".`, `"${query}"에 대한 데이터를 찾을 수 없습니다.`));
        setResults([]);
        setIsSearching(false);
        return;
      }

      // LG.com source filter
      const sourcesFilter = selectedCountry === "all"
        ? Object.values(COUNTRY_SOURCE_MAP).flat()
        : COUNTRY_SOURCE_MAP[selectedCountry] || [];

      const productGroups = new Map<string, typeof dbProducts>();
      for (const product of dbProducts) {
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
          .in("source", sourcesFilter)
          .order("collected_at", { ascending: false })
          .limit(200);

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
        setSearchError(t(
          `Products found but no LG.com reviews collected yet${selectedCountry !== "all" ? ` for ${selectedCountry}` : ""}.`,
          `제품은 있지만 ${selectedCountry !== "all" ? `${selectedCountry} 지역의 ` : ""}LG.com 리뷰가 아직 수집되지 않았습니다.`
        ));
        setResults([]);
      } else {
        setResults(analyzed);
      }
    } catch (e) {
      console.error("Search error:", e);
      setSearchError(t("An error occurred while searching.", "검색 중 오류가 발생했습니다."));
      setResults([]);
    }
    setIsSearching(false);
  };

  const hasResults = results.length > 0;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Store}
        title="🏬 LG.com Insights"
        description="LG.com 리뷰에서 어떤 제품이 긍정/부정 언급되고 있는지, 핵심 키워드는 무엇인지 확인하고 마케팅 콘텐츠로 활용하세요."
      />

      {/* LG.com 전용 국가 필터 (BV 8개국) */}
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">
            {t("LG.com Country Filter", "LG.com 국가별 보기")}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">
            {t("(Bazaarvoice 8 regions)", "(바자보이스 8개국)")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {BV_COUNTRIES.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setSelectedCountry(c.value);
                if (searchQuery) setTimeout(() => handleSearch(searchQuery), 0);
              }}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all flex items-center gap-1 ${
                selectedCountry === c.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {c.flag} {t(c.labelEn, c.label)}
            </button>
          ))}
        </div>
      </div>

      <CompactDataBar />

      {/* Inline Product Search */}
      <div className="bg-card/60 border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {t("Product Search — LG.com Reviews", "제품 검색 — LG.com 리뷰 분석")}
          </span>
          <a
            href="/toolkit"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
          >
            <Wrench className="h-3 w-3" />
            {t("Go to Asset Studio", "에셋 스튜디오로 이동")}
          </a>
        </div>
        <SearchBar
          onSearch={handleSearch}
          isLoading={isSearching}
          placeholder={t("Search product to analyze LG.com reviews...", "LG.com 리뷰를 분석할 제품을 검색하세요...")}
        />
      </div>

      {/* Search Error */}
      {searchError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-center flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-destructive text-sm">{searchError}</p>
        </div>
      )}

      {/* Search Results */}
      {hasResults && (
        <div className="animate-slide-up">
          <CategorySearchResults
            results={results}
            searchQuery={searchQuery}
            selectedCountry={selectedCountry}
          />
        </div>
      )}

      {/* Weekly Reports (show when no search results) */}
      {!hasResults && !searchError && (
        <>
          {/* 1. AI 주간 인사이트 리포트 */}
          <LgComWeeklyReport country={selectedCountry} />

          {/* 2. 전략 심층분석: 사용자군/JTBD */}
          <WeeklyInsightsPanel country={selectedCountry} />
        </>
      )}
    </div>
  );
};

export default LgComPage;
