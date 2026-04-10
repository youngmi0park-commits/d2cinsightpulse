
-- Newsletter Issues
CREATE TABLE IF NOT EXISTS public.newsletter_issues (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date        date    NOT NULL,
  week_start        date    NOT NULL,
  week_end          date    NOT NULL,
  title             text,
  total_reviews     integer,
  countries_count   integer,
  channels_count    integer,
  avg_sentiment     numeric,
  html_snapshot     text,
  status            text    DEFAULT 'draft',
  generated_at      timestamptz,
  published_at      timestamptz,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(week_start)
);

-- Country Signals
CREATE TABLE IF NOT EXISTS public.newsletter_country_signals (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          uuid    REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  subsidiary_code   text    NOT NULL,
  sentiment_score   numeric,
  total_reviews     integer,
  positive_count    integer,
  negative_count    integer,
  top_category      text,
  top_insight_ko    text,
  top_insight_en    text,
  signal_tags       text[],
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT valid_lge_code CHECK (
    subsidiary_code IN (
      'LGEUS','LGECI','LGESP','LGEMS',
      'LGEUK','LGEDG','LGEFS','LGEBN',
      'LGEIN','LGEAP',
      'LGEJP','LGETW','LGEHK',
      'LGESG','LGEMY','LGEID','LGETH','LGEPH','LGEVN'
    )
  )
);

-- Matrix Rows
CREATE TABLE IF NOT EXISTS public.newsletter_matrix_rows (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          uuid    REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  category_name     text    NOT NULL,
  category_name_en  text,
  cells             jsonb   NOT NULL DEFAULT '{}',
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

-- Channel Actions
CREATE TABLE IF NOT EXISTS public.newsletter_channel_actions (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          uuid    REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  channel_type      text    NOT NULL,
  target_codes      text[],
  action_title_ko   text,
  action_title_en   text,
  basis_ko          text,
  basis_en          text,
  copy_headline_ko  text,
  copy_headline_en  text,
  tags              text[],
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

-- FAQ Items
CREATE TABLE IF NOT EXISTS public.newsletter_faq_items (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          uuid    REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  faq_type          text    NOT NULL,
  question_ko       text,
  question_en       text,
  answer_ko         text,
  answer_en         text,
  cis_score         integer,
  priority          text    DEFAULT 'p1',
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

-- Caution Items
CREATE TABLE IF NOT EXISTS public.newsletter_caution_items (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          uuid    REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  severity          text    DEFAULT 'warning',
  target_codes      text[],
  title_ko          text,
  title_en          text,
  body_ko           text,
  body_en           text,
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

-- Collection Stats
CREATE TABLE IF NOT EXISTS public.newsletter_collection_stats (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          uuid    REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  source            text    NOT NULL,
  display_name      text,
  review_count      integer DEFAULT 0,
  dot_color         text,
  show_as_pill      boolean DEFAULT true,
  sort_order        integer DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nl_issues_date ON public.newsletter_issues(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_nl_signals_issue ON public.newsletter_country_signals(issue_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_nl_matrix_issue ON public.newsletter_matrix_rows(issue_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_nl_actions_issue ON public.newsletter_channel_actions(issue_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_nl_faq_issue ON public.newsletter_faq_items(issue_id, cis_score DESC);
CREATE INDEX IF NOT EXISTS idx_nl_caution_issue ON public.newsletter_caution_items(issue_id, sort_order);

-- RLS
ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_country_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_matrix_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_channel_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_caution_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_collection_stats ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "read_all_issues" ON public.newsletter_issues FOR SELECT USING (true);
CREATE POLICY "read_all_signals" ON public.newsletter_country_signals FOR SELECT USING (true);
CREATE POLICY "read_all_matrix" ON public.newsletter_matrix_rows FOR SELECT USING (true);
CREATE POLICY "read_all_actions" ON public.newsletter_channel_actions FOR SELECT USING (true);
CREATE POLICY "read_all_faq" ON public.newsletter_faq_items FOR SELECT USING (true);
CREATE POLICY "read_all_caution" ON public.newsletter_caution_items FOR SELECT USING (true);
CREATE POLICY "read_all_stats" ON public.newsletter_collection_stats FOR SELECT USING (true);

-- Write policies (service role for edge functions)
CREATE POLICY "service_write_issues" ON public.newsletter_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_signals" ON public.newsletter_country_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_matrix" ON public.newsletter_matrix_rows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_actions" ON public.newsletter_channel_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_faq" ON public.newsletter_faq_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_caution" ON public.newsletter_caution_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write_stats" ON public.newsletter_collection_stats FOR ALL USING (true) WITH CHECK (true);
