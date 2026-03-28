import { useSourceCounts } from "@/hooks/useProductData";

interface ChannelBadge {
  key: string;
  label: string;
  dotColor: string;
}

const CHANNEL_MAP: ChannelBadge[] = [
  { key: "lge_com", label: "LG.com", dotColor: "" }, // highlighted separately
  { key: "reddit", label: "Reddit", dotColor: "bg-orange-400" },
  { key: "trustpilot", label: "Trustpilot", dotColor: "bg-yellow-400" },
  { key: "youtube", label: "YouTube", dotColor: "bg-blue-500" },
  { key: "amazon", label: "Amazon", dotColor: "bg-amber-600" },
  { key: "bestreviews", label: "BestReviews", dotColor: "bg-emerald-500" },
];

export function DataStatusBar() {
  const { data: counts } = useSourceCounts();

  if (!counts) return null;

  const totalChannels = Object.keys(counts).length;
  const lgCount = counts["lge_com"] || 0;

  // Gather "others" count
  const knownKeys = CHANNEL_MAP.map((c) => c.key);
  const othersCount = Object.entries(counts)
    .filter(([k]) => !knownKeys.includes(k))
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="bg-gray-50 border-b border-border px-5 py-2.5 rounded-xl">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* Total channels badge */}
        <span className="shrink-0 text-[11px] font-semibold text-red-600 border border-red-200 rounded-full px-3 py-1">
          {totalChannels} Channels Active
        </span>

        <span className="w-px h-5 bg-gray-200 shrink-0" />

        {/* LG.com — highlighted solid */}
        <span className="shrink-0 text-[11px] font-semibold text-white bg-[#B83228] rounded-full px-3 py-1">
          LG.com {lgCount.toLocaleString()}
        </span>

        {/* Other channels with colored dots */}
        {CHANNEL_MAP.filter((c) => c.key !== "lge_com").map((channel) => {
          const count = counts[channel.key];
          if (!count) return null;
          return (
            <span
              key={channel.key}
              className="shrink-0 flex items-center gap-1.5 text-[11px] text-gray-700 font-medium bg-white border border-gray-200 rounded-full px-3 py-1"
            >
              <span className={`h-2 w-2 rounded-full ${channel.dotColor}`} />
              {channel.label} {count.toLocaleString()}
            </span>
          );
        })}

        {/* Others */}
        {othersCount > 0 && (
          <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-gray-700 font-medium bg-white border border-gray-200 rounded-full px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Others {othersCount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
