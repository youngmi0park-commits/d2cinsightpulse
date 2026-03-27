
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
      ELSE 'Other'
    END AS country,
    COUNT(*) AS count
  FROM reviews r
  WHERE r.source LIKE 'lge_com_%'
  GROUP BY 1
  ORDER BY count DESC;
$function$;
