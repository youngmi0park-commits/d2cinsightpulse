import { useState } from "react";
import { Store, Globe, Search, Wrench, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LgComWeeklyReport } from "@/components/LgComWeeklyReport";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { CategorySearchResults } from "@/components/CategorySearchResults";
import { useLang } from "@/contexts/LanguageContext";
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

/* ── Country Stats Cards ── */
function CountryStatsGrid({
  selectedCountry,
  onSelect,
}: {
  selectedCountry: string;
  onSelect: (v: string) => void;
}) {
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
  const countryMeta: Record<string, { flag: string; label: string; labelEn: string }> = {};
  for (const c of BV_COUNTRIES) {
    if (c.value !== "all") countryMeta[c.value] = { flag: c.flag, label: c.label, labelEn: c.labelEn };
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const countMap = new Map(data?.map((c) => [c.country, Number(c.count)]) || []);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
      {/* All card */}
      <button
        onClick={() => onSelect("all")}
        className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 transition-all hover:shadow-md ${
          selectedCountry === "all"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <span className="text-xl">🌐</span>
        <span className="text-[11px] font-semibold text-foreground">{t("All", "전체")}</span>
        <span className="text-sm font-bold font-sans text-primary">{total.toLocaleString()}</span>
        <span className="text-[9px] text-muted-foreground">{t("reviews", "건")}</span>
      </button>

      {/* Per-country cards */}
      {BV_COUNTRIES.filter((c) => c.value !== "all").map((c) => {
        const cnt = countMap.get(c.value) || 0;
        const isActive = selectedCountry === c.value;
        const pct = total > 0 ? ((cnt / total) * 100).toFixed(1) : "0";
        return (
          <button
            key={c.value}
            onClick={() => onSelect(c.value)}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 transition-all hover:shadow-md ${
              isActive
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className="text-xl">{c.flag}</span>
            <span className="text-[11px] font-semibold text-foreground">{t(c.labelEn, c.label)}</span>
            <span className="text-sm font-bold font-sans text-primary">{cnt.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}

const LgComPage = () => {
  const { t, lang } = useLang();
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<AnalyzedProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    if (searchQuery) setTimeout(() => handleSearch(searchQuery), 0);
  };

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
        const reviewQuery = supabase
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
  const countryLabel = selectedCountry === "all"
    ? t("All Countries", "전체 국가")
    : BV_COUNTRIES.find((c) => c.value === selectedCountry)?.flag + " " +
      t(
        BV_COUNTRIES.find((c) => c.value === selectedCountry)?.labelEn || "",
        BV_COUNTRIES.find((c) => c.value === selectedCountry)?.label || ""
      );

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        icon={Store}
        title="🏬 LG.com Review Studio"
        description={t(
          "Analyze customer reviews from 8 LG.com regions. Select a country, search products, and generate marketing assets.",
          "LG.com 8개국 리뷰를 분석하고 마케팅 에셋을 생성하세요. 국가를 선택하고 제품을 검색하세요."
        )}
      />

      {/* 1️⃣ Country Stats — always visible at top */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            {t("Collection by Country", "국가별 수집 현황")}
          </h2>
          <span className="text-[10px] text-muted-foreground">
            {t("Click to filter", "클릭하여 필터링")}
          </span>
        </div>
        <CountryStatsGrid
          selectedCountry={selectedCountry}
          onSelect={handleCountrySelect}
        />
      </section>

      {/* Weekly Reports & Strategic Analysis */}
      <LgComWeeklyReport country={selectedCountry} />
      <WeeklyInsightsPanel country={selectedCountry} />
    </div>
  );
};

export default LgComPage;
