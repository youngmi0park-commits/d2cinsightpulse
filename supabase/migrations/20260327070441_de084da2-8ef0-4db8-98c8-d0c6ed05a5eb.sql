
CREATE OR REPLACE FUNCTION public.get_source_counts()
 RETURNS TABLE(source text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN r.source LIKE 'reddit%' THEN 'reddit'
      WHEN r.source LIKE 'youtube%' THEN 'youtube'
      WHEN r.source LIKE 'lge_com%' THEN 'lge_com'
      ELSE r.source
    END AS source,
    COUNT(*) AS count
  FROM reviews r
  GROUP BY 1
  ORDER BY count DESC;
$function$;
