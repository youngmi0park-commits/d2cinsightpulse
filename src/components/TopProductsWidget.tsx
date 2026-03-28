import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, AlertTriangle, ArrowRight } from "lucide-react";
import type { GlobalFilters } from "./GlobalFilterBar";

interface RankedProduct {
  name: string;
  displayName: string;
  reviewCount: number;
  score: number;
  topKeyword: string;
}

function ProductList({
  products,
  variant,
  onGoToToolkit,
}: {
  products: RankedProduct[];
  variant: "praised" | "attention";
  onGoToToolkit?: (name: string) => void;
}) {
  const isPraised = variant === "praised";

  return (
    <div className="space-y-1">
      {products.map((p, i) => (
        <div
          key={p.name}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
        >
          <span className={`text-xs font-bold w-5 text-center ${isPraised ? "text-success" : "text-destructive"}`}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.displayName || p.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{p.reviewCount} reviews</span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 h-4 ${
                  isPraised ? "border-success/30 text-success" : "border-destructive/30 text-destructive"
                }`}
              >
                {p.topKeyword}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold ${isPraised ? "text-success" : "text-destructive"}`}>
              {p.score}
            </span>
            {onGoToToolkit && (
              <button
                onClick={() => onGoToToolkit(p.name)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-primary flex items-center gap-0.5 transition-opacity whitespace-nowrap"
              >
                Go to Toolkit <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ))}
      {products.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">No product data available</p>
      )}
    </div>
  );
}

export function TopProductsWidget({
  filters,
  onProductClick,
}: {
  filters: GlobalFilters;
  onProductClick?: (modelNumber: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["top-products-widget", filters],
    queryFn: async () => {
      // Fetch products with their review stats
      const { data: products, error } = await supabase
        .from("trending_snapshots")
        .select("*, products!inner(model_number, display_name, category)")
        .order("avg_sentiment_score", { ascending: false })
        .limit(20);

      if (error) throw error;

      const items: (RankedProduct & { rawScore: number })[] = (products || []).map((p: any) => ({
        name: p.products.model_number,
        displayName: p.products.display_name,
        reviewCount: p.mention_count || 0,
        score: Math.round((p.avg_sentiment_score || 0.5) * 100),
        rawScore: p.avg_sentiment_score || 0.5,
        topKeyword: p.trend === "up" ? "trending ↑" : p.trend === "down" ? "declining ↓" : "stable",
      }));

      const praised = [...items].sort((a, b) => b.rawScore - a.rawScore).slice(0, 5);
      const attention = [...items].sort((a, b) => a.rawScore - b.rawScore).slice(0, 5);

      return { praised, attention };
    },
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top 10 Products by Sentiment</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-2 px-3">
                <Trophy className="h-4 w-4 text-success" />
                <h4 className="text-xs font-semibold text-success uppercase tracking-wide">Praised Products</h4>
                <span className="text-[10px] text-muted-foreground ml-auto">Marketing asset potential</span>
              </div>
              <ProductList products={data.praised} variant="praised" onGoToToolkit={onProductClick} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2 px-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h4 className="text-xs font-semibold text-destructive uppercase tracking-wide">Attention Needed</h4>
                <span className="text-[10px] text-muted-foreground ml-auto">Defense messaging required</span>
              </div>
              <ProductList products={data.attention} variant="attention" onGoToToolkit={onProductClick} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
