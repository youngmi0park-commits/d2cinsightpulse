CREATE OR REPLACE FUNCTION public.get_country_counts()
 RETURNS TABLE(country text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
$$;