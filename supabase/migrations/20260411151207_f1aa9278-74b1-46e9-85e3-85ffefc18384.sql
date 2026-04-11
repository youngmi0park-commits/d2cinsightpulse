
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
      -- Priority 1: Refrigerators, Washers, Dryers
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(refriger|fridge|freezer|instaview|french.?door|side.?by|GR[A-Z]|LR[A-Z]|LRFX|LRMV|LRGL)' THEN 1
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(wash|laundry|washtower|front.?load|top.?load|WM\d|WT\d|F[0-9]+[A-Z])' THEN 1
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(dryer|DL[A-Z]|DLGX|DLEX|dry)' THEN 1
      -- Priority 2: Dishwasher, Vacuum, AC, Air Purifier
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(dishwash|quadwash|LDP\d|LDFN|DF[A-Z])' THEN 2
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(vacuum|cordzero|A9[A-Z]|CordZero)' THEN 2
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(air.?condition|artcool|hvac|dual.?cool|AC\d|S[0-9]+Q)' THEN 2
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(purif|puricare|aero.?furn|AS[0-9])' THEN 2
      -- Priority 3: Kitchen
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(range|oven|microwave|cook|stove|LR[A-Z]E|LSE|LDE)' THEN 3
      -- Priority 5: TV/Monitor/Audio (lowest)
      WHEN lower(coalesce(product_name,'') || ' ' || coalesce(category,''))
        ~* '(oled|qned|nano|uhd|tv|television|monitor|soundbar|stanby|myview|dualup|SP[0-9]|S[A-Z][0-9]+[A-Z]|OLED\d|[0-9]+UR|[0-9]+UQ|[0-9]+NANO)' THEN 5
      ELSE 4
    END ASC,
    total_available DESC
  LIMIT p_limit;
$$;
