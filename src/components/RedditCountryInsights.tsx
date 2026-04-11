import { Globe, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { useLang } from "@/contexts/LanguageContext";

interface CountryData {
  rank: number;
  flag: string;
  name: string;
  nameKo: string;
  risCode: string;
  descriptionEn: string;
  descriptionKo: string;
  keywords: { category: string; items: string[] }[];
}

const countries: CountryData[] = [
  {
    rank: 1, flag: "🇺🇸", name: "United States", nameKo: "미국", risCode: "LGEUS",
    descriptionEn: "Largest Reddit user base & highest lg.com traffic country",
    descriptionKo: "Reddit 절대 최대 사용자 기반 & lg.com 최대 트래픽 국가",
    keywords: [
      { category: "TV", items: ["OLED C3/C4 vs G3/G4", "QNED vs MiniLED vs OLED", "Brightness/peak nits", "Reflection‑Free/anti‑glare"] },
      { category: "Gaming", items: ["UltraGear OLED 27/32/39", "VRR, 120/144Hz, G‑SYNC/FreeSync", "HDR Game Mode"] },
      { category: "Purchase", items: ["Best Buy vs LG.com pricing", "Black Friday/Cyber Monday", "Warranty/Geek Squad vs LG Care"] },
      { category: "Install/UX", items: ["Gallery Design flush mount", "eARC with Sonos/Soundbar", "Calibrations (Filmmaker Mode/Calman)"] },
    ],
  },
  {
    rank: 2, flag: "🇬🇧", name: "United Kingdom", nameKo: "영국", risCode: "LGEUK",
    descriptionEn: "2nd largest English-speaking, high Reddit engagement",
    descriptionKo: "영어권 2위 규모, Reddit 참여도 높음",
    keywords: [
      { category: "TV", items: ["G‑series wall‑mount vs stand", "HDR tone‑mapping for Sky/BT Sports", "Freeview/YouView compatibility"] },
      { category: "Gaming", items: ["PS5/XSX 4K120 VRR", "PC HDMI 2.1 bandwidth"] },
      { category: "Purchase", items: ["Currys/Richer Sounds vs LG.com/UK", "Extended warranty (Richer extended cover)"] },
      { category: "Others", items: ["Energy ratings", "BBC iPlayer/Freeview app issues"] },
    ],
  },
  {
    rank: 3, flag: "🇨🇦", name: "Canada", nameKo: "캐나다", risCode: "LGECI",
    descriptionEn: "Large English-speaking user base, active tech communities",
    descriptionKo: "영어권 대형 사용자층, 테크 커뮤니티 활동 활발",
    keywords: [
      { category: "TV/Price", items: ["C3/C4 price vs US (cross‑border)", "Costco Canada warranty", "Best Buy Canada price match"] },
      { category: "Gaming/PC", items: ["UltraGear OLED for PC desk setup", "40–42″ vs 27–32″ debate"] },
      { category: "Climate", items: ["Panel care in winter/cold rooms", "Burn‑in coverage talk"] },
    ],
  },
  {
    rank: 4, flag: "🇦🇺", name: "Australia", nameKo: "호주", risCode: "LGEAP",
    descriptionEn: "4th largest English-speaking user base, high activity",
    descriptionKo: "영어권 4위권 사용자 기반, 활동성 높음",
    keywords: [
      { category: "TV", items: ["Sports (AFL/NRL/Cricket) motion handling", "Foxtel/Stan/KO Sports app quality"] },
      { category: "Retail", items: ["JB Hi‑Fi/Harvey Norman vs LG.com AU pricing", "Import models vs local warranty"] },
      { category: "Install", items: ["Wall‑mount studs in Aussie homes", "Reflectivity in bright rooms"] },
    ],
  },
  {
    rank: 5, flag: "🇩🇪", name: "Germany", nameKo: "독일", risCode: "LGEDE",
    descriptionEn: "Non-English but active on English Reddit, top lg.com interest",
    descriptionKo: "비영어권이지만 영문 Reddit 사용·테크 토픽 활발, lg.com 관심 상위권",
    keywords: [
      { category: "TV", items: ["OLED vs MiniLED for bright living rooms", "DVB‑T2, SAT (Astra) compatibility"] },
      { category: "Gaming", items: ["PC HDR + 4:4:4 chroma", "NVIDIA G‑SYNC stability"] },
      { category: "Price/VAT", items: ["EU warranty, Mehrwertsteuer, seasonal promos"] },
      { category: "Sound", items: ["eARC to AV‑Receiver, Dolby Atmos passthrough"] },
    ],
  },
  {
    rank: 6, flag: "🇮🇳", name: "India", nameKo: "인도", risCode: "LGEIL",
    descriptionEn: "Growing English-speaking & mobile Reddit user base",
    descriptionKo: "영어 사용층 & 모바일 Reddit 사용자 급증 추세",
    keywords: [
      { category: "TV", items: ["OLED vs QLED value", "Peak brightness vs room lighting", "Service center availability"] },
      { category: "Gaming/PC", items: ["UltraGear availability (27–34″)", "PS5 HDR calibration"] },
      { category: "Price", items: ["US model vs India model SKU differences", "Import vs official distribution comparison"] },
    ],
  },
  {
    rank: 7, flag: "🇫🇷", name: "France", nameKo: "프랑스", risCode: "LGEFS",
    descriptionEn: "Large Reddit user count, sustained CE topic interest",
    descriptionKo: "Reddit 사용자 수 규모 상위, CE 주제 관심 지속",
    keywords: [
      { category: "TV", items: ["Film/Series HDR (Canal+, Netflix FR)", "Anti‑reflective performance"] },
      { category: "Install", items: ["Wall-embedded (placo) installation tips", "Cable management"] },
      { category: "Purchase", items: ["Darty/Boulanger vs LG.com FR", "Extension de garantie"] },
    ],
  },
  {
    rank: 8, flag: "🇧🇷", name: "Brazil", nameKo: "브라질", risCode: "LGESP",
    descriptionEn: "Growing user base, top lg.com traffic",
    descriptionKo: "사용자 기반 성장, lg.com 트래픽 상위권",
    keywords: [
      { category: "TV/Streaming", items: ["OLED for football (soccer) broadcasts", "Streaming apps stability"] },
      { category: "Price", items: ["US vs BR price gap/taxes", "Sale season/card promotions"] },
      { category: "Sound", items: ["Soundbar eARC with local ISP boxes"] },
    ],
  },
  {
    rank: 9, flag: "🇳🇱", name: "Netherlands", nameKo: "네덜란드", risCode: "LGEBN",
    descriptionEn: "High English proficiency relative to population, active tech forums",
    descriptionKo: "사용자 대비 영어 숙련도 높고 테크 포럼 참여 활발",
    keywords: [
      { category: "TV", items: ["Bright room + reflective handling", "Calibration settings sharing"] },
      { category: "Gaming", items: ["PC ultrawide + OLED burn‑in risk management", "VRR flicker discussion"] },
      { category: "Energy", items: ["Standby power, EU energy label"] },
    ],
  },
  {
    rank: 10, flag: "🇲🇽", name: "Mexico", nameKo: "멕시코", risCode: "LGEMS",
    descriptionEn: "Large user base, frequent North American product/pricing discussions",
    descriptionKo: "사용자 규모 상위, 북미 제품/가격·유통 관련 대화 잦음",
    keywords: [
      { category: "TV/Price", items: ["US import vs Mexico official distribution pricing", "Warranty issues"] },
      { category: "Gaming", items: ["Console 4K120, ALLM", "eARC with local set‑top boxes"] },
      { category: "Install", items: ["Wall mount installation/service areas"] },
    ],
  },
];

/* Category filter → keyword category matching */
const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  tv: ["TV", "TV/Price", "TV/Streaming", "Gaming", "Gaming/PC"],
  audio: ["Sound"],
  monitor: ["Gaming", "Gaming/PC"],
  laptop: ["Gaming/PC"],
  appliance: ["Install", "Install/UX", "Climate", "Energy"],
  india: [],
};

