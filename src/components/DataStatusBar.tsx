import { useState } from "react";
import { useSourceCounts, useProductStats, useCountryCounts } from "@/hooks/useProductData";
import { Database, BarChart3, ChevronDown, ChevronUp, Globe, Layers } from "lucide-react";

interface ChannelBadge {
  key: string;
  label: string;
  dotColor: string;
}

const CHANNEL_MAP: ChannelBadge[] = [
  { key: "lge_com", label: "LG.com", dotColor: "bg-rose-500" },
  { key: "reddit", label: "Reddit", dotColor: "bg-orange-400" },
  { key: "youtube", label: "YouTube", dotColor: "bg-red-500" },
  { key: "trustpilot", label: "Trustpilot", dotColor: "bg-yellow-400" },
  { key: "consumer_reports", label: "Consumer Reports", dotColor: "bg-teal-500" },
  { key: "amazon", label: "Amazon", dotColor: "bg-amber-600" },
  { key: "shopee", label: "Shopee", dotColor: "bg-orange-500" },
  { key: "lazada", label: "Lazada", dotColor: "bg-blue-600" },
  { key: "reviews_io", label: "Reviews.io", dotColor: "bg-cyan-500" },
  { key: "complaintsboard", label: "ComplaintsBoard", dotColor: "bg-rose-500" },
  { key: "bestreviews", label: "BestReviews", dotColor: "bg-emerald-500" },
  { key: "houzz", label: "Houzz", dotColor: "bg-green-600" },
  { key: "consumeraffairs", label: "ConsumerAffairs", dotColor: "bg-sky-500" },
  { key: "rtings", label: "RTINGS", dotColor: "bg-violet-500" },
  { key: "techradar", label: "TechRadar", dotColor: "bg-red-400" },
  { key: "pcmag", label: "PCMag", dotColor: "bg-indigo-500" },
  { key: "soundguys", label: "SoundGuys", dotColor: "bg-pink-500" },
  { key: "web_review", label: "Web Review", dotColor: "bg-gray-500" },
];

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", UK: "🇬🇧", JP: "🇯🇵", SG: "🇸🇬", MY: "🇲🇾", ID: "🇮🇩",
  TH: "🇹🇭", PH: "🇵🇭", VN: "🇻🇳", TW: "🇹🇼", HK: "🇭🇰", IN: "🇮🇳",
  DE: "🇩🇪", FR: "🇫🇷", AU: "🇦🇺", CA: "🇨🇦", BR: "🇧🇷", MX: "🇲🇽",
  Global: "🌐", Other: "🔹",
};

