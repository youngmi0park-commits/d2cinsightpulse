import { Store, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LgComReviewDashboard } from "@/components/LgComReviewDashboard";
import { DataStatusBar } from "@/components/DataStatusBar";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CountryReviewButtons() {
  const { data, isLoading } = useQuery({
    queryKey: ["lgcom-country-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lgcom_country_counts");
      if (error) throw error;
      return (data || []) as { country: string; count: number }[];
    },
    staleTime: 60_000,
  });

  const total = data?.reduce((s, c) => s + Number(c.count), 0) || 0;
  const FLAG: Record<string, string> = { US: "🇺🇸", UK: "🇬🇧", Other: "🌐" };

  return (
    <div className="gradient-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <Store className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold font-heading">국가별 LG.com 리뷰 수</h4>
        {total > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Total {total.toLocaleString()}
          </Badge>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data?.map((c) => (
            <div
              key={c.country}
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2.5 min-w-[120px]"
            >
              <span className="text-lg">{FLAG[c.country] || "🌐"}</span>
              <div>
                <div className="text-xs font-semibold text-foreground">{c.country}</div>
                <div className="text-lg font-bold text-primary">{Number(c.count).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LgComPage = () => {
  const handleProductClick = (model: string) => {
    window.location.href = `/?q=${encodeURIComponent(model)}`;
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Store}
        title="🏬 LG.com Insights"
        description="LG.com 공식몰에서 수집된 인증 구매자(Verified Buyer) 리뷰를 분석합니다. 국가별·제품별 감성 트렌드, 주요 키워드, 주간 인사이트 리포트를 확인하세요."
      />
      <CountryReviewButtons />
      <DataStatusBar />
      <LgComReviewDashboard onProductClick={handleProductClick} />
      <WeeklyInsightsPanel />
    </div>
  );
};

export default LgComPage;
