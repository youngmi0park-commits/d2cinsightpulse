CREATE OR REPLACE FUNCTION public.get_community_country_counts()
RETURNS TABLE(country text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH src AS (
    SELECT
      CASE
        -- Explicit suffix country code (e.g. web_review_jp, youtube_th, amazon_sg)
        WHEN source ~* '_([a-z]{2})$' AND upper(substring(source from '_([a-z]{2})$')) IN
          ('US','UK','CA','DE','FR','AU','BR','MX','JP','SG','MY','TH','PH','ID','VN','TW','HK','IN')
          THEN upper(substring(source from '_([a-z]{2})$'))
        -- Known US-centric channels without suffix
        WHEN source ~ '^(amazon|youtube|bestbuy|walmart|costco|target|consumeraffairs|consumer_reports|bestreviews|houzz|web_review)$'
          THEN 'US'
        WHEN source = 'trusted_reviews' THEN 'UK'
        -- Reddit/lge_com excluded entirely
        WHEN source LIKE 'lge_com%' OR source LIKE 'reddit%' THEN NULL
        ELSE 'Global'
      END AS country
    FROM public.reviews
  )
  SELECT country, COUNT(*)::bigint AS count
  FROM src
  WHERE country IS NOT NULL
  GROUP BY country
  ORDER BY count DESC;
$$;