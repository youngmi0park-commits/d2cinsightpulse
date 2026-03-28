import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import type { GlobalFilters } from "./GlobalFilterBar";

interface KW {
  keyword: string;
  count: number;
}

function KeywordBars({ keywords, color, max }: { keywords: KW[]; color: string; max: number }) {
  return (
    <div className="space-y-2">
      {keywords.map((kw) => (
        <div key={kw.keyword} className="flex items-center gap-3">
          <span className="text-xs w-32 truncate font-medium">{kw.keyword}</span>
          <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
            <div
              className={`h-full rounded ${color} transition-all`}
              style={{ width: `${Math.round((kw.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground w-8 text-right">{kw.count}</span>
        </div>
      ))}
      {keywords.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No keyword data available</p>
      )}
    </div>
  );
}

export function TopKeywordsWidget({ filters }: { filters: GlobalFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["top-keywords-widget", filters],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("trending_keywords")
        .select("keyword, count, sentiment")
        .order("count", { ascending: false })
        .limit(50);

      if (error) throw error;

      const positive: KW[] = [];
      const negative: KW[] = [];

      for (const row of rows || []) {
        if (row.sentiment === "positive" && positive.length < 8) {
          positive.push({ keyword: row.keyword, count: row.count });
        }
        if (row.sentiment === "negative" && negative.length < 8) {
          negative.push({ keyword: row.keyword, count: row.count });
        }
      }

      return { positive, negative };
    },
    staleTime: 60_000,
  });

  const max = Math.max(
    ...(data?.positive.map((k) => k.count) || [1]),
    ...(data?.negative.map((k) => k.count) || [1])
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Keywords by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <ThumbsUp className="h-4 w-4 text-success" />
                <h4 className="text-xs font-semibold text-success uppercase tracking-wide">Positive Keywords</h4>
              </div>
              <KeywordBars keywords={data.positive} color="bg-success" max={max} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <ThumbsDown className="h-4 w-4 text-destructive" />
                <h4 className="text-xs font-semibold text-destructive uppercase tracking-wide">Negative Keywords</h4>
              </div>
              <KeywordBars keywords={data.negative} color="bg-destructive" max={max} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
