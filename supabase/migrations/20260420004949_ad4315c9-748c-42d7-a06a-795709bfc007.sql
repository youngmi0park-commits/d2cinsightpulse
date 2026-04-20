CREATE OR REPLACE FUNCTION public.get_recent_source_counts(p_hours integer DEFAULT 24)
RETURNS TABLE(source text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.source, COUNT(*)::bigint AS count
  FROM reviews r
  WHERE r.collected_at >= (now() - make_interval(hours => p_hours))
  GROUP BY r.source
  ORDER BY count DESC;
$$;