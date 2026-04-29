
-- Mark YouTube source reviews as video, queued for analysis
UPDATE public.reviews
SET has_media = true,
    media_type = 'video',
    media_analysis_status = 'queued'
WHERE media_analysis_status = 'pending'
  AND source LIKE 'youtube%';

-- Mark photo URLs in content (jpg/png/webp/gif) as photo, queued
UPDATE public.reviews
SET has_media = true,
    media_type = 'photo',
    media_analysis_status = 'queued',
    media_urls = ARRAY(
      SELECT (regexp_matches(content, 'https?://[^\s"''<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"''<>]*)?', 'gi'))[1]
      LIMIT 5
    )
WHERE media_analysis_status = 'pending'
  AND source NOT LIKE 'youtube%'
  AND content ~* 'https?://[^\s"''<>]+\.(jpg|jpeg|png|webp|gif)';

-- Everything else: no media detected, mark skipped
UPDATE public.reviews
SET has_media = false,
    media_type = 'none',
    media_analysis_status = 'skipped'
WHERE media_analysis_status = 'pending';
