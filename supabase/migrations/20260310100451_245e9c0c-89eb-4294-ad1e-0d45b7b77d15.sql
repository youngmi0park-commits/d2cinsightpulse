
-- Products table: LG제품 마스터 데이터
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_number TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews table: 각 채널에서 수집된 리뷰 원문
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL, -- 'reddit', 'amazon', 'rtings', etc.
  external_id TEXT, -- source 내 고유 ID (중복 방지)
  author TEXT,
  title TEXT,
  content TEXT NOT NULL,
  rating SMALLINT,
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  sentiment_score NUMERIC(4,2),
  source_url TEXT,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);

-- Trending snapshots: 일별 트렌딩 스냅샷
CREATE TABLE public.trending_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 0,
  avg_sentiment_score NUMERIC(4,2),
  trend TEXT DEFAULT 'stable', -- 'up', 'down', 'stable'
  change_percent NUMERIC(5,2) DEFAULT 0,
  rank SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, source, product_id)
);

-- Keywords: 감성 키워드 집계
CREATE TABLE public.trending_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  keyword TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  sentiment TEXT NOT NULL, -- 'positive', 'negative'
  change_percent NUMERIC(5,2) DEFAULT 0,
  related_products TEXT[], -- product display names
  related_countries TEXT[], -- e.g., '🇺🇸 LGEUS'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, source, keyword)
);

-- Collection logs: 수집 작업 추적
CREATE TABLE public.collection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'success', 'error'
  items_collected INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_reviews_source ON public.reviews(source);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_collected_at ON public.reviews(collected_at);
CREATE INDEX idx_trending_snapshots_date ON public.trending_snapshots(snapshot_date);
CREATE INDEX idx_trending_keywords_date ON public.trending_keywords(snapshot_date);
CREATE INDEX idx_collection_logs_source ON public.collection_logs(source);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies (dashboard is public-facing)
CREATE POLICY "Allow public read on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public read on reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public read on trending_snapshots" ON public.trending_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow public read on trending_keywords" ON public.trending_keywords FOR SELECT USING (true);
CREATE POLICY "Allow public read on collection_logs" ON public.collection_logs FOR SELECT USING (true);

-- Service role insert/update policies (edge functions use service role)
CREATE POLICY "Service role can insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Service role can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert trending_snapshots" ON public.trending_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update trending_snapshots" ON public.trending_snapshots FOR UPDATE USING (true);
CREATE POLICY "Service role can insert trending_keywords" ON public.trending_keywords FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert collection_logs" ON public.collection_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update collection_logs" ON public.collection_logs FOR UPDATE USING (true);

-- Enable realtime for trending data
ALTER PUBLICATION supabase_realtime ADD TABLE public.trending_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trending_keywords;
