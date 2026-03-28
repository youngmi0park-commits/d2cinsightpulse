import { useState } from "react";
import { LgComReviewDashboard } from "@/components/LgComReviewDashboard";
import { ChannelSentimentWidget } from "@/components/ChannelSentimentWidget";
import { TopKeywordsWidget } from "@/components/TopKeywordsWidget";
import { TopProductsWidget } from "@/components/TopProductsWidget";
import { DataStatusBar } from "@/components/DataStatusBar";
import { GlobalFilterBar, type GlobalFilters } from "@/components/GlobalFilterBar";
import { WeeklyInsightsPanel } from "@/components/WeeklyInsightsPanel";

const LgComPage = () => {
  const [filters, setFilters] = useState<GlobalFilters>({
    country: "global",
    timeframe: "weekly",
  });

  const handleProductClick = (model: string) => {
    // Navigate to search or handle product click
    window.location.href = `/?q=${encodeURIComponent(model)}`;
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <DataStatusBar />
      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <LgComReviewDashboard onProductClick={handleProductClick} />

      <ChannelSentimentWidget filters={filters} />
      <TopKeywordsWidget filters={filters} />
      <TopProductsWidget filters={filters} onProductClick={handleProductClick} />

      <WeeklyInsightsPanel />
    </div>
  );
};

export default LgComPage;
