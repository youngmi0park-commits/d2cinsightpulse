-- Remove duplicate trending_snapshots: keep the one with highest mention_count per (product_id, source)
DELETE FROM trending_snapshots
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id, source) id
  FROM trending_snapshots
  ORDER BY product_id, source, mention_count DESC, created_at DESC
);

-- Remove duplicate trending_keywords: keep the one with highest count per (keyword, source)
DELETE FROM trending_keywords
WHERE id NOT IN (
  SELECT DISTINCT ON (keyword, source) id
  FROM trending_keywords
  ORDER BY keyword, source, count DESC, created_at DESC
);

-- Add unique constraints to prevent future duplicates
ALTER TABLE trending_snapshots ADD CONSTRAINT uq_trending_snapshots_product_source UNIQUE (product_id, source, snapshot_date);
ALTER TABLE trending_keywords ADD CONSTRAINT uq_trending_keywords_keyword_source UNIQUE (keyword, source, snapshot_date);