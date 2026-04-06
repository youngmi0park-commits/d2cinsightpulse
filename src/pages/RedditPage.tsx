import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { RedditBucketDashboard } from "@/components/RedditBucketDashboard";
import { RedditCountryInsights } from "@/components/RedditCountryInsights";
import { RedditVocPostCards } from "@/components/RedditVocPostCards";
import { RedditAiCopyModal } from "@/components/RedditAiCopyModal";
import { RedditCompetitorMentions } from "@/components/RedditCompetitorMentions";
import { RedditWeeklySummary } from "@/components/RedditWeeklySummary";
import { RedditCategoryAnalysis } from "@/components/RedditCategoryAnalysis";
import { PageHeader } from "@/components/PageHeader";
import { CountryFilterBar } from "@/components/CountryFilterBar";

const RedditPage = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={MessageSquare}
        title="💬 Reddit Intelligence"
        description="Reddit 커뮤니티에서 수집된 실사용자 VOC를 분석합니다. 버킷별 감성 분류, VOC 카드, AI 카피 생성, 경쟁사 언급 분석, 국가별 트렌드를 확인하세요."
      />
      <CountryFilterBar selected={selectedCountry} onChange={setSelectedCountry} />
      <RedditWeeklySummary country={selectedCountry} />
      <RedditBucketDashboard country={selectedCountry} />
      <RedditVocPostCards country={selectedCountry} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RedditCategoryAnalysis country={selectedCountry} />
        <RedditCompetitorMentions country={selectedCountry} />
      </div>
      <RedditCountryInsights />
      <RedditAiCopyModal />
    </div>
  );
};

export default RedditPage;
