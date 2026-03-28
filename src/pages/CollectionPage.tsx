import { CollectionCriteria } from "@/components/CollectionCriteria";
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";

const CollectionPage = () => {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <CollectionCriteria />
      <NewsletterSubscribe />
    </div>
  );
};

export default CollectionPage;
