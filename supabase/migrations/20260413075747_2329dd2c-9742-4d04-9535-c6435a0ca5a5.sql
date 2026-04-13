
-- 1. Fix SECURITY DEFINER view → SECURITY INVOKER
CREATE OR REPLACE VIEW public.bv_collection_summary
WITH (security_invoker = true)
AS
SELECT locale,
    count(DISTINCT product_id) AS products_tracked,
    sum(total_available) AS total_available,
    sum(total_collected) AS total_collected,
    round((((sum(total_collected))::numeric / (NULLIF(sum(total_available), 0))::numeric) * (100)::numeric), 1) AS collection_rate_pct,
    count(*) FILTER (WHERE (is_complete = true)) AS products_complete,
    count(*) FILTER (WHERE (is_complete = false)) AS products_pending,
    max(last_run_at) AS last_run_at
   FROM bv_collection_progress
  GROUP BY locale;

-- 2. Fix overly permissive ALL policies on newsletter tables (restrict writes to service_role)

-- newsletter_caution_items
DROP POLICY IF EXISTS "service_write_caution" ON public.newsletter_caution_items;
CREATE POLICY "service_write_caution" ON public.newsletter_caution_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_channel_actions
DROP POLICY IF EXISTS "service_write_actions" ON public.newsletter_channel_actions;
CREATE POLICY "service_write_actions" ON public.newsletter_channel_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_collection_stats
DROP POLICY IF EXISTS "service_write_stats" ON public.newsletter_collection_stats;
CREATE POLICY "service_write_stats" ON public.newsletter_collection_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_country_signals
DROP POLICY IF EXISTS "service_write_signals" ON public.newsletter_country_signals;
CREATE POLICY "service_write_signals" ON public.newsletter_country_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_faq_items
DROP POLICY IF EXISTS "service_write_faq" ON public.newsletter_faq_items;
CREATE POLICY "service_write_faq" ON public.newsletter_faq_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_issues
DROP POLICY IF EXISTS "service_write_issues" ON public.newsletter_issues;
CREATE POLICY "service_write_issues" ON public.newsletter_issues
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_matrix_rows
DROP POLICY IF EXISTS "service_write_matrix" ON public.newsletter_matrix_rows;
CREATE POLICY "service_write_matrix" ON public.newsletter_matrix_rows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Fix functions missing search_path

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;
