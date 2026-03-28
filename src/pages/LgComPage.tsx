import { Store } from "lucide-react";
import { LgComReviewDashboard } from "@/components/LgComReviewDashboard";
import { DataStatusBar } from "@/components/DataStatusBar";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";
import { PageHeader } from "@/components/PageHeader";

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
      <DataStatusBar />
      <LgComReviewDashboard onProductClick={handleProductClick} />
      <WeeklyInsightsPanel />
    </div>
  );
};

export default LgComPage;
