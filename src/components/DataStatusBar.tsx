import { useState } from "react";
import { useSourceCounts, useProductStats } from "@/hooks/useProductData";
import { Database, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

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
  { key: "bestreviews", label: "BestReviews", dotColor: "bg-emerald-500", bgColor: "bg-emerald-500/10" },
  { key: "houzz", label: "Houzz", dotColor: "bg-green-600", bgColor: "bg-green-600/10" },
  { key: "consumeraffairs", label: "ConsumerAffairs", dotColor: "bg-sky-500", bgColor: "bg-sky-500/10" },
  { key: "rtings", label: "RTINGS", dotColor: "bg-violet-500", bgColor: "bg-violet-500/10" },
  { key: "techradar", label: "TechRadar", dotColor: "bg-red-500", bgColor: "bg-red-500/10" },
  { key: "pcmag", label: "PCMag", dotColor: "bg-indigo-500", bgColor: "bg-indigo-500/10" },
  { key: "soundguys", label: "SoundGuys", dotColor: "bg-pink-500", bgColor: "bg-pink-500/10" },
  { key: "consumer_reports", label: "Consumer Reports", dotColor: "bg-teal-500", bgColor: "bg-teal-500/10" },
];

export function DataStatusBar() {
  const { data: counts } = useSourceCounts();
  const { data: stats } = useProductStats();

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

      {/* Detailed breakdown */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">채널별 누적 리뷰 수</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
      </div>
    </div>
  );
}
