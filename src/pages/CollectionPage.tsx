import { BarChart3 } from "lucide-react";
import { CollectionCriteria } from "@/components/CollectionCriteria";
import { PageHeader } from "@/components/PageHeader";
const CollectionPage = () => {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={BarChart3}
        title="⚙️ Collection Overview"
        description="실사용자 리뷰 기반 감성 분석 및 마케팅 인사이트를 제공하는 수집 파이프라인입니다. LG.com · Reddit · Amazon · YouTube · Consumer Reports 등 43개+ 채널에서 15개국의 리뷰를 자동 수집하며, 수집 주기·대상 채널·최근 실행 로그를 이 화면에서 확인하고 모니터링할 수 있습니다."
      />
      <CollectionCriteria />
    </div>
  );
};

export default CollectionPage;
