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
import { searchProducts, type ProductData } from "@/data/dummyData";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment";
import { generateMarketingMessage, generateGeoMarketingMessages, type MarketingOutput, type GeoMessage } from "@/lib/formatMessage";
import heroBanner from "@/assets/hero-banner.jpg";
import { Activity, BarChart3, Zap } from "lucide-react";

const Index = () => {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [marketing, setMarketing] = useState<MarketingOutput | null>(null);
  const [geoMessages, setGeoMessages] = useState<GeoMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));

    const result = searchProducts(query);
    if (!result) {
      setError(`"${query}"에 대한 데이터를 찾을 수 없습니다. 제품명 추천 버튼을 사용해 보세요.`);
      setProduct(null);
      setSentiment(null);
      setMarketing(null);
      setIsLoading(false);
      return;
    }

    const sentimentResult = analyzeSentiment(result.reviews);
    const marketingResult = generateMarketingMessage(result.name, sentimentResult);
    const geoResult = generateGeoMarketingMessages(result.name, sentimentResult);

    setProduct(result);
    setSentiment(sentimentResult);
    setMarketing(marketingResult);
    setGeoMessages(geoResult);
    setIsLoading(false);
  };

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
      {!product && !error && (
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

          {/* Collection Criteria & Country Insights */}
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
      {product && sentiment && marketing && (
        <div className="container mx-auto px-4 py-8 space-y-6 animate-slide-up">
          <h2 className="text-2xl font-bold font-heading">
            📊 <span className="text-gradient">{product.name}</span> 분석 결과
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SentimentChart sentiment={sentiment} />
            <KeywordCloud keywords={sentiment.keywords} />
          </div>

          <MarketingPanel marketing={marketing} />
          <GeoMarketingPanel geoMessages={geoMessages} productName={product.name} />
          <ReviewList reviews={product.reviews} />
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>LG 제품 감성 모니터 — 더미 데이터 기반 데모 · 추후 실시간 API 연동 예정</p>
      </footer>
    </div>
  );
};

export default Index;
