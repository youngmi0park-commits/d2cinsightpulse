
CREATE OR REPLACE FUNCTION public.get_lgcom_country_counts()
 RETURNS TABLE(country text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN r.source = 'lge_com_us' THEN 'US'
      WHEN r.source = 'lge_com_uk' THEN 'UK'
      WHEN r.source = 'lge_com_in' THEN 'IN'
      WHEN r.source = 'lge_com_tw' THEN 'TW'
      WHEN r.source = 'lge_com_jp' THEN 'JP'
      WHEN r.source = 'lge_com_th' THEN 'TH'
      WHEN r.source = 'lge_com_de' THEN 'DE'
      WHEN r.source = 'lge_com_au' THEN 'AU'
      WHEN r.source = 'lge_com_br' THEN 'BR'
      ELSE 'Other'
    END AS country,
    COUNT(*) AS count
  FROM reviews r
  WHERE r.source LIKE 'lge_com_%'
  GROUP BY 1
  ORDER BY count DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_category_counts_by_country(p_country text DEFAULT 'all'::text)
 RETURNS TABLE(category text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.category, COUNT(r.id) as count
  FROM reviews r
  JOIN products p ON r.product_id = p.id
  WHERE (
    p_country = 'all'
    OR (p_country = 'US' AND r.source = 'lge_com_us')
    OR (p_country = 'UK' AND r.source = 'lge_com_uk')
    OR (p_country = 'DE' AND r.source = 'lge_com_de')
    OR (p_country = 'AU' AND r.source = 'lge_com_au')
    OR (p_country = 'IN' AND r.source = 'lge_com_in')
    OR (p_country = 'TW' AND r.source = 'lge_com_tw')
    OR (p_country = 'JP' AND r.source = 'lge_com_jp')
    OR (p_country = 'TH' AND r.source = 'lge_com_th')
    OR (p_country = 'BR' AND r.source = 'lge_com_br')
  )
  GROUP BY p.category
  ORDER BY count DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_category_counts_by_country(p_country text DEFAULT 'all'::text)
 RETURNS TABLE(category text, count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_country_counts()
 RETURNS TABLE(country text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN r.source LIKE '%_us' OR r.source = 'reddit' OR r.source IN ('bestreviews','consumeraffairs','consumer_reports','bestbuy','walmart','costco','target') THEN 'US'
      WHEN r.source LIKE '%_uk' OR r.source = 'trusted_reviews' THEN 'UK'
      WHEN r.source LIKE '%_jp' THEN 'JP'
      WHEN r.source LIKE '%_sg' THEN 'SG'
      WHEN r.source LIKE '%_my' THEN 'MY'
      WHEN r.source LIKE '%_id' THEN 'ID'
      WHEN r.source LIKE '%_th' THEN 'TH'
      WHEN r.source LIKE '%_ph' THEN 'PH'
      WHEN r.source LIKE '%_vn' THEN 'VN'
      WHEN r.source LIKE '%_tw' THEN 'TW'
      WHEN r.source LIKE '%_hk' THEN 'HK'
      WHEN r.source LIKE '%_in' THEN 'IN'
      WHEN r.source LIKE '%_de' THEN 'DE'
      WHEN r.source LIKE '%_fr' THEN 'FR'
      WHEN r.source LIKE '%_au' THEN 'AU'
      WHEN r.source LIKE '%_ca' THEN 'CA'
      WHEN r.source LIKE '%_br' THEN 'BR'
      WHEN r.source LIKE '%_mx' THEN 'MX'
      WHEN r.source IN ('trustpilot','reviews_io','complaintsboard','pcmag','rtings','techradar','soundguys','cnet','notebookcheck','houzz','lemon8') THEN 'Global'
      ELSE 'Other'
    END AS country,
    COUNT(*) AS count
  FROM reviews r
  GROUP BY 1
  HAVING COUNT(*) > 0
  ORDER BY count DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_lgcom_weekly_top_products(p_region text DEFAULT 'all'::text, p_sentiment text DEFAULT 'positive'::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(product_id uuid, model_number text, display_name text, category text, region text, review_count bigint, avg_score numeric, keywords text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
        WHEN r.source = 'lge_com_br' THEN 'BR'
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
$function$;
