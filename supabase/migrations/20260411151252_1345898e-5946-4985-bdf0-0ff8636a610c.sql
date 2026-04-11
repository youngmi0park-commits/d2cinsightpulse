
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
      -- Check TV/Audio FIRST to exclude them early
      WHEN lower(product_name) ~* '(^oled|qned|nano[0-9]|stanby|soundbar|^sp[0-9]|^s[a-z][0-9]|^[0-9]+ur|^[0-9]+uq|^[0-9]+nano|^[0-9]+qned)'
        THEN 5
      WHEN lower(coalesce(category,'')) ~* '(tv|television|soundbar|monitor|audio|video|computing)'
        THEN 5
      -- Priority 1: Refrigerators
      WHEN lower(product_name) ~* '(^lrfx|^lrgl|^lrmv|^lrfg|^lryks|^lrykc|^lryxc|^lf[0-9]|^gr[a-z]|^gm[a-z]|^gc[a-z]|instaview|french.?door|refriger)'
        THEN 1
      -- Priority 1: Washers
      WHEN lower(product_name) ~* '(^wm[0-9]|^wt[0-9]|^f[0-9]+[a-z]|^fv[0-9]|washtower|wash)'
        THEN 1
      -- Priority 1: Dryers
      WHEN lower(product_name) ~* '(^dl[a-z]x|^dlgx|^dlex|^rd[0-9]|dryer)'
        THEN 1
      -- Priority 2: Dishwasher
      WHEN lower(product_name) ~* '(^ldp|^ldfn|^df[a-z]|dishwash|quadwash)'
        THEN 2
      -- Priority 2: Vacuum
      WHEN lower(product_name) ~* '(^a9[a-z]|cordzero|vacuum|^a[0-9]+[a-z])'
        THEN 2
      -- Priority 2: AC / Air Purifier
      WHEN lower(product_name) ~* '(artcool|dual.?cool|^s[0-9]+q|puricare|^as[0-9]|air.?condition|air.?purif)'
        THEN 2
      -- Priority 3: Kitchen
      WHEN lower(product_name) ~* '(^lse|^lde|^lre|range|oven|microwave|^lmc|^mvel)'
        THEN 3
      ELSE 4
    END ASC,
    total_available DESC
  LIMIT p_limit;
$$;
