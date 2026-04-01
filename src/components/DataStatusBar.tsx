import { useState } from "react";
import { useSourceCounts, useProductStats, useCountryCounts } from "@/hooks/useProductData";
import { Database, BarChart3, ChevronDown, ChevronUp, Globe } from "lucide-react";

interface ChannelBadge {
  key: string;
  label: string;
  dotColor: string;
  bgColor: string;
}

const CHANNEL_MAP: ChannelBadge[] = [
  { key: "lge_com", label: "LG.com", dotColor: "bg-primary", bgColor: "bg-primary/10" },
  { key: "reddit", label: "Reddit", dotColor: "bg-orange-400", bgColor: "bg-orange-400/10" },
  { key: "trustpilot", label: "Trustpilot", dotColor: "bg-yellow-400", bgColor: "bg-yellow-400/10" },
  { key: "youtube", label: "YouTube", dotColor: "bg-blue-500", bgColor: "bg-blue-500/10" },
  { key: "amazon", label: "Amazon", dotColor: "bg-amber-600", bgColor: "bg-amber-600/10" },
  { key: "shopee", label: "Shopee", dotColor: "bg-orange-500", bgColor: "bg-orange-500/10" },
  { key: "lazada", label: "Lazada", dotColor: "bg-blue-600", bgColor: "bg-blue-600/10" },
  { key: "reviews_io", label: "Reviews.io", dotColor: "bg-cyan-500", bgColor: "bg-cyan-500/10" },
  { key: "complaintsboard", label: "ComplaintsBoard", dotColor: "bg-rose-500", bgColor: "bg-rose-500/10" },
  { key: "bestreviews", label: "BestReviews", dotColor: "bg-emerald-500", bgColor: "bg-emerald-500/10" },
  { key: "houzz", label: "Houzz", dotColor: "bg-green-600", bgColor: "bg-green-600/10" },
  { key: "consumeraffairs", label: "ConsumerAffairs", dotColor: "bg-sky-500", bgColor: "bg-sky-500/10" },
  { key: "rtings", label: "RTINGS", dotColor: "bg-violet-500", bgColor: "bg-violet-500/10" },
  { key: "techradar", label: "TechRadar", dotColor: "bg-red-500", bgColor: "bg-red-500/10" },
  { key: "pcmag", label: "PCMag", dotColor: "bg-indigo-500", bgColor: "bg-indigo-500/10" },
  { key: "soundguys", label: "SoundGuys", dotColor: "bg-pink-500", bgColor: "bg-pink-500/10" },
  { key: "consumer_reports", label: "Consumer Reports", dotColor: "bg-teal-500", bgColor: "bg-teal-500/10" },
  { key: "web_review", label: "Web Review", dotColor: "bg-gray-500", bgColor: "bg-gray-500/10" },
];

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", UK: "🇬🇧", JP: "🇯🇵", SG: "🇸🇬", MY: "🇲🇾", ID: "🇮🇩",
  TH: "🇹🇭", PH: "🇵🇭", VN: "🇻🇳", TW: "🇹🇼", HK: "🇭🇰", IN: "🇮🇳",
  DE: "🇩🇪", FR: "🇫🇷", AU: "🇦🇺", CA: "🇨🇦", BR: "🇧🇷", MX: "🇲🇽",
  Global: "🌐", Other: "🔹",
};

