
-- Remove overly permissive INSERT/UPDATE policies (service role bypasses RLS)
DROP POLICY "Service role can insert products" ON public.products;
DROP POLICY "Service role can update products" ON public.products;
DROP POLICY "Service role can insert reviews" ON public.reviews;
DROP POLICY "Service role can insert trending_snapshots" ON public.trending_snapshots;
DROP POLICY "Service role can update trending_snapshots" ON public.trending_snapshots;
DROP POLICY "Service role can insert trending_keywords" ON public.trending_keywords;
DROP POLICY "Service role can insert collection_logs" ON public.collection_logs;
DROP POLICY "Service role can update collection_logs" ON public.collection_logs;
