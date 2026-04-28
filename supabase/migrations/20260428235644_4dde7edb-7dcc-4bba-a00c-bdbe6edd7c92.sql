ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS has_media boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS multimodal_analysis jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS multimodal_analyzed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_analysis_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_reviews_has_media
  ON public.reviews (has_media)
  WHERE has_media = true;

CREATE INDEX IF NOT EXISTS idx_reviews_media_analysis_status
  ON public.reviews (media_analysis_status)
  WHERE has_media = true AND media_analysis_status IN ('pending','failed');