import { useSourceCounts, useProductStats, useCountryCounts } from "@/hooks/useProductData";
import { Database, Globe, Layers, ArrowRight, TrendingUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Link } from "react-router-dom";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", UK: "🇬🇧", JP: "🇯🇵", SG: "🇸🇬", MY: "🇲🇾", ID: "🇮🇩",
  TH: "🇹🇭", PH: "🇵🇭", VN: "🇻🇳", TW: "🇹🇼", HK: "🇭🇰", IN: "🇮🇳",
  DE: "🇩🇪", FR: "🇫🇷", AU: "🇦🇺", CA: "🇨🇦", BR: "🇧🇷", MX: "🇲🇽",
  Global: "🌐", Other: "🔹",
};
// ISO → LGE 법인 코드
const COUNTRY_LGE: Record<string, string> = {
  US: "LGEUS", UK: "LGEUK", JP: "LGEJP", SG: "LGESL", MY: "LGEML", ID: "LGEIN",
  TH: "LGETH", PH: "LGEPH", VN: "LGEVN", TW: "LGETT", HK: "LGEHK", IN: "LGEIL",
  DE: "LGEDE", FR: "LGEFS", AU: "LGEAP", CA: "LGECI", BR: "LGESP", MX: "LGEMS",
};

export function DataStatusBar() {
  const { data: counts } = useSourceCounts() as { data: Record<string, number> | undefined };
  const { data: stats } = useProductStats();
  const { data: countryCounts } = useCountryCounts() as { data: Record<string, number> | undefined };

  if (!counts) return null;

  const totalChannels = Object.keys(counts).length;
  const totalReviews = Object.values(counts).reduce((sum, v) => sum + v, 0);

  const sortedCountries = countryCounts
    ? Object.entries(countryCounts).sort(([, a], [, b]) => b - a)
    : [];

  // Top 3 channels by count
  const topChannels = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Top 5 countries
  const topCountries = sortedCountries.slice(0, 5);

  return (
    <div className="gradient-card rounded-xl p-4">
      {/* ── Compact KPI Row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Title + KPIs */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-foreground" />
            <span className="text-sm font-bold text-foreground">수집 현황</span>
          </div>

          {/* KPI pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-full px-3 py-1">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">{totalReviews.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">건</span>
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-full px-3 py-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">{stats?.productCount?.toLocaleString() || "–"}</span>
              <span className="text-[10px] text-muted-foreground">제품</span>
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-full px-3 py-1">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">{sortedCountries.length}</span>
              <span className="text-[10px] text-muted-foreground">국가</span>
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-full px-3 py-1">
              <span className="text-[11px] font-bold text-foreground">{totalChannels}</span>
              <span className="text-[10px] text-muted-foreground">채널</span>
            </div>
          </div>
        </div>

        {/* Right: Collection detail link */}
        <Link
          to="/collection"
          className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors group"
        >
          상세 수집 현황 보기
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Mini summary row: Top channels + Top countries ── */}
      <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
        <span className="font-semibold text-foreground/70">TOP 채널</span>
        {topChannels.map(([key, count]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="font-medium text-foreground">{key === "lge_com" ? "LG.com" : key === "reddit" ? "Reddit" : key === "youtube" ? "YouTube" : key}</span>
            <span>{Number(count).toLocaleString()}</span>
          </span>
        ))}

        <span className="text-border mx-1">|</span>

        <span className="font-semibold text-foreground/70">TOP 국가</span>
        {topCountries.map(([country, count]) => (
          <span key={country} className="flex items-center gap-0.5">
            {COUNTRY_FLAGS[country] || "🔹"} {COUNTRY_LGE[country] || country}
            <span className="font-medium text-foreground">{Number(count).toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
