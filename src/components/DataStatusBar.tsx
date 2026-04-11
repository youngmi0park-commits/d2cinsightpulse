import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, Globe, Layers, ArrowRight, TrendingUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useProductStats, useCountryCounts } from "@/hooks/useProductData";

const SOURCE_LABELS: Record<string, string> = {
  lge_com_us: "LG.com US",
  lge_com_uk: "LG.com UK",
  lge_com_au: "LG.com AU",
  lge_com_de: "LG.com DE",
  lge_com_tw: "LG.com TW",
  lge_com_jp: "LG.com JP",
  lge_com_in: "LG.com IN",
  lge_com_th: "LG.com TH",
  reddit: "Reddit",
  youtube: "YouTube",
  bestbuy: "Best Buy",
  amazon_us: "Amazon US",
  web_review_jp: "Web Review JP",
};

function useWeeklyChannelStats() {
  return useQuery({
    queryKey: ["weekly-channel-stats"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("reviews")
        .select("source, sentiment")
        .gte("collected_at", weekAgo);
      if (error) throw error;

      const map: Record<string, { total: number; pos: number; neg: number }> = {};
      for (const r of data || []) {
        const s = r.source;
        if (!map[s]) map[s] = { total: 0, pos: 0, neg: 0 };
        map[s].total++;
        if (r.sentiment === "positive") map[s].pos++;
        else if (r.sentiment === "negative") map[s].neg++;
      }

      return Object.entries(map)
        .map(([source, v]) => ({ source, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function DataStatusBar() {
  const { data: weeklyTop } = useWeeklyChannelStats();
  const { data: stats } = useProductStats();
  const { data: countryCounts } = useCountryCounts() as { data: Record<string, number> | undefined };

  const sortedCountries = countryCounts
    ? Object.entries(countryCounts).sort(([, a], [, b]) => b - a)
    : [];

  const weeklyTotal = weeklyTop?.reduce((s, c) => s + c.total, 0) ?? 0;

  return (
    <div className="gradient-card rounded-xl p-4">
      {/* ── Compact KPI Row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-foreground" />
            <span className="text-sm font-bold text-foreground">주간 수집 현황</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-full px-3 py-1">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">{weeklyTotal.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">건 (7일)</span>
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
          </div>
        </div>

        <Link
          to="/collection"
          className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors group"
        >
          상세 수집 현황
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Weekly Top 5 Channels ── */}
      {weeklyTop && weeklyTop.length > 0 && (
        <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground/70 shrink-0">TOP 5 채널</span>
          {weeklyTop.map((ch) => (
            <span key={ch.source} className="inline-flex items-center gap-1 bg-muted/30 rounded-full px-2 py-0.5">
              <span className="font-medium text-foreground">
                {SOURCE_LABELS[ch.source] || ch.source}
              </span>
              <span>{ch.total.toLocaleString()}</span>
              <ThumbsUp className="h-2.5 w-2.5 text-emerald-500 ml-0.5" />
              <span className="text-emerald-600">{ch.pos.toLocaleString()}</span>
              <ThumbsDown className="h-2.5 w-2.5 text-rose-400" />
              <span className="text-rose-500">{ch.neg.toLocaleString()}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
