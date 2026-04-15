import { useState } from "react";
import { Store, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LgComWeeklyReport } from "@/components/LgComWeeklyReport";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/contexts/LanguageContext";

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
  const { t } = useLang();
  const [selectedCountry, setSelectedCountry] = useState("all");

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
  };

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
