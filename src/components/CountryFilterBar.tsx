import { Globe, Database } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useCountryCounts } from "@/hooks/useProductData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CountryFilter {
  country: string;
}

interface CountryFilterBarProps {
  selected: string;
  onChange: (country: string) => void;
  /** Override internal counts with custom data (e.g. community-only) */
  customCounts?: Record<string, number> | null;
}

/** Full country metadata — only countries with data will render */
const ALL_COUNTRIES: {
  value: string;
  label: string;
  flag: string;
  nameKo: string;
  nameEn: string;
  group: "americas" | "asia" | "global";
  sources: string[];
}[] = [
  // Americas & Europe — label shows LGE 법인 코드 (RIS Subsidiary List 표준)
  { value: "US", label: "LGEUS", flag: "🇺🇸", nameKo: "미국", nameEn: "United States", group: "americas",
    sources: ["LG.com US", "Reddit", "Amazon US", "Best Buy", "Walmart", "Costco", "Target", "YouTube US", "ConsumerAffairs", "Consumer Reports", "BestReviews"] },
  { value: "UK", label: "LGEUK", flag: "🇬🇧", nameKo: "영국", nameEn: "United Kingdom", group: "americas",
    sources: ["LG.com UK", "Amazon UK", "YouTube UK", "Trusted Reviews"] },
  { value: "CA", label: "LGECI", flag: "🇨🇦", nameKo: "캐나다", nameEn: "Canada", group: "americas",
    sources: ["Amazon CA", "YouTube CA"] },
  { value: "DE", label: "LGEDE", flag: "🇩🇪", nameKo: "독일", nameEn: "Germany", group: "americas",
    sources: ["Amazon DE", "YouTube DE"] },
  { value: "FR", label: "LGEFS", flag: "🇫🇷", nameKo: "프랑스", nameEn: "France", group: "americas",
    sources: ["Amazon FR", "YouTube FR"] },
  { value: "AU", label: "LGEAP", flag: "🇦🇺", nameKo: "호주", nameEn: "Australia", group: "americas",
    sources: ["Amazon AU", "YouTube AU"] },
  { value: "BR", label: "LGESP", flag: "🇧🇷", nameKo: "브라질", nameEn: "Brazil", group: "americas",
    sources: ["Amazon BR", "YouTube BR"] },
  { value: "MX", label: "LGEMS", flag: "🇲🇽", nameKo: "멕시코", nameEn: "Mexico", group: "americas",
    sources: ["Amazon MX", "YouTube MX"] },
  // Asia
  { value: "JP", label: "LGEJP", flag: "🇯🇵", nameKo: "일본", nameEn: "Japan", group: "asia",
    sources: ["Amazon JP", "YouTube JP", "Reviews.io"] },
  { value: "SG", label: "LGESL", flag: "🇸🇬", nameKo: "싱가포르", nameEn: "Singapore", group: "asia",
    sources: ["Shopee SG", "Lazada SG", "YouTube SG"] },
  { value: "MY", label: "LGEML", flag: "🇲🇾", nameKo: "말레이시아", nameEn: "Malaysia", group: "asia",
    sources: ["Shopee MY", "Lazada MY", "YouTube MY"] },
  { value: "TH", label: "LGETH", flag: "🇹🇭", nameKo: "태국", nameEn: "Thailand", group: "asia",
    sources: ["Shopee TH", "Lazada TH", "YouTube TH"] },
  { value: "PH", label: "LGEPH", flag: "🇵🇭", nameKo: "필리핀", nameEn: "Philippines", group: "asia",
    sources: ["Shopee PH", "Lazada PH", "YouTube PH"] },
  { value: "ID", label: "LGEIN", flag: "🇮🇩", nameKo: "인도네시아", nameEn: "Indonesia", group: "asia",
    sources: ["Shopee ID", "Lazada ID", "YouTube ID"] },
  { value: "VN", label: "LGEVN", flag: "🇻🇳", nameKo: "베트남", nameEn: "Vietnam", group: "asia",
    sources: ["Shopee VN", "Lazada VN", "YouTube VN"] },
  { value: "TW", label: "LGETT", flag: "🇹🇼", nameKo: "대만", nameEn: "Taiwan", group: "asia",
    sources: ["Amazon Global", "YouTube TW", "Reviews.io"] },
  { value: "HK", label: "LGEHK", flag: "🇭🇰", nameKo: "홍콩", nameEn: "Hong Kong", group: "asia",
    sources: ["Amazon Global", "YouTube HK", "Reviews.io"] },
  { value: "IN", label: "LGEIL", flag: "🇮🇳", nameKo: "인도", nameEn: "India", group: "asia",
    sources: ["Amazon IN", "YouTube IN"] },
];

const GLOBAL_SOURCES = [
  "Trustpilot", "RTINGS", "PCMag", "CNET", "TechRadar", "Notebookcheck",
  "SoundGuys", "Houzz", "Lemon8", "ComplaintsBoard", "Reviews.io"
];

/** Map country code to source patterns for DB filtering */
export function countryToSourceFilter(country: string): string[] | null {
  if (country === "all") return null;
  const map: Record<string, string[]> = {
    US: ["lge_com_us", "reddit", "bestbuy", "walmart", "costco", "target", "amazon_us", "youtube_us", "consumeraffairs", "consumer_reports", "bestreviews"],
    UK: ["lge_com_uk", "amazon_uk", "youtube_uk", "trusted_reviews"],
    CA: ["amazon_ca", "youtube_ca"],
    AU: ["amazon_au", "youtube_au"],
    DE: ["amazon_de", "youtube_de"],
    FR: ["amazon_fr", "youtube_fr"],
    BR: ["amazon_br", "youtube_br"],
    MX: ["amazon_mx", "youtube_mx"],
    JP: ["amazon_jp", "youtube_jp", "shopee_jp", "lazada_jp"],
    SG: ["amazon_sg", "shopee_sg", "lazada_sg", "youtube_sg"],
    MY: ["shopee_my", "lazada_my", "youtube_my"],
    TH: ["shopee_th", "lazada_th", "youtube_th"],
    PH: ["shopee_ph", "lazada_ph", "youtube_ph"],
    ID: ["shopee_id", "lazada_id", "youtube_id"],
    VN: ["shopee_vn", "lazada_vn", "youtube_vn"],
    TW: ["amazon_tw", "youtube_tw"],
    HK: ["amazon_hk", "youtube_hk"],
    IN: ["amazon_in", "youtube_in", "shopee_in"],
    Global: ["trustpilot", "reviews_io", "complaintsboard", "pcmag", "rtings", "techradar", "soundguys", "cnet", "notebookcheck", "houzz", "lemon8"],
    // Reddit category filters (used by Reddit Intelligence page)
    tv: ["reddit_lgoled", "reddit_r/lgoled", "reddit_oled_gaming", "reddit_r/oled_gaming", "reddit_4ktv", "reddit_oled"],
    appliance: ["reddit_appliances", "reddit_appliancerepair", "reddit_ac", "reddit_airconditioners", "reddit_vacuumcleaners", "reddit_buyitforlife", "reddit_homeimprovement"],
    audio: ["reddit_soundbars"],
    monitor: ["reddit_monitors", "reddit_ultrawidemasterrace", "reddit_buildapc", "reddit_buildapcsales", "reddit_buildapcmonitors", "reddit_pcgaming", "reddit_nvidia", "reddit_hidpi_monitors"],
    laptop: ["reddit_lggram", "reddit_suggestalaptop", "reddit_mac", "reddit_macbookpro", "reddit_macsetups", "reddit_editors"],
    lifestyle: ["reddit_stanbyme"],
    general: ["reddit", "reddit_lg_userhub", "reddit_r/lg_userhub", "reddit_techsupport", "reddit_fixit"],
    india: ["reddit_india"],
  };
  return map[country] || [`%_${country.toLowerCase()}`];
}

