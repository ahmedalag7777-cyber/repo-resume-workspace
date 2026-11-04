DELETE FROM public.mapping_feedback a USING public.mapping_feedback b
  WHERE a.user_id = b.user_id AND a.header_norm = b.header_norm AND a.created_at < b.created_at;
ALTER TABLE public.mapping_feedback ADD CONSTRAINT mapping_feedback_user_header_unique UNIQUE (user_id, header_norm);
CREATE INDEX IF NOT EXISTS analyses_user_created_idx ON public.analyses (user_id, created_at DESC);