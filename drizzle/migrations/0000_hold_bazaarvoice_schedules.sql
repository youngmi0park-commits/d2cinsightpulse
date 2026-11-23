DO $$
DECLARE bv_job record;
BEGIN
  FOR bv_job IN SELECT jobid FROM cron.job WHERE jobname IN ('collect-bazaarvoice-uk-daily','bv-auto-sweep-daily','bv-auto-collect-6h','bv-auto-sync-daily','backfill-categories-daily') OR command ~* '(api\.bazaarvoice\.com|/bv-auto-collect|/bv-collect-reviews|/bv-sweep-products|/bv-incremental-sync|/backfill-review-type|/update-product-names|/backfill-categories)'
  LOOP
    PERFORM cron.alter_job(bv_job.jobid, active := false);
  END LOOP;
END $$;