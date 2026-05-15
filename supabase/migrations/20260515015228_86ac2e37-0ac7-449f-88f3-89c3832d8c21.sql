
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS pros text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cons text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_recommended boolean,
  ADD COLUMN IF NOT EXISTS helpful_votes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secondary_ratings jsonb;