export function DataStatusBar() {
  const [channelExpanded, setChannelExpanded] = useState(false);
  const [countryExpanded, setCountryExpanded] = useState(false);
  const { data: counts } = useSourceCounts() as { data: Record<string, number> | undefined };
  const { data: stats } = useProductStats();
  const { data: countryCounts } = useCountryCounts() as { data: Record<string, number> | undefined };

  if (!counts) return null;

  const totalChannels = Object.keys(counts).length;
  const totalReviews = Object.values(counts).reduce((sum, v) => sum + v, 0);

  const knownKeys = CHANNEL_MAP.map((c) => c.key);
  const otherEntries = Object.entries(counts).filter(([k]) => !knownKeys.includes(k));

  const sortedChannels = CHANNEL_MAP
    .map((ch) => ({ ...ch, count: counts[ch.key] || 0 }))
    .filter((ch) => ch.count > 0)
    .sort((a, b) => b.count - a.count);

  const allChannels = [
    ...sortedChannels,
    ...otherEntries.map(([key, count]) => ({ key, label: key, dotColor: "bg-muted-foreground/50", count })),
  ];

  const maxCount = allChannels.length > 0 ? allChannels[0].count : 1;

  const sortedCountries = countryCounts
    ? Object.entries(countryCounts).sort(([, a], [, b]) => b - a)
    : [];
  const totalCountryReviews = sortedCountries.reduce((s, [, v]) => s + v, 0);
  const maxCountry = sortedCountries.length > 0 ? sortedCountries[0][1] : 1;

  return (
    <div className="gradient-card rounded-xl p-5 space-y-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Layers className="h-4 w-4 text-foreground" />
          <span className="text-sm font-bold text-foreground">데이터 수집 통합 현황</span>
          <span className="text-[10px] font-semibold text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
            {totalChannels} Channels · {sortedCountries.length} Countries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">
            총 {totalReviews.toLocaleString()}건
          </span>
          {stats && (
            <span className="text-[10px] text-muted-foreground">
              · {stats.productCount}개 제품
            </span>
          )}
        </div>
      </div>

      {/* ── 2-column: Platform / Country ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden">
        {/* Platform Column */}
        <div className={`${countryExpanded || channelExpanded ? "" : ""} border-b md:border-b-0 md:border-r border-border`}>
          <button
            onClick={() => setChannelExpanded((v) => !v)}
            className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5 text-foreground" />
            <span className="text-xs font-semibold text-foreground flex-1">플랫폼별 수집 현황</span>
            <span className="text-[10px] text-muted-foreground mr-2">{allChannels.length}개</span>
            {channelExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {/* Quick badges */}
          <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
            {allChannels.slice(0, 5).map((ch) => (
              <span
                key={ch.key}
                className="shrink-0 flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2.5 py-0.5 text-muted-foreground bg-muted/40 border border-border"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ch.dotColor}`} />
                {ch.label} {ch.count.toLocaleString()}
              </span>
            ))}
            {allChannels.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{allChannels.length - 5}
              </span>
            )}
          </div>

          {/* Expanded detail */}
          {channelExpanded && (
            <div className="px-4 pb-4 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              {allChannels.map((ch) => {
                const pct = Math.round((ch.count / totalReviews) * 100);
                const barWidth = Math.max(3, Math.round((ch.count / maxCount) * 100));
                return (
                  <div key={ch.key} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${ch.dotColor}`} />
                    <span className="text-[11px] font-medium text-foreground w-[100px] truncate">{ch.label}</span>
                    <div className="flex-1 h-3.5 bg-muted/40 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full ${ch.dotColor} opacity-60`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-foreground w-[52px] text-right">
                      {ch.count.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-muted-foreground w-[28px] text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Country Column */}
        <div>
          <button
            onClick={() => setCountryExpanded((v) => !v)}
            className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-foreground" />
            <span className="text-xs font-semibold text-foreground flex-1">국가별 수집 현황</span>
            <span className="text-[10px] text-muted-foreground mr-2">{sortedCountries.length}개국</span>
            {countryExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {/* Quick badges */}
          <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
            {sortedCountries.slice(0, 5).map(([country, count]) => (
              <span
                key={country}
                className="shrink-0 flex items-center gap-1 text-[10px] font-medium rounded-full px-2.5 py-0.5 text-muted-foreground bg-muted/40 border border-border"
              >
                {COUNTRY_FLAGS[country] || "🔹"} {country} {count.toLocaleString()}
              </span>
            ))}
            {sortedCountries.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{sortedCountries.length - 5}
              </span>
            )}
          </div>

          {/* Expanded detail */}
          {countryExpanded && (
            <div className="px-4 pb-4 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              {sortedCountries.map(([country, count]) => {
                const pct = Math.round((count / totalCountryReviews) * 100);
                const barWidth = Math.max(3, Math.round((count / maxCountry) * 100));
                return (
                  <div key={country} className="flex items-center gap-2">
                    <span className="text-sm">{COUNTRY_FLAGS[country] || "🔹"}</span>
                    <span className="text-[11px] font-medium text-foreground w-[40px]">{country}</span>
                    <div className="flex-1 h-3.5 bg-muted/40 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-foreground/20 opacity-80"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-foreground w-[52px] text-right">
                      {count.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-muted-foreground w-[28px] text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
