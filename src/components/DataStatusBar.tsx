import { useSourceCounts } from "@/hooks/useProductData";

interface ChannelBadge {
  key: string;
  label: string;
  dotColor: string;
}

const CHANNEL_MAP: ChannelBadge[] = [
  { key: "lge_com", label: "LG.com", dotColor: "" },
  { key: "reddit", label: "Reddit", dotColor: "bg-orange-400" },
  { key: "trustpilot", label: "Trustpilot", dotColor: "bg-yellow-400" },
  { key: "youtube", label: "YouTube", dotColor: "bg-blue-500" },
  { key: "amazon", label: "Amazon", dotColor: "bg-amber-600" },
  { key: "bestreviews", label: "BestReviews", dotColor: "bg-success" },
];

export function DataStatusBar() {
  const { data: counts } = useSourceCounts();

  if (!counts) return null;

  const totalChannels = Object.keys(counts).length;
  const lgCount = counts["lge_com"] || 0;

  const knownKeys = CHANNEL_MAP.map((c) => c.key);
  const othersCount = Object.entries(counts)
    .filter(([k]) => !knownKeys.includes(k))
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="gradient-card rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-bold text-foreground">📡 데이터 수집 현황</span>
        <span className="text-[11px] font-semibold text-primary border border-primary/30 rounded-full px-3 py-0.5">
          {totalChannels} Channels Active
        </span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* LG.com — highlighted solid */}
        <span className="shrink-0 text-[11px] font-semibold text-primary-foreground bg-primary rounded-full px-3 py-1">
          LG.com {lgCount.toLocaleString()}
        </span>

        {/* Other channels with colored dots */}
        {CHANNEL_MAP.filter((c) => c.key !== "lge_com").map((channel) => {
          const count = counts[channel.key];
          if (!count) return null;
          return (
            <span
              key={channel.key}
              className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-card border border-border rounded-full px-3 py-1"
            >
              <span className={`h-2 w-2 rounded-full ${channel.dotColor}`} />
              {channel.label} {count.toLocaleString()}
            </span>
          );
        })}

        {/* Others */}
        {othersCount > 0 && (
          <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-card border border-border rounded-full px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
            Others {othersCount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
