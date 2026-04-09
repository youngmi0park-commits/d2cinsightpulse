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
  const { t } = useLang();
  const [selectedCountry, setSelectedCountry] = useState("all");

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
              onClick={() => setSelectedCountry(c.value)}
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

      {/* 1. AI 주간 인사이트 리포트 */}
      <LgComWeeklyReport country={selectedCountry} />

      {/* 2. 전략 심층분석: 사용자군/JTBD */}
      <WeeklyInsightsPanel country={selectedCountry} />
    </div>
  );
};

export default LgComPage;
