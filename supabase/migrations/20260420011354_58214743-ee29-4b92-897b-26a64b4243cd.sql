-- Auto-cleanup stuck collection_logs (running > 10min => failed)
CREATE OR REPLACE FUNCTION public.cleanup_stuck_collection_logs(p_max_age_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE collection_logs
  SET status = 'failed',
      completed_at = now(),
      error_message = COALESCE(error_message, '') || ' [auto-cleanup: stuck > ' || p_max_age_minutes || 'min]'
  WHERE status = 'running'
    AND started_at < (now() - make_interval(mins => p_max_age_minutes));
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Run cleanup once now to clear backlog
SELECT public.cleanup_stuck_collection_logs(10);

-- Schedule cleanup every 5 minutes via pg_cron (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-stuck-collection-logs');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-stuck-collection-logs',
      '*/5 * * * *',
      $cron$ SELECT public.cleanup_stuck_collection_logs(10); $cron$
    );
  END IF;
END $$;