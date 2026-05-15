import { useState } from "react";
import { Store, Globe, BarChart3, Brain, Calendar, Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LgComWeeklyReport } from "@/components/LgComWeeklyReport";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategicBadge } from "@/components/StrategicBadge";

// value = ISO code (kept for backward-compatible source mapping & child components)
// labelEn = LGE 법인 코드 (RIS Subsidiary List 표준)
const BV_COUNTRIES = [
  { value: "all", label: "전체",   labelEn: "All",    flag: "🌐" },
  // 북미
  { value: "US",  label: "미국",   labelEn: "LGEUS",  flag: "🇺🇸" },
  { value: "CA",  label: "캐나다", labelEn: "LGECI",  flag: "🇨🇦" },
  // 유럽
  { value: "UK",  label: "영국",   labelEn: "LGEUK",  flag: "🇬🇧" },
  { value: "DE",  label: "독일",   labelEn: "LGEDE",  flag: "🇩🇪" },
  { value: "ES",  label: "스페인", labelEn: "LGEES",  flag: "🇪🇸" },
  // 중남미
  { value: "BR",  label: "브라질", labelEn: "LGESP",  flag: "🇧🇷" },
  { value: "MX",  label: "멕시코", labelEn: "LGEMS",  flag: "🇲🇽" },
  { value: "PE",  label: "페루",   labelEn: "LGEPR",  flag: "🇵🇪" },
  // 아시아·오세아니아
  { value: "AU",  label: "호주",   labelEn: "LGEAP",  flag: "🇦🇺" },
  { value: "IN",  label: "인도",   labelEn: "LGEIL",  flag: "🇮🇳" },
  { value: "TW",  label: "대만",   labelEn: "LGETT",  flag: "🇹🇼" },
  { value: "JP",  label: "일본",   labelEn: "LGEJP",  flag: "🇯🇵" },
  { value: "TH",  label: "태국",   labelEn: "LGETH",  flag: "🇹🇭" },
  // 중동·아프리카
  { value: "SA",  label: "사우디", labelEn: "LGESJ",  flag: "🇸🇦" },
];

const COUNTRY_SOURCE_MAP: Record<string, string[]> = {
  US: ["lge_com_us"],
  UK: ["lge_com_uk"],
  DE: ["lge_com_de"],
  ES: ["lge_com_es"],
  AU: ["lge_com_au"],
  IN: ["lge_com_in"],
  TW: ["lge_com_tw"],
  JP: ["lge_com_jp"],
  TH: ["lge_com_th"],
  BR: ["lge_com_br"],
  MX: ["lge_com_mx"],
  PE: ["lge_com_pe"],
  SA: ["lge_com_sa"],
  CA: ["lge_com_ca"],
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
      <div className="flex gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex-1 h-16 rounded-lg bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const countMap = new Map(data?.map((c) => [c.country, Number(c.count)]) || []);

  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {/* All card */}
      <button
        onClick={() => onSelect("all")}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1.5 py-1.5 transition-all hover:shadow-md ${
          selectedCountry === "all"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <span className="text-base">🌐</span>
        <span className="text-[10px] font-semibold text-foreground">{t("All", "전체")}</span>
        <span className="text-xs font-bold font-sans text-primary">{total.toLocaleString()}</span>
        <span className="text-[8px] text-muted-foreground">{t("cumulative reviews", "누적 리뷰")}</span>
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
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1.5 py-1.5 transition-all hover:shadow-md ${
              isActive
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className="text-base relative">
              {c.flag}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground">
              {t(c.labelEn, c.label)}
              <StrategicBadge iso={c.value} />
            </span>
            <span className="text-xs font-bold font-sans text-primary">{cnt.toLocaleString()}</span>
            <span className="text-[8px] text-muted-foreground" title={t(`${c.labelEn}: Cumulative total since collection start`, `${c.label}: 수집 시작 이후 전체 누적`)}>
              {t("cumulative", "누적")} · {pct}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

const LgComPage = () => {
  const { t } = useLang();
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [period, setPeriod] = useState<"weekly" | "cumulative">("weekly");

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        icon={Store}
        title="🏬 LG.com 인사이트 리포트"
        description={t(
          "Analyze customer reviews from 9 LG.com regions. Select a country, search products, and generate marketing assets.",
          "LG.com 9개국 리뷰를 분석하고 마케팅 에셋을 생성하세요. 국가를 선택하고 제품을 검색하세요."
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

      {/* LG.com 리뷰 분석 결과 */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold font-heading">
              📊 {t("LG.com Review Analysis Results", "LG.com 리뷰 분석 결과")}
            </h2>
            {/* Period toggle */}
            <div className="flex gap-0.5 bg-muted/50 rounded-full p-0.5">
              <button
                onClick={() => setPeriod("weekly")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  period === "weekly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {t("Weekly", "주간")}
              </button>
              <button
                onClick={() => setPeriod("cumulative")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  period === "cumulative"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="h-3 w-3" />
                {t("Cumulative", "전체 누적")}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
            <span>{t("Country", "국가")}: <span className="font-semibold text-foreground">{
              selectedCountry === "all"
                ? t("All", "전체")
                : `${BV_COUNTRIES.find(c => c.value === selectedCountry)?.flag || ""} ${t(
                    BV_COUNTRIES.find(c => c.value === selectedCountry)?.labelEn || "",
                    BV_COUNTRIES.find(c => c.value === selectedCountry)?.label || ""
                  )}`
            }</span></span>
            <span className="text-border">|</span>
            <span>{t("Period", "기간")}: <span className="font-semibold text-foreground">{
              period === "weekly" ? t("Weekly", "주간") : t("Cumulative", "전체 누적")
            }</span></span>
            <span className="text-border">|</span>
            <span>{t("Basis", "기준")}: <span className="font-semibold text-foreground">{t("By Product", "제품별")}</span></span>
          </div>
        </div>

        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 px-4 h-auto py-0">
            <TabsTrigger value="weekly" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 px-4 text-xs font-semibold">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              {t("Weekly Insight Report", "주간 인사이트 리포트")}
            </TabsTrigger>
            <TabsTrigger value="strategic" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 px-4 text-xs font-semibold">
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              {t("Strategic Deep-Dive", "전략 심층분석")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className="p-4 mt-0">
            <LgComWeeklyReport country={selectedCountry} period={period} />
          </TabsContent>
          <TabsContent value="strategic" className="p-4 mt-0">
            <WeeklyInsightsPanel country={selectedCountry} period={period} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default LgComPage;
