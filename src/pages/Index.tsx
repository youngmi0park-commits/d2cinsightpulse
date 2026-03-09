import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SentimentChart } from "@/components/SentimentChart";
import { ReviewList } from "@/components/ReviewList";
import { MarketingPanel } from "@/components/MarketingPanel";
import { GeoMarketingPanel } from "@/components/GeoMarketingPanel";
import { KeywordCloud } from "@/components/KeywordCloud";
import { CollectionCriteria } from "@/components/CollectionCriteria";
import { RedditCountryInsights } from "@/components/RedditCountryInsights";
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
import { searchProducts, searchProductsMulti, type ProductData } from "@/data/dummyData";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages, type MarketingOutput, type GeoMessage } from "@/lib/formatMessage";
import heroBanner from "@/assets/hero-banner.jpg";
import { Activity, BarChart3, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface AnalyzedProduct {
  product: ProductData;
  sentiment: SentimentResult;
  marketing: MarketingOutput;
  geoMessages: GeoMessage[];
}

const Index = () => {
  const [results, setResults] = useState<AnalyzedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery(query);

    await new Promise((r) => setTimeout(r, 800));

    const multiResults = searchProductsMulti(query);
    if (multiResults.length === 0) {
      setError(`"${query}"에 대한 데이터를 찾을 수 없습니다. 제품명 추천 버튼을 사용해 보세요.`);
      setResults([]);
      setIsLoading(false);
      return;
    }

    const analyzed = multiResults.map((product) => {
      const sentiment = analyzeSentiment(product.reviews);
      const marketing = generateMarketingMessage(product.name, sentiment);
      const geoMessages = generateGeoMarketingMessages(product.name, sentiment);
      return { product, sentiment, marketing, geoMessages };
    });

    setResults(analyzed);
    setIsLoading(false);
  };

  const hasResults = results.length > 0;
  const isMulti = results.length > 1;

  // Group results by category
  const groupedResults = results.reduce<Record<string, AnalyzedProduct[]>>((acc, item) => {
    const cat = item.product.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden gradient-hero">
        <img
          src={heroBanner}
          alt="Dashboard visualization"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-lighten"
        />
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Activity className="h-8 w-8 text-primary animate-pulse-glow" />
              <h1 className="text-4xl md:text-5xl font-bold font-heading">
                <span className="text-gradient">고객 보이스 리스닝</span>
              </h1>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Reddit · Amazon 등 주요 커뮤니티의 실사용자 리뷰를 수집·분석하여,<br className="hidden md:inline" />
              마케팅 커뮤니케이션에 활용 가능한 메시지를 기획·제공하는 플랫폼입니다.
            </p>
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </div>

      {/* Stats Bar */}
      {!hasResults && !error && (
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: "감성 분석", desc: "긍정·부정·중립 자동 분류 및 점수화" },
              { icon: Zap, title: "키워드 추출", desc: "장점·단점 핵심 키워드 자동 추출" },
              { icon: Activity, title: "마케팅 변환", desc: "Q&A 및 리뷰 가이드 자동 생성" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="gradient-card rounded-xl border border-border p-6 text-center hover:border-primary/30 transition-colors">
                <Icon className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold font-heading mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <CollectionCriteria />
            <RedditCountryInsights />
            <NewsletterSubscribe />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="container mx-auto px-4 py-8">
          <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="container mx-auto px-4 py-8 space-y-6 animate-slide-up">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold font-heading">
              📊 <span className="text-gradient">"{searchQuery}"</span> 검색 결과
            </h2>
            <Badge variant="secondary" className="text-sm">
              {results.length}개 제품
            </Badge>
          </div>

          {isMulti ? (
            /* Multi-product: category tabs */
            <Tabs defaultValue={results[0].product.name} className="w-full">
              {/* Category grouped tab list */}
              <div className="space-y-3 mb-6">
                {Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category} className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
                      {category}
                    </Badge>
                    <TabsList className="h-auto p-1 bg-secondary/50">
                      {items.map((item) => (
                        <TabsTrigger
                          key={item.product.name}
                          value={item.product.name}
                          className="text-xs sm:text-sm px-3 py-1.5"
                        >
                          <span className="font-mono">{item.product.name}</span>
                          <span className="hidden sm:inline ml-2 text-muted-foreground text-xs">
                            {item.product.displayName}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                ))}
              </div>

              {results.map((item) => (
                <TabsContent key={item.product.name} value={item.product.name} className="space-y-6">
                  <ProductAnalysisView item={item} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            /* Single product result */
            <ProductAnalysisView item={results[0]} />
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>LG 제품 감성 모니터 — 더미 데이터 기반 데모 · 추후 실시간 API 연동 예정</p>
      </footer>
    </div>
  );
};

function ProductAnalysisView({ item }: { item: AnalyzedProduct }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
          {item.product.category}
        </Badge>
        <h3 className="text-xl font-bold font-heading">
          <span className="font-mono">{item.product.name}</span>
          <span className="text-muted-foreground text-base font-normal ml-2">
            {item.product.displayName}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentChart sentiment={item.sentiment} />
        <KeywordCloud keywords={item.sentiment.keywords} />
      </div>

      <MarketingPanel marketing={item.marketing} />
      <GeoMarketingPanel geoMessages={item.geoMessages} productName={item.product.name} />
      <ReviewList reviews={item.product.reviews} />
    </>
  );
}

export default Index;
