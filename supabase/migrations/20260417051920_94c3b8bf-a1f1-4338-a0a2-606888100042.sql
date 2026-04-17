alter table public.newsletter_issues
  add column if not exists review_delta        text,
  add column if not exists top_positive_kw     text,
  add column if not exists top_positive_count  integer,
  add column if not exists top_product         text,
  add column if not exists top_product_count   integer,
  add column if not exists lgcom_count         integer,
  add column if not exists reddit_count        integer,
  add column if not exists youtube_count       integer,
  add column if not exists trustpilot_count    integer,
  add column if not exists other_channel_count integer;