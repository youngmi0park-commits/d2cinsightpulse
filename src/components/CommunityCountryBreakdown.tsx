import { Globe, ChevronDown, ChevronUp, Database } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ── source → country + channel mapping ── */
const SOURCE_MAP: Record<string, { country: string; channel: string }> = {
  amazon: { country: "US", channel: "Amazon" },
  amazon_us: { country: "US", channel: "Amazon" },
  amazon_uk: { country: "UK", channel: "Amazon" },
  amazon_ca: { country: "CA", channel: "Amazon" },
  amazon_de: { country: "DE", channel: "Amazon" },
  amazon_fr: { country: "FR", channel: "Amazon" },
  amazon_au: { country: "AU", channel: "Amazon" },
  amazon_br: { country: "BR", channel: "Amazon" },
  amazon_mx: { country: "MX", channel: "Amazon" },
  amazon_jp: { country: "JP", channel: "Amazon" },
  amazon_sg: { country: "SG", channel: "Amazon" },
  amazon_in: { country: "IN", channel: "Amazon" },
  youtube: { country: "US", channel: "YouTube" },
  youtube_us: { country: "US", channel: "YouTube" },
  youtube_LGUSAChannel: { country: "US", channel: "YouTube" },
  youtube_uk: { country: "UK", channel: "YouTube" },
  youtube_ca: { country: "CA", channel: "YouTube" },
  youtube_de: { country: "DE", channel: "YouTube" },
  youtube_fr: { country: "FR", channel: "YouTube" },
  youtube_au: { country: "AU", channel: "YouTube" },
  youtube_jp: { country: "JP", channel: "YouTube" },
  youtube_sg: { country: "SG", channel: "YouTube" },
  youtube_my: { country: "MY", channel: "YouTube" },
  youtube_th: { country: "TH", channel: "YouTube" },
  youtube_ph: { country: "PH", channel: "YouTube" },
  youtube_id: { country: "ID", channel: "YouTube" },
  youtube_vn: { country: "VN", channel: "YouTube" },
  youtube_tw: { country: "TW", channel: "YouTube" },
  youtube_hk: { country: "HK", channel: "YouTube" },
  youtube_in: { country: "IN", channel: "YouTube" },
  bestbuy: { country: "US", channel: "Best Buy" },
  walmart: { country: "US", channel: "Walmart" },
  costco: { country: "US", channel: "Costco" },
  target: { country: "US", channel: "Target" },
  consumeraffairs: { country: "US", channel: "ConsumerAffairs" },
  consumer_reports: { country: "US", channel: "Consumer Reports" },
  bestreviews: { country: "US", channel: "BestReviews" },
  houzz: { country: "US", channel: "Houzz" },
  trustpilot: { country: "Global", channel: "Trustpilot" },
  rtings: { country: "Global", channel: "RTINGS" },
  pcmag: { country: "Global", channel: "PCMag" },
  cnet: { country: "Global", channel: "CNET" },
  techradar: { country: "Global", channel: "TechRadar" },
  notebookcheck: { country: "Global", channel: "Notebookcheck" },
  trusted_reviews: { country: "UK", channel: "Trusted Reviews" },
  lemon8: { country: "Global", channel: "Lemon8" },
  web_review: { country: "US", channel: "Web Review" },
  web_review_jp: { country: "JP", channel: "Web Review" },
  web_review_th: { country: "TH", channel: "Web Review" },
  web_review_in: { country: "IN", channel: "Web Review" },
  web_review_sg: { country: "SG", channel: "Web Review" },
  web_review_id: { country: "ID", channel: "Web Review" },
  web_review_vn: { country: "VN", channel: "Web Review" },
  web_review_hk: { country: "HK", channel: "Web Review" },
  web_review_tw: { country: "TW", channel: "Web Review" },
  shopee_sg: { country: "SG", channel: "Shopee" },
  shopee_my: { country: "MY", channel: "Shopee" },
  shopee_th: { country: "TH", channel: "Shopee" },
  shopee_ph: { country: "PH", channel: "Shopee" },
  shopee_id: { country: "ID", channel: "Shopee" },
  shopee_vn: { country: "VN", channel: "Shopee" },
  lazada_sg: { country: "SG", channel: "Lazada" },
  lazada_my: { country: "MY", channel: "Lazada" },
  lazada_th: { country: "TH", channel: "Lazada" },
  lazada_ph: { country: "PH", channel: "Lazada" },
  lazada_id: { country: "ID", channel: "Lazada" },
  lazada_vn: { country: "VN", channel: "Lazada" },
};