export const RedditCountryInsights = ({ category = "all" }: { category?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState<number | null>(null);
  const { t } = useLang();

  // Filter country keywords based on selected category
  const filteredCountries = useMemo(() => {
    if (category === "all" || category === "general" || category === "lifestyle") return countries;

    // For India category, only show India
    if (category === "india") return countries.filter((c) => c.risCode === "LGEIL");

    const relevantCats = CATEGORY_KEYWORD_MAP[category] || [];
    if (relevantCats.length === 0) return countries;

    return countries.map((country) => ({
      ...country,
      keywords: country.keywords.filter((kw) =>
        relevantCats.some((rc) => kw.category.toLowerCase().includes(rc.toLowerCase()))
      ),
    })).filter((c) => c.keywords.length > 0);
  }, [category]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full gradient-card rounded-xl border border-border p-4 md:p-5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold font-heading">🌍 {t("Reddit LG Product Mentions by Country TOP 10", "Reddit 국가별 LG 제품 언급 TOP 10")}</h3>
          {category !== "all" && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {category.toUpperCase()} 필터 적용
            </span>
          )}
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="gradient-card rounded-b-xl border border-t-0 border-border p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-2">
            {t(
              "Rankings estimating potential LG product mention volume on English Reddit from an English-speaking perspective.",
              "영어권 중심 관점에서 영문 Reddit 상 LG 제품 잠재 언급량을 추정한 순위입니다."
            )}
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            {t(
              "Sources: WorldPopulationReview (users), ExpertBeacon (engagement), SimilarWeb (lg.com traffic)",
              "출처: WorldPopulationReview (사용자 수), ExpertBeacon (참여도), SimilarWeb (lg.com 트래픽)"
            )}
          </p>

          {filteredCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("No country data for this category filter.", "이 카테고리에 해당하는 국가 데이터가 없습니다.")}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredCountries.map((country) => (
                <div key={country.rank} className="rounded-lg border border-border bg-background/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedCountry(expandedCountry === country.rank ? null : country.rank)}
                    className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                        {country.rank}
                      </span>
                      <span className="text-lg">{country.flag}</span>
                      <div>
                        <span className="font-semibold text-sm font-heading">{country.name}</span>
                        <span className="text-muted-foreground text-xs ml-2">({country.nameKo})</span>
                        <span className="text-xs font-mono text-primary/70 ml-2">[{country.risCode}]</span>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${expandedCountry === country.rank ? "rotate-180" : ""}`} />
                  </button>

                  {expandedCountry === country.rank && (
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-3 italic">{t(country.descriptionEn, country.descriptionKo)}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {country.keywords.map((kw) => (
                          <div key={kw.category} className="rounded-md bg-secondary/30 p-3">
                            <span className="text-xs font-semibold text-primary mb-1.5 block">{kw.category}</span>
                            <ul className="space-y-1">
                              {kw.items.map((item, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                  <span className="text-primary shrink-0">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
