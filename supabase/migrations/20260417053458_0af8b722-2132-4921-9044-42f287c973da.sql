ALTER TABLE public.newsletter_issues
  ADD COLUMN IF NOT EXISTS lgcom_overview jsonb,
  ADD COLUMN IF NOT EXISTS reddit_overview jsonb;