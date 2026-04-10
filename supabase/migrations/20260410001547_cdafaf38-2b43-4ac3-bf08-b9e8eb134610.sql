
CREATE OR REPLACE FUNCTION public.get_category_counts()
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.category, COUNT(r.id) as count
  FROM reviews r
  JOIN products p ON r.product_id = p.id
  GROUP BY p.category
  ORDER BY count DESC;
$$;
