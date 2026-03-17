
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS emotion_category text DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS emotion_intensity integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'review',
ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'unknown';

COMMENT ON COLUMN public.reviews.emotion_category IS 'Granular emotion: satisfaction, recommendation, impressed, neutral, informational, question, complaint, anger, disappointment, mixed';
COMMENT ON COLUMN public.reviews.emotion_intensity IS 'Emotion intensity 1-5';
COMMENT ON COLUMN public.reviews.user_type IS 'User segment: actual_user, potential_customer, reviewer, journalist, unknown';
COMMENT ON COLUMN public.reviews.content_type IS 'Content type: review, general_mention, advertisement, noise';
COMMENT ON COLUMN public.reviews.platform_type IS 'Platform type: community, review_site, video, blog, news';
