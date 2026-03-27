import { useState } from "react";
import { MarketingPanel } from "@/components/MarketingPanel";
import { FaqToolkitPanel } from "@/components/FaqToolkitPanel";
import { ContentCreatorPanel } from "@/components/ContentCreatorPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/contexts/LanguageContext";
import { Star, Wrench, Palette } from "lucide-react";
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
  const [studioCopy, setStudioCopy] = useState<{ headline: string; body: string; channel: "inside" | "outside" } | null>(null);

  const handleGoToStudio = useCallback((copy: { headline: string; body: string; channel: "inside" | "outside" }) => {
    setStudioCopy(copy);
    setActiveTab("studio");
  }, []);

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
              value="faq"
              className="flex items-center gap-1.5 text-xs px-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>FAQ</span>
            </TabsTrigger>
            <TabsTrigger
              value="toolkit"
              className="flex items-center gap-1.5 text-xs px-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Tool Kit", "실행 툴킷")}</span>
              <span className="sm:hidden">{t("Toolkit", "툴킷")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="studio"
              className="flex items-center gap-1.5 text-xs px-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Contents Studio", "컨텐츠 스튜디오")}</span>
              <span className="sm:hidden">{t("Studio", "스튜디오")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="insights" className="mt-0 focus-visible:ring-0">
          <MarketingPanel marketing={marketing} />
        </TabsContent>

        <TabsContent value="faq" className="mt-0 focus-visible:ring-0">
          <FaqPanel
            productName={productName}
            displayName={displayName}
            sentiment={sentiment}
            reviews={reviews}
          />
        </TabsContent>

        <TabsContent value="toolkit" className="mt-0 focus-visible:ring-0">
          <GeoMarketingPanel
            geoMessages={geoMessages}
            productName={productName}
            totalReviews={totalReviews}
            displayName={displayName}
            sentiment={sentiment}
            reviews={reviews}
            onGoToStudio={handleGoToStudio}
          />
          <MarketerToolkit
            productName={productName}
            displayName={displayName}
            sentiment={sentiment}
            reviews={reviews}
          />
        </TabsContent>

        <TabsContent value="studio" className="mt-0 focus-visible:ring-0">
          <ContentStudioPanel
            productName={productName}
            displayName={displayName}
            sentiment={sentiment}
            reviews={reviews}
            marketing={marketing}
            initialCopy={studioCopy}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
