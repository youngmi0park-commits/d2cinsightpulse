
-- BV collection progress tracking table
CREATE TABLE IF NOT EXISTS public.bv_collection_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale          text NOT NULL,
  product_id      text NOT NULL,
  product_name    text,
  category        text,
  total_available integer DEFAULT 0,
  total_collected integer DEFAULT 0,
  last_offset     integer DEFAULT 0,
  is_complete     boolean DEFAULT false,
  last_run_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(locale, product_id)
);

-- BV collection batch run logs
CREATE TABLE IF NOT EXISTS public.bv_collection_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type          text NOT NULL,
  locale            text NOT NULL,
  status            text DEFAULT 'running',
  products_queued   integer DEFAULT 0,
  products_done     integer DEFAULT 0,
  reviews_fetched   integer DEFAULT 0,
  reviews_inserted  integer DEFAULT 0,
  reviews_skipped   integer DEFAULT 0,
  error_count       integer DEFAULT 0,
  started_at        timestamptz DEFAULT now(),
  completed_at      timestamptz
);

-- RLS
ALTER TABLE public.bv_collection_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bv_collection_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_bv_progress" ON public.bv_collection_progress FOR SELECT USING (true);
CREATE POLICY "public_read_bv_runs" ON public.bv_collection_runs FOR SELECT USING (true);

-- Collection summary view
CREATE OR REPLACE VIEW public.bv_collection_summary AS
SELECT
  locale,
  count(DISTINCT product_id) AS products_tracked,
  sum(total_available) AS total_available,
  sum(total_collected) AS total_collected,
  round(sum(total_collected)::numeric / nullif(sum(total_available),0) * 100, 1) AS collection_rate_pct,
  count(*) FILTER (WHERE is_complete = true) AS products_complete,
  count(*) FILTER (WHERE is_complete = false) AS products_pending,
  max(last_run_at) AS last_run_at
FROM public.bv_collection_progress
GROUP BY locale;
