CREATE TABLE public.crawling_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  query TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 초기 예시 데이터 삽입
INSERT INTO public.crawling_keywords (category, query)
VALUES ('Laptop', 'site:reddit.com "LG Gram Pro 2025" review OR issue');

-- RLS (Row Level Security) 설정: 대시보드나 외부에서 읽기 가능하도록
ALTER TABLE public.crawling_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.crawling_keywords FOR SELECT USING (true);
