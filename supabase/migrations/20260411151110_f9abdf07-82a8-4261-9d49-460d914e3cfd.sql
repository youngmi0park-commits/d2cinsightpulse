
CREATE OR REPLACE FUNCTION public.get_bv_priority_products(
  p_locale text,
  p_limit integer DEFAULT 25
)
RETURNS SETOF public.bv_collection_progress
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM bv_collection_progress
  WHERE locale = p_locale
    AND is_complete = false
  ORDER BY
    CASE
      WHEN lower(category) ~* '(refriger|fridge|freezer)' THEN 1
      WHEN lower(category) ~* '(wash|laundry)' THEN 1
      WHEN lower(category) ~* '(dryer|dry)' THEN 1
      WHEN lower(category) ~* '(dishwash|quadwash)' THEN 2
      WHEN lower(category) ~* '(vacuum|cordzero)' THEN 2
      WHEN lower(category) ~* '(air.?condition|artcool|hvac)' THEN 2
      WHEN lower(category) ~* '(air.?purif|puricare)' THEN 2
      WHEN lower(category) ~* '(range|oven|microwave|cook)' THEN 3
      WHEN lower(category) ~* '(tv|television|oled|qned|nano|uhd|monitor|soundbar|stanby)' THEN 5
      ELSE 4
    END ASC,
    total_available DESC
  LIMIT p_limit;
$$;
