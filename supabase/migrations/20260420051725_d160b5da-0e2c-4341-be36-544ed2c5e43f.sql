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
      WHEN r.source LIKE '%_au' THEN 'AU'
      WHEN r.source LIKE '%_ca' THEN 'CA'
      WHEN r.source LIKE '%_br' THEN 'BR'
      WHEN r.source LIKE '%_mx' THEN 'MX'
      WHEN r.source IN ('trustpilot','reviews_io','complaintsboard','pcmag','techradar','soundguys','cnet','notebookcheck','lemon8') THEN 'Global'
      ELSE 'Other'
    END AS country,
    COUNT(*) AS count
  FROM reviews r
  GROUP BY 1
  HAVING COUNT(*) > 0
  ORDER BY count DESC;
$function$;