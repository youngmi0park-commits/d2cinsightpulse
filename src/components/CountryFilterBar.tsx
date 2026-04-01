import { Globe } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export interface CountryFilter {
  country: string;
}

interface CountryFilterBarProps {
  selected: string;
  onChange: (country: string) => void;
}

const COUNTRY_GROUPS = [
  {
    label: "All",
    labelKo: "전체",
    countries: [{ value: "all", label: "🌐 All", flag: "🌐" }],
  },
  {
    label: "Americas & Europe",
    labelKo: "미주·유럽",
    countries: [
      { value: "US", label: "US", flag: "🇺🇸" },
      { value: "UK", label: "UK", flag: "🇬🇧" },
      { value: "CA", label: "CA", flag: "🇨🇦" },
      { value: "DE", label: "DE", flag: "🇩🇪" },
      { value: "FR", label: "FR", flag: "🇫🇷" },
      { value: "AU", label: "AU", flag: "🇦🇺" },
      { value: "BR", label: "BR", flag: "🇧🇷" },
      { value: "MX", label: "MX", flag: "🇲🇽" },
    ],
  },
  {
    label: "Asia",
    labelKo: "아시아",
    countries: [
      { value: "JP", label: "JP", flag: "🇯🇵" },
      { value: "SG", label: "SG", flag: "🇸🇬" },
      { value: "MY", label: "MY", flag: "🇲🇾" },
      { value: "TH", label: "TH", flag: "🇹🇭" },
      { value: "PH", label: "PH", flag: "🇵🇭" },
      { value: "ID", label: "ID", flag: "🇮🇩" },
      { value: "VN", label: "VN", flag: "🇻🇳" },
      { value: "TW", label: "TW", flag: "🇹🇼" },
      { value: "HK", label: "HK", flag: "🇭🇰" },
      { value: "IN", label: "IN", flag: "🇮🇳" },
    ],
  },
];

/** Map country code to source patterns for DB filtering */
export function countryToSourceFilter(country: string): string[] | null {
  if (country === "all") return null; // no filter
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
  };
  return map[country] || [`%_${country.toLowerCase()}`];
}

export function CountryFilterBar({ selected, onChange }: CountryFilterBarProps) {
  const { t } = useLang();

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">
          {t("Country Filter", "국가별 보기")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {COUNTRY_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && (
              <span className="text-border mx-1.5 text-xs">|</span>
            )}
            {group.countries.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange(c.value)}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  selected === c.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {c.flag} {c.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
