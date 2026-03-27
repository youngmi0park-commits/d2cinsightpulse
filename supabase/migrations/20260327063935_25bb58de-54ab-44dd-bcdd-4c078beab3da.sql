
CREATE OR REPLACE FUNCTION public.get_lgcom_weekly_top_products(p_region text DEFAULT 'all', p_sentiment text DEFAULT 'positive', p_limit integer DEFAULT 10)
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH weekly_reviews AS (
    SELECT 
      r.product_id,
      CASE 
        WHEN r.source = 'lge_com_us' THEN 'US'
        WHEN r.source = 'lge_com_uk' THEN 'UK'
      END AS region,
      r.sentiment,
      r.sentiment_score,
      r.title
    FROM reviews r
    WHERE r.source IN ('lge_com_us', 'lge_com_uk')
      AND r.collected_at >= (now() - interval '7 days')
      AND (p_region = 'all' OR 
           (p_region = 'US' AND r.source = 'lge_com_us') OR
           (p_region = 'UK' AND r.source = 'lge_com_uk'))
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
