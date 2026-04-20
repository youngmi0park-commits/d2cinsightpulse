CREATE OR REPLACE FUNCTION public.get_channel_country_distribution(p_channel text)
RETURNS TABLE(country text, weekly_count bigint, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH src AS (
    SELECT
      r.source,
      r.collected_at,
      CASE
        WHEN p_channel = 'lgcom' THEN
          CASE
            WHEN r.source ~ '^lge_com_([a-z]{2})$' THEN upper(substring(r.source from '^lge_com_([a-z]{2})$'))
            WHEN r.source = 'lge_com' THEN 'US'
            ELSE 'Other'
          END
        WHEN p_channel = 'reddit' THEN
          CASE
            WHEN r.source ~ '_([a-z]{2})$' AND upper(substring(r.source from '_([a-z]{2})$')) IN
              ('US','UK','CA','DE','FR','AU','BR','MX','JP','SG','MY','TH','PH','ID','VN','TW','HK','IN')
              THEN upper(substring(r.source from '_([a-z]{2})$'))
            ELSE 'US'
          END
        ELSE 'Other'
      END AS country
    FROM public.reviews r
    WHERE
      (p_channel = 'lgcom' AND r.source LIKE 'lge_com%')
      OR (p_channel = 'reddit' AND r.source LIKE 'reddit%')
  )
  SELECT
    country,
    COUNT(*) FILTER (WHERE collected_at >= now() - interval '7 days')::bigint AS weekly_count,
    COUNT(*)::bigint AS total_count
  FROM src
  GROUP BY country
  ORDER BY total_count DESC;
$$;