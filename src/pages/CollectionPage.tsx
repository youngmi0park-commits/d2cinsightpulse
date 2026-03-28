import { BarChart3 } from "lucide-react";
import { CollectionCriteria } from "@/components/CollectionCriteria";
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
import { PageHeader } from "@/components/PageHeader";

const CollectionPage = () => {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={BarChart3}
        title="⚙️ Collection Overview"
        description="데이터 수집 파이프라인의 실행 현황과 소스별 수집 기준을 관리합니다. 수집 주기, 대상 채널, 최근 수집 로그를 확인하고 모니터링하세요."
      />
      <CollectionCriteria />
    </div>
  );
};

export default CollectionPage;
