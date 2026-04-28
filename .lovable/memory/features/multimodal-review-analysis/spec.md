---
name: Multimodal Review Analysis
description: Photo (Vision) and Video (transcript+comments FCO) review analysis pipeline with reviews.has_media/media_type/media_urls/multimodal_analysis schema and dedicated edge functions
type: feature
---

reviews table extension:
- has_media boolean, media_type (photo|video|mixed|none), media_urls text[]
- multimodal_analysis jsonb, multimodal_analyzed_at timestamptz
- media_analysis_status (pending|processing|done|failed|skipped)

Edge functions:
- analyze-photo-review: Lovable AI google/gemini-2.5-pro vision. Returns product_condition, damage_signals, installation_quality, environment, action_required, summary_ko. Always masks competitor brands and PII.
- analyze-video-review: Fetches YouTube timedtext transcript + uses top_comments. Returns FCO keywords, pros_segments, cons_segments with timestamps, competitor_comparisons, 6-emotion distribution.
- backfill-multimodal-reviews: scans pending reviews, detects YouTube IDs and image URLs in source_url/content, marks media flags, fire-and-forget invokes the analyze-* functions. Body: { limit, dry_run }.

ReviewList UI: 📷 사진 / 🎬 영상 badges + analysis preview panel rendering pros_segments/cons_segments with timestamps for video, damage_signals/installation_quality/environment for photo. Marks "긴급 QC 검토 필요" when action_required=urgent_qc_review.
