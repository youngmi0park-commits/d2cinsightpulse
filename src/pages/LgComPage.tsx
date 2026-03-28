import { LgComReviewDashboard } from "@/components/LgComReviewDashboard";
import { DataStatusBar } from "@/components/DataStatusBar";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";

const LgComPage = () => {
  const handleProductClick = (model: string) => {
    window.location.href = `/?q=${encodeURIComponent(model)}`;
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <DataStatusBar />
      <LgComReviewDashboard onProductClick={handleProductClick} />
      <WeeklyInsightsPanel />
    </div>
  );
};

export default LgComPage;
