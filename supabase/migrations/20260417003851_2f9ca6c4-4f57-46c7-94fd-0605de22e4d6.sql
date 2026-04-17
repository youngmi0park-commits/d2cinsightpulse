-- Cumulative top products (no 7-day filter) for LG.com cumulative reports
CREATE OR REPLACE FUNCTION public.get_lgcom_cumulative_top_products(
  p_region text DEFAULT 'all'::text,
  p_sentiment text DEFAULT 'positive'::text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  product_id uuid,
  model_number text,
  display_name text,
  category text,
  region text,
  review_count bigint,
  avg_score numeric,
  keywords text[]
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH all_reviews AS (
    SELECT 
      r.product_id,
      CASE 
        WHEN r.source = 'lge_com_us' THEN 'US'
        WHEN r.source = 'lge_com_uk' THEN 'UK'
        WHEN r.source = 'lge_com_de' THEN 'DE'
        WHEN r.source = 'lge_com_au' THEN 'AU'
        WHEN r.source = 'lge_com_in' THEN 'IN'
        WHEN r.source = 'lge_com_tw' THEN 'TW'
        WHEN r.source = 'lge_com_jp' THEN 'JP'
        WHEN r.source = 'lge_com_th' THEN 'TH'
        WHEN r.source = 'lge_com_br' THEN 'BR'
      END AS region,
      r.sentiment,
      r.sentiment_score,
      r.title
    FROM reviews r
    WHERE r.source LIKE 'lge_com_%'
      AND (p_region = 'all' OR r.source = 'lge_com_' || lower(p_region))
      AND r.sentiment = p_sentiment
  ),
  product_agg AS (
    SELECT
      ar.product_id,
      ar.region,
      COUNT(*) AS review_count,
      ROUND(AVG(ar.sentiment_score) * 100, 1) AS avg_score,
      array_agg(DISTINCT ar.title) FILTER (WHERE ar.title IS NOT NULL AND ar.title != '') AS raw_keywords
    FROM all_reviews ar
    GROUP BY ar.product_id, ar.region
    ORDER BY COUNT(*) DESC, AVG(ar.sentiment_score) DESC
    LIMIT p_limit
  )
  SELECT
    pa.product_id,
    p.model_number,
    p.display_name,
    p.category,
    pa.region,
    pa.review_count,
    pa.avg_score,
    COALESCE(pa.raw_keywords[1:5], ARRAY[]::text[]) AS keywords
  FROM product_agg pa
  JOIN products p ON p.id = pa.product_id
  WHERE p.is_active = true
  ORDER BY pa.review_count DESC, pa.avg_score DESC;
$function$;