import { Store, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LgComReviewDashboard } from "@/components/LgComReviewDashboard";
import { LgComWeeklyReport } from "@/components/LgComWeeklyReport";
import { LgComWeeklySummary } from "@/components/LgComWeeklySummary";
import { LgComBucketDashboard } from "@/components/LgComBucketDashboard";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";

function CountryReviewSummary() {
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Store className="h-4 w-4 text-primary" />
            <div>
              <div className="text-[10px] text-muted-foreground font-medium">LG.com {isLoading ? "" : "Total"}</div>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
              ) : (
                <div className="text-xl font-bold text-foreground">{total.toLocaleString()}</div>
              )}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          {!isLoading && data?.map((c) => (
            <div key={c.country} className="flex items-center gap-2">
              <span className="text-base">{FLAG[c.country] || "🌐"}</span>
              <div>
                <div className="text-[10px] text-muted-foreground font-medium">{c.country}</div>
                <div className="text-base font-bold text-foreground">{Number(c.count).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
      {/* 1. 국가별 수집 현황 */}
      <CountryReviewSummary />
      {/* 2. 주간 인사이트 요약 (데이터 기반 즉시 노출) */}
      <LgComWeeklySummary />
      {/* 3. 리뷰 자동 분류 (REVIEW/VOC/QUESTION) */}
      <LgComBucketDashboard />
      {/* 4. AI 주간 리포트 (주제/강점/액션/제품별) */}
      <LgComWeeklyReport />
      {/* 5. 딥 인사이트 (페르소나/JTBD/CRM) — 별도 분석 */}
      <WeeklyInsightsPanel />
      {/* 6. 긍/부정 리뷰 대시보드 */}
      <LgComReviewDashboard onProductClick={handleProductClick} />
    </div>
  );
};

export default LgComPage;
