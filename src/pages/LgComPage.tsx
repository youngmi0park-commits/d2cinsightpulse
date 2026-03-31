import { Store, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LgComProductInsightCards } from "@/components/LgComProductInsightCards";
import { LgComBucketDashboard } from "@/components/LgComBucketDashboard";
import { LgComWeeklyReport } from "@/components/LgComWeeklyReport";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";

/* Compact inline summary — just total + country split, no large KPI cards */
function CompactDataBar() {
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
  const FLAG: Record<string, string> = { US: "🇺🇸", UK: "🇬🇧" };

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
      <div className="flex items-center gap-1.5">
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>
        <span>reviews collected</span>
      </div>
      <span className="text-border">|</span>
      {data?.map((c) => (
        <span key={c.country} className="flex items-center gap-1">
          {FLAG[c.country] || "🌐"} {c.country} <span className="font-medium text-foreground">{Number(c.count).toLocaleString()}</span>
        </span>
      ))}
    </div>
  );
}

const LgComPage = () => {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Store}
        title="🏬 LG.com Insights"
        description="LG.com 리뷰에서 어떤 제품이 긍정/부정 언급되고 있는지, 핵심 키워드는 무엇인지 확인하고 마케팅 콘텐츠로 활용하세요."
      />
      {/* Compact data bar — minimal metrics */}
      <CompactDataBar />
      {/* 1. 핵심: 제품별 인사이트 카드 (Reddit PostCard 스타일) */}
      <LgComProductInsightCards />
      {/* 2. 리뷰 자동 분류 (REVIEW/VOC) — 제품+키워드 중심 */}
      <LgComBucketDashboard />
      {/* 3. AI 주간 리포트 */}
      <LgComWeeklyReport />
      {/* 4. 딥 인사이트 (사용자군/JTBD/CRM) */}
      <WeeklyInsightsPanel />
    </div>
  );
};

export default LgComPage;