export function DataStatusBar() {
  const [expanded, setExpanded] = useState(false);
  const [countryExpanded, setCountryExpanded] = useState(false);
  const { data: counts } = useSourceCounts();
  const { data: stats } = useProductStats();
  const { data: countryCounts } = useCountryCounts();

  if (!counts) return null;

  const totalChannels = Object.keys(counts).length;
  const totalReviews = Object.values(counts).reduce((sum, v) => sum + v, 0);

  const knownKeys = CHANNEL_MAP.map((c) => c.key);
  const otherEntries = Object.entries(counts).filter(([k]) => !knownKeys.includes(k));
  const othersCount = otherEntries.reduce((sum, [, v]) => sum + v, 0);

  // Sort channels by count descending
  const sortedChannels = CHANNEL_MAP
    .map((ch) => ({ ...ch, count: counts[ch.key] || 0 }))
    .filter((ch) => ch.count > 0)
    .sort((a, b) => b.count - a.count);

  // Calculate percentage for bar
  const maxCount = sortedChannels.length > 0 ? sortedChannels[0].count : 1;

  return (
    <div className="gradient-card rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">📡 데이터 수집 통합 현황</span>
          <span className="text-[11px] font-semibold text-primary border border-primary/30 rounded-full px-3 py-0.5">
            {totalChannels} Channels Active
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

      {/* Quick badges row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {sortedChannels.slice(0, 6).map((channel) => (
          <span
            key={channel.key}
            className={`shrink-0 flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1 ${
              channel.key === "lge_com"
                ? "text-primary-foreground bg-primary font-semibold"
                : "text-muted-foreground bg-card border border-border"
            }`}
          >
            {channel.key !== "lge_com" && (
              <span className={`h-2 w-2 rounded-full ${channel.dotColor}`} />
            )}
            {channel.label} {channel.count.toLocaleString()}
          </span>
        ))}
        {(sortedChannels.length > 6 || othersCount > 0) && (
          <span className="shrink-0 text-[11px] text-muted-foreground font-medium bg-card border border-border rounded-full px-3 py-1">
            +{sortedChannels.length - 6 + otherEntries.length}개 채널
          </span>
        )}
      </div>

      {/* Collapsible detailed breakdown */}
      <div className="border-t border-border pt-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
        >
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">채널별 누적 리뷰 수</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          )}
        </button>
        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {sortedChannels.map((channel) => {
              const pct = Math.round((channel.count / totalReviews) * 100);
              const barWidth = Math.max(4, Math.round((channel.count / maxCount) * 100));
              return (
                <div key={channel.key} className="flex items-center gap-2 group">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${channel.dotColor}`} />
                  <span className="text-[11px] font-medium text-foreground w-[110px] truncate">
                    {channel.label}
                  </span>
                  <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full ${channel.dotColor} opacity-70 transition-all`}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-semibold text-foreground/70">
                      {channel.count.toLocaleString()}건
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-[32px] text-right">{pct}%</span>
                </div>
              );
            })}
            {otherEntries.map(([key, count]) => {
              const pct = Math.round((count / totalReviews) * 100);
              const barWidth = Math.max(4, Math.round((count / maxCount) * 100));
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-muted-foreground/40" />
                  <span className="text-[11px] font-medium text-foreground w-[110px] truncate">
                    {key}
                  </span>
                  <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-muted-foreground/40 opacity-70"
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-semibold text-foreground/70">
                      {count.toLocaleString()}건
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-[32px] text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Country breakdown */}
      {countryCounts && Object.keys(countryCounts).length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setCountryExpanded((v) => !v)}
            className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">국가별 리뷰 수</span>
            {countryExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            )}
          </button>
          {/* Country quick badges */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {Object.entries(countryCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([country, count]) => (
                <span
                  key={country}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-medium rounded-full px-2.5 py-0.5 text-muted-foreground bg-card border border-border"
                >
                  {COUNTRY_FLAGS[country] || "🔹"} {country} {count.toLocaleString()}
                </span>
              ))}
          </div>
          {countryExpanded && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {Object.entries(countryCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([country, count]) => {
                  const totalCtry = Object.values(countryCounts).reduce((s, v) => s + v, 0);
                  const pct = Math.round((count / totalCtry) * 100);
                  const maxCtry = Math.max(...Object.values(countryCounts));
                  const barWidth = Math.max(4, Math.round((count / maxCtry) * 100));
                  return (
                    <div key={country} className="flex items-center gap-2">
                      <span className="text-sm">{COUNTRY_FLAGS[country] || "🔹"}</span>
                      <span className="text-[11px] font-medium text-foreground w-[40px]">
                        {country}
                      </span>
                      <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-semibold text-foreground/70">
                          {count.toLocaleString()}건
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-[32px] text-right">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
