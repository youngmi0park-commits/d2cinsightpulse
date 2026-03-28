import { MessageSquare } from "lucide-react";
import { RedditBucketDashboard } from "@/components/RedditBucketDashboard";
import { RedditCountryInsights } from "@/components/RedditCountryInsights";
import { PageHeader } from "@/components/PageHeader";

const RedditPage = () => {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={MessageSquare}
        title="💬 Reddit Intelligence"
        description="Reddit 커뮤니티에서 수집된 실사용자 VOC를 분석합니다. 버킷별 감성 분류, 국가별 언급 트렌드, 주요 토론 키워드를 통해 커뮤니티 인사이트를 확인하세요."
      />
      <RedditBucketDashboard />
      <RedditCountryInsights />
    </div>
  );
};

export default RedditPage;
