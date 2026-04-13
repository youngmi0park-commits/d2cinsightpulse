
CREATE OR REPLACE FUNCTION public.get_newsletter_aggregates(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(
  source text,
  product_id uuid,
  sentiment text,
  cnt bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET statement_timeout = '120s'
AS $$
  SELECT r.source, r.product_id, r.sentiment, COUNT(*) as cnt
  FROM reviews r
  WHERE r.collected_at >= p_start
    AND r.collected_at <= p_end
  GROUP BY r.source, r.product_id, r.sentiment
  ORDER BY cnt DESC;
$$;
