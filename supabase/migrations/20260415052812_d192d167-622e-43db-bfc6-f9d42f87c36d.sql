
-- 1) Replace get_lgcom_weekly_top_products to support all 8 BV countries + weekly filter on published_at
CREATE OR REPLACE FUNCTION public.get_lgcom_weekly_top_products(
  p_region text DEFAULT 'all',
  p_sentiment text DEFAULT 'positive',
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
LANGUAGE sql STABLE
AS $$
  WITH weekly_reviews AS (
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
      END AS region,
      r.sentiment,
      r.sentiment_score,
      r.title
    FROM reviews r
    WHERE r.source LIKE 'lge_com_%'
      AND r.published_at >= (now() - interval '7 days')
      AND (p_region = 'all' OR r.source = 'lge_com_' || lower(p_region))
      AND r.sentiment = p_sentiment
  ),
  product_agg AS (
    SELECT
      wr.product_id,
      wr.region,
      COUNT(*) AS review_count,
      ROUND(AVG(wr.sentiment_score) * 100, 1) AS avg_score,
      array_agg(DISTINCT wr.title) FILTER (WHERE wr.title IS NOT NULL AND wr.title != '') AS raw_keywords
    FROM weekly_reviews wr
    GROUP BY wr.product_id, wr.region
    ORDER BY COUNT(*) DESC, AVG(wr.sentiment_score) DESC
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
$$;

-- 2) Create get_weekly_category_counts_by_country for weekly pill counts
CREATE OR REPLACE FUNCTION public.get_weekly_category_counts_by_country(
  p_country text DEFAULT 'all'
)
RETURNS TABLE(category text, count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT p.category, COUNT(r.id) as count
  FROM reviews r
  JOIN products p ON r.product_id = p.id
  WHERE r.source LIKE 'lge_com_%'
    AND r.published_at >= (now() - interval '7 days')
    AND (
      p_country = 'all'
      OR r.source = 'lge_com_' || lower(p_country)
    )
  GROUP BY p.category
  ORDER BY count DESC;
$$;
