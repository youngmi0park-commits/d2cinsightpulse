import { GeoMarketingPanel } from "@/components/GeoMarketingPanel";
import { MarketerToolkit } from "@/components/MarketerToolkit";
import { MarketingPanel } from "@/components/MarketingPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/contexts/LanguageContext";
import { Globe, Rocket, Star } from "lucide-react";
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

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden">
      <Tabs defaultValue="channel-copy" className="w-full">
        <div className="px-5 pt-5 pb-0">
          <TabsList className="w-full h-auto p-1 bg-secondary/50 grid grid-cols-3 gap-1">
            <TabsTrigger
              value="channel-copy"
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Channel Marketing Copy", "채널별 마케팅 카피")}</span>
              <span className="sm:hidden">{t("Copy", "카피")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="toolkit"
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Marketer's Toolkit", "마케터 실행 툴킷")}</span>
              <span className="sm:hidden">{t("Toolkit", "툴킷")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="highlights"
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Star className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("Review Highlights", "리뷰 하이라이트")}</span>
              <span className="sm:hidden">{t("Highlights", "하이라이트")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="channel-copy" className="mt-0 focus-visible:ring-0">
          <GeoMarketingPanel
            geoMessages={geoMessages}
            productName={productName}
            totalReviews={totalReviews}
          />
        </TabsContent>

        <TabsContent value="toolkit" className="mt-0 focus-visible:ring-0">
          <MarketerToolkit
            productName={productName}
            displayName={displayName}
            sentiment={sentiment}
            reviews={reviews}
          />
        </TabsContent>

        <TabsContent value="highlights" className="mt-0 focus-visible:ring-0">
          <MarketingPanel marketing={marketing} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
