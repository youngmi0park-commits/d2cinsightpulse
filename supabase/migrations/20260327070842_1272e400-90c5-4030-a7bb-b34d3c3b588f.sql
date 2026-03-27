
CREATE OR REPLACE FUNCTION public.get_lgcom_keywords(p_region text DEFAULT 'all'::text, p_limit integer DEFAULT 20)
 RETURNS TABLE(keyword text, count bigint, sentiment text, region text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH review_titles AS (
    SELECT 
      r.title,
      r.sentiment,
      CASE 
        WHEN r.source = 'lge_com_us' THEN 'US'
        WHEN r.source = 'lge_com_uk' THEN 'UK'
      END AS region
    FROM reviews r
    WHERE r.source IN ('lge_com_us', 'lge_com_uk')
      AND r.title IS NOT NULL AND r.title != ''
      AND r.sentiment IN ('positive', 'negative')
      AND (p_region = 'all' OR 
           (p_region = 'US' AND r.source = 'lge_com_us') OR
           (p_region = 'UK' AND r.source = 'lge_com_uk'))
      AND r.collected_at >= (now() - interval '30 days')
  )
  SELECT
    rt.title AS keyword,
    COUNT(*) AS count,
    rt.sentiment,
    rt.region
  FROM review_titles rt
  GROUP BY rt.title, rt.sentiment, rt.region
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
$function$;
