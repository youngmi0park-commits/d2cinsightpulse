CREATE OR REPLACE FUNCTION public.get_category_counts_by_country(p_country text DEFAULT 'all')
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  )
  GROUP BY p.category
  ORDER BY count DESC;
$$;