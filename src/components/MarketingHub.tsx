import { useState } from "react";
import { MarketingPanel } from "@/components/MarketingPanel";
import { FaqToolkitPanel } from "@/components/FaqToolkitPanel";
import { ContentCreatorPanel } from "@/components/ContentCreatorPanel";
import { WeeklyReportPanel } from "@/components/WeeklyReportPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/contexts/LanguageContext";
import { Star, Wrench, Palette, FileText } from "lucide-react";
import type { GeoMessage } from "@/lib/formatMessage";
import type { MarketingOutput } from "@/lib/formatMessage";
import type { SentimentResult } from "@/lib/sentiment";

interface MarketingHubProps {
  geoMessages: GeoMessage[];
  productName: string;
  displayName: string;
  totalReviews: number;
  marketing: MarketingOutput;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string }[];
}

export function MarketingHub({
  geoMessages,
  productName,
  displayName,
  totalReviews,
  marketing,
  sentiment,
  reviews,
}: MarketingHubProps) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState("insights");

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-5 pt-5 pb-0 space-y-3">
          <div>
            <h2 className="text-lg font-bold font-heading text-foreground tracking-tight">
              Review‑Driven Marketing Toolkit
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("Real customer reviews → ready-to-use marketing actions", "실제 고객 리뷰 → 바로 쓸 수 있는 마케팅 액션")}
            </p>
          </div>
          <TabsList className="w-full h-auto p-1 bg-secondary/50 grid grid-cols-4 gap-1">
            <TabsTrigger
              value="insights"
              className="flex items-center gap-1.5 text-xs px-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Star className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Review Insights", "리뷰 인사이트")}</span>
              <span className="sm:hidden">{t("Insights", "인사이트")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="faq_toolkit"
              className="flex items-center gap-1.5 text-xs px-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("FAQ & Toolkit", "FAQ & 툴킷")}</span>
              <span className="sm:hidden">{t("FAQ", "FAQ")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="creator"
              className="flex items-center gap-1.5 text-xs px-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Content Creator", "컨텐츠 제작")}</span>
              <span className="sm:hidden">{t("Creator", "제작")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="weekly_report"
              className="flex items-center gap-1.5 text-xs px-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Weekly Report", "주간 리포트")}</span>
              <span className="sm:hidden">{t("Report", "리포트")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="insights" className="mt-0 focus-visible:ring-0">
          <MarketingPanel marketing={marketing} />
        </TabsContent>

        <TabsContent value="faq_toolkit" className="mt-0 focus-visible:ring-0">
          <FaqToolkitPanel
            productName={productName}
            displayName={displayName}
            sentiment={sentiment}
            reviews={reviews}
          />
        </TabsContent>

        <TabsContent value="creator" className="mt-0 focus-visible:ring-0">
          <ContentCreatorPanel
            productName={productName}
            displayName={displayName}
            sentiment={sentiment}
            reviews={reviews}
            marketing={marketing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