export function CountryFilterBar({ selected, onChange, customCounts }: CountryFilterBarProps) {
  const { t } = useLang();
  const { data: defaultCounts } = useCountryCounts();
  const countryCounts = customCounts !== undefined ? customCounts : defaultCounts;

  // Determine which countries actually have data, sorted by count descending
  const activeCountries = ALL_COUNTRIES
    .filter((c) => countryCounts && Number(countryCounts[c.value] || 0) > 0)
    .sort((a, b) => Number(countryCounts?.[b.value] || 0) - Number(countryCounts?.[a.value] || 0));
  const hasGlobal = countryCounts && Number(countryCounts["Global"] || 0) > 0;

  const activeAmericas = activeCountries.filter((c) => c.group === "americas");
  const activeAsia = activeCountries.filter((c) => c.group === "asia");

  const totalCount = countryCounts
    ? Object.values(countryCounts).reduce((s, v) => s + Number(v), 0)
    : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">
            {t("Country Filter", "국가별 보기")}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">
            {t(
              `(${activeCountries.length + (hasGlobal ? 1 : 0)} active regions · ${totalCount.toLocaleString()} reviews)`,
              `(${activeCountries.length + (hasGlobal ? 1 : 0)}개 활성 지역 · ${totalCount.toLocaleString()}건)`
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {/* All button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange("all")}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  selected === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                🌐 {t("All", "전체")}
                {totalCount > 0 && (
                  <span className="ml-1 text-[9px] opacity-70">{totalCount.toLocaleString()}</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              <p className="font-semibold mb-1">{t("All Regions", "전체 지역")}</p>
              <p className="text-muted-foreground">{t("All collected data across all channels", "모든 채널의 전체 수집 데이터")}</p>
            </TooltipContent>
          </Tooltip>

          {/* Americas & Europe */}
          {activeAmericas.length > 0 && (
            <>
              <span className="text-border mx-1.5 text-xs">|</span>
              {activeAmericas.map((c) => {
                const count = Number(countryCounts?.[c.value] || 0);
                return (
                  <Tooltip key={c.value}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onChange(c.value)}
                        className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                          selected === c.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {c.flag} {c.label}
                        {count > 0 && (
                          <span className="ml-1 text-[9px] opacity-70">{count.toLocaleString()}</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      <p className="font-semibold mb-1">{c.flag} {t(c.nameEn, c.nameKo)}</p>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Database className="h-3 w-3" />
                        <span>{count.toLocaleString()} {t("reviews", "건")}</span>
                      </div>
                      <p className="text-muted-foreground text-[10px]">
                        {t("Sources", "수집 채널")}: {c.sources.join(", ")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          )}

          {/* Asia */}
          {activeAsia.length > 0 && (
            <>
              <span className="text-border mx-1.5 text-xs">|</span>
              {activeAsia.map((c) => {
                const count = Number(countryCounts?.[c.value] || 0);
                return (
                  <Tooltip key={c.value}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onChange(c.value)}
                        className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                          selected === c.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {c.flag} {c.label}
                        {count > 0 && (
                          <span className="ml-1 text-[9px] opacity-70">{count.toLocaleString()}</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      <p className="font-semibold mb-1">{c.flag} {t(c.nameEn, c.nameKo)}</p>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Database className="h-3 w-3" />
                        <span>{count.toLocaleString()} {t("reviews", "건")}</span>
                      </div>
                      <p className="text-muted-foreground text-[10px]">
                        {t("Sources", "수집 채널")}: {c.sources.join(", ")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          )}

          {/* Global */}
          {hasGlobal && (
            <>
              <span className="text-border mx-1.5 text-xs">|</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onChange("Global")}
                    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                      selected === "Global"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    🌍 Global
                    <span className="ml-1 text-[9px] opacity-70">
                      {Number(countryCounts?.["Global"] || 0).toLocaleString()}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">🌍 {t("Global Sources", "글로벌 소스")}</p>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Database className="h-3 w-3" />
                    <span>{Number(countryCounts?.["Global"] || 0).toLocaleString()} {t("reviews", "건")}</span>
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    {t("Sources", "수집 채널")}: {GLOBAL_SOURCES.join(", ")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Inactive countries hint */}
        {activeCountries.length < ALL_COUNTRIES.length && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[9px] text-muted-foreground/60">
              {t(
                `${ALL_COUNTRIES.length - activeCountries.length} additional regions configured but no data collected yet (${ALL_COUNTRIES.filter(c => !activeCountries.includes(c)).map(c => c.flag + c.label).join(", ")})`,
                `${ALL_COUNTRIES.length - activeCountries.length}개 지역 수집 설정 완료, 데이터 미수집 (${ALL_COUNTRIES.filter(c => !activeCountries.includes(c)).map(c => c.flag + c.label).join(", ")})`
              )}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
