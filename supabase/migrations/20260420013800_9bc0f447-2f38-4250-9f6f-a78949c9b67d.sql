-- 1. Reddit source 정규화: reddit_r/lgoled → reddit_lgoled 로 병합
UPDATE reviews
SET source = 'reddit_' || regexp_replace(
  substring(source FROM 'reddit_r/(.+)'),
  '[^a-z0-9_]', '', 'gi'
)
WHERE source LIKE 'reddit_r/%';

-- 2. 사용 중단된 임시/백필 cron 비활성화
SELECT cron.unschedule('collect-2024-reviews-batch') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='collect-2024-reviews-batch');
SELECT cron.unschedule('update-us-product-names-batch') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='update-us-product-names-batch');