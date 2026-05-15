
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
      WHEN r.source = 'lge_com_es' THEN 'ES'
      WHEN r.source = 'lge_com_mx' THEN 'MX'
      WHEN r.source = 'lge_com_pe' THEN 'PE'
      WHEN r.source = 'lge_com_sa' THEN 'SA'
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
    OR (p_country = 'ES' AND r.source = 'lge_com_es')
    OR (p_country = 'MX' AND r.source = 'lge_com_mx')
    OR (p_country = 'PE' AND r.source = 'lge_com_pe')
    OR (p_country = 'SA' AND r.source = 'lge_com_sa')
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
      WHEN r.source = 'lge_com_us' OR r.source LIKE 'reddit%' OR r.source = 'youtube' OR r.source = 'youtube_LGUSAChannel' OR r.source = 'amazon' OR r.source = 'lge_com' OR r.source = 'web_review' OR r.source IN ('bestreviews','consumeraffairs','consumer_reports','bestbuy','walmart','costco','target','rtings','houzz') THEN 'US'
      WHEN r.source = 'lge_com_uk' OR r.source = 'trusted_reviews' OR r.source LIKE '%_uk' THEN 'UK'
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
      WHEN r.source LIKE '%_es' THEN 'ES'
      WHEN r.source LIKE '%_au' THEN 'AU'
      WHEN r.source LIKE '%_ca' THEN 'CA'
      WHEN r.source LIKE '%_br' THEN 'BR'
      WHEN r.source LIKE '%_mx' THEN 'MX'
      WHEN r.source LIKE '%_pe' THEN 'PE'
      WHEN r.source LIKE '%_sa' THEN 'SA'
      WHEN r.source IN ('trustpilot','reviews_io','complaintsboard','pcmag','techradar','soundguys','cnet','notebookcheck','lemon8') THEN 'Global'
      ELSE 'Other'
    END AS country,
    COUNT(*) AS count
  FROM reviews r
  GROUP BY 1
  HAVING COUNT(*) > 0
  ORDER BY count DESC;
$function$;
