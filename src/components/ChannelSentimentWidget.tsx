import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, MessageSquare, Loader2 } from "lucide-react";
import type { GlobalFilters } from "./GlobalFilterBar";

interface ChannelData {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  score: number;
}

function GaugeBar({ label, data, icon: Icon, accent }: { label: string; data: ChannelData; icon: any; accent: string }) {
  const posPercent = data.total ? Math.round((data.positive / data.total) * 100) : 0;
  const negPercent = data.total ? Math.round((data.negative / data.total) * 100) : 0;
  const neuPercent = 100 - posPercent - negPercent;

  return (
    <div className="flex-1 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${accent}`} />
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="ml-auto text-xs text-muted-foreground">{data.total.toLocaleString()} reviews</span>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold tracking-tight">{data.score}</div>
        <div className="text-xs text-muted-foreground mt-1">Sentiment Score</div>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
        <div className="bg-success h-full transition-all" style={{ width: `${posPercent}%` }} />
        <div className="bg-muted h-full transition-all" style={{ width: `${neuPercent}%` }} />
        <div className="bg-destructive h-full transition-all" style={{ width: `${negPercent}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-success font-medium">{posPercent}% Positive</span>
        <span>{neuPercent}% Neutral</span>
        <span className="text-destructive font-medium">{negPercent}% Negative</span>
      </div>
    </div>
  );
}

export function ChannelSentimentWidget({ filters }: { filters: GlobalFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["channel-sentiment", filters],
    queryFn: async () => {
      const buildQuery = (source: string) => {
        let q = supabase.from("reviews").select("sentiment, sentiment_score", { count: "exact" });
        q = q.eq("source", source);
        return q;
      };

      const [lgRes, redditRes] = await Promise.all([
        buildQuery("lge_com"),
        buildQuery("reddit"),
      ]);

      const aggregate = (rows: any[]): ChannelData => {
        const positive = rows.filter((r) => r.sentiment === "positive").length;
        const negative = rows.filter((r) => r.sentiment === "negative").length;
        const neutral = rows.filter((r) => r.sentiment === "neutral").length;
        const total = rows.length;
        const avgScore = total
          ? Math.round(rows.reduce((sum, r) => sum + (r.sentiment_score ?? 0.5), 0) / total * 100)
          : 0;
        return { positive, negative, neutral, total, score: avgScore };
      };

      return {
        lgcom: aggregate(lgRes.data || []),
        reddit: aggregate(redditRes.data || []),
      };
    },
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Channel Sentiment Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <GaugeBar label="LG.com (Verified Buyers)" data={data.lgcom} icon={Store} accent="text-primary" />
            <GaugeBar label="Reddit (Community)" data={data.reddit} icon={MessageSquare} accent="text-blue-500" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
