import { RedditBucketDashboard } from "@/components/RedditBucketDashboard";
import { RedditCountryInsights } from "@/components/RedditCountryInsights";

const RedditPage = () => {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <RedditBucketDashboard />
        <RedditCountryInsights />
      </div>
    </div>
  );
};

export default RedditPage;