const COUNTRY_META: Record<string, { flag: string; nameKo: string }> = {
  US: { flag: "🇺🇸", nameKo: "미국" },
  UK: { flag: "🇬🇧", nameKo: "영국" },
  CA: { flag: "🇨🇦", nameKo: "캐나다" },
  DE: { flag: "🇩🇪", nameKo: "독일" },
  FR: { flag: "🇫🇷", nameKo: "프랑스" },
  AU: { flag: "🇦🇺", nameKo: "호주" },
  BR: { flag: "🇧🇷", nameKo: "브라질" },
  MX: { flag: "🇲🇽", nameKo: "멕시코" },
  JP: { flag: "🇯🇵", nameKo: "일본" },
  SG: { flag: "🇸🇬", nameKo: "싱가포르" },
  MY: { flag: "🇲🇾", nameKo: "말레이시아" },
  TH: { flag: "🇹🇭", nameKo: "태국" },
  PH: { flag: "🇵🇭", nameKo: "필리핀" },
  ID: { flag: "🇮🇩", nameKo: "인도네시아" },
  VN: { flag: "🇻🇳", nameKo: "베트남" },
  TW: { flag: "🇹🇼", nameKo: "대만" },
  HK: { flag: "🇭🇰", nameKo: "홍콩" },
  IN: { flag: "🇮🇳", nameKo: "인도" },
  Global: { flag: "🌍", nameKo: "글로벌" },
};

function useCommunityBreakdown() {
  return useQuery({
    queryKey: ["community-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("source")
        .not("source", "like", "lge_com%")
        .not("source", "like", "reddit%");
      if (error) throw error;

      // Count by source
      const sourceCounts: Record<string, number> = {};
      for (const r of data || []) {
        sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
      }

      // Map to country → channel → count
      const countryMap: Record<string, { total: number; channels: Record<string, number> }> = {};
      let grandTotal = 0;

      for (const [src, cnt] of Object.entries(sourceCounts)) {
        const mapped = SOURCE_MAP[src];
        const country = mapped?.country || "Global";
        const channel = mapped?.channel || src.replace(/_/g, " ");

        if (!countryMap[country]) countryMap[country] = { total: 0, channels: {} };
        countryMap[country].total += cnt;
        countryMap[country].channels[channel] = (countryMap[country].channels[channel] || 0) + cnt;
        grandTotal += cnt;
      }

      // Sort countries by total desc
      const sorted = Object.entries(countryMap)
        .map(([code, data]) => ({
          code,
          ...data,
          channelList: Object.entries(data.channels)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => b.total - a.total);

      return { countries: sorted, grandTotal };
    },
    staleTime: 60_000,
  });
}

const PREVIEW_COUNT = 5;

export function CommunityCountryBreakdown() {
  const { data, isLoading } = useCommunityBreakdown();
  const [showAll, setShowAll] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  if (isLoading || !data) return null;

  const preview = data.countries.slice(0, PREVIEW_COUNT);
  const remaining = data.countries.slice(PREVIEW_COUNT);
  const activeCount = data.countries.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2.5">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">국가별 보기</span>
          <span className="text-[10px] text-muted-foreground">
            ({activeCount}개 활성 지역 · {data.grandTotal.toLocaleString()}건)
          </span>
        </div>

        {/* All button + country pills */}
        <div className="flex flex-wrap items-center gap-1 mb-1">
          <span className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-primary text-primary-foreground shadow-sm">
            🌐 전체 {data.grandTotal.toLocaleString()}
          </span>

          <span className="text-border mx-1 text-xs">|</span>

          {data.countries.map((c) => {
            const meta = COUNTRY_META[c.code];
            return (
              <Tooltip key={c.code}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setExpandedCountry(expandedCountry === c.code ? null : c.code)}
                    className={`px-2 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                      expandedCountry === c.code
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {meta?.flag || "🌐"} {c.code}{" "}
                    <span className="text-[9px] opacity-70">{c.total.toLocaleString()}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">{meta?.flag} {meta?.nameKo || c.code}</p>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Database className="h-3 w-3" />
                    <span>{c.total.toLocaleString()} 건</span>
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    채널: {c.channelList.map((ch) => ch.name).join(", ")}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Expanded channel detail */}
        {expandedCountry && (() => {
          const country = data.countries.find((c) => c.code === expandedCountry);
          if (!country) return null;
          const meta = COUNTRY_META[country.code];
          return (
            <div className="mt-2 pt-2.5 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{meta?.flag}</span>
                <span className="text-xs font-semibold">{meta?.nameKo || country.code}</span>
                <Badge variant="secondary" className="text-[10px]">{country.total.toLocaleString()}건</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {country.channelList.map((ch) => (
                  <div key={ch.name} className="rounded-lg border border-border bg-background/50 px-3 py-2 min-w-[120px]">
                    <div className="text-[11px] font-medium text-foreground">{ch.name}</div>
                    <div className="text-sm font-bold text-primary">{ch.count.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </TooltipProvider>
  );
}
