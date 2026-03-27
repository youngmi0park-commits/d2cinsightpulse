DROP INDEX IF EXISTS reviews_external_id_unique;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_external_id_key UNIQUE (external_id);