CREATE OR REPLACE FUNCTION public.get_bv_priority_products(p_locale text, p_limit integer DEFAULT 25)
 RETURNS SETOF bv_collection_progress
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH recency AS (
    SELECT r.product_id, MIN(r.published_at) AS first_seen
    FROM reviews r
    WHERE r.source LIKE 'lge_com_%'
    GROUP BY r.product_id
  )
  SELECT bcp.*
  FROM bv_collection_progress bcp
  LEFT JOIN products p ON p.model_number = bcp.product_id
  LEFT JOIN recency rec ON rec.product_id = p.id
  WHERE bcp.locale = p_locale
    AND bcp.is_complete = false
    AND (rec.first_seen IS NULL OR rec.first_seen >= (now() - interval '3 years'))
  ORDER BY
    CASE
      WHEN lower(bcp.product_name) ~* '(^oled|qned|nano[0-9]|stanby|soundbar|^sp[0-9]|^s[a-z][0-9]|^[0-9]+ur|^[0-9]+uq|^[0-9]+nano|^[0-9]+qned)'
        THEN 5
      WHEN lower(coalesce(bcp.category,'')) ~* '(tv|television|soundbar|monitor|audio|video|computing)'
        THEN 5
      WHEN lower(bcp.product_name) ~* '(^lrfx|^lrgl|^lrmv|^lrfg|^lryks|^lrykc|^lryxc|^lf[0-9]|^gr[a-z]|^gm[a-z]|^gc[a-z]|instaview|french.?door|refriger)'
        THEN 1
      WHEN lower(bcp.product_name) ~* '(^wm[0-9]|^wt[0-9]|^f[0-9]+[a-z]|^fv[0-9]|washtower|wash)'
        THEN 1
      WHEN lower(bcp.product_name) ~* '(^dl[a-z]x|^dlgx|^dlex|^rd[0-9]|dryer)'
        THEN 1
      WHEN lower(bcp.product_name) ~* '(^ldp|^ldfn|^df[a-z]|dishwash|quadwash)'
        THEN 2
      WHEN lower(bcp.product_name) ~* '(^a9[a-z]|cordzero|vacuum|^a[0-9]+[a-z])'
        THEN 2
      WHEN lower(bcp.product_name) ~* '(artcool|dual.?cool|^s[0-9]+q|puricare|^as[0-9]|air.?condition|air.?purif)'
        THEN 2
      WHEN lower(bcp.product_name) ~* '(^lse|^lde|^lre|range|oven|microwave|^lmc|^mvel)'
        THEN 3
      ELSE 4
    END ASC,
    bcp.total_available DESC
  LIMIT p_limit;
$function$;