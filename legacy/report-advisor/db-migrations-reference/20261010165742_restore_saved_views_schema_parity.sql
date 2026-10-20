-- Recreate saved-view persistence in clean restores.
-- Schema/policy/constraints below were read back from Report-Advisor staging.
-- Keep saved views scoped to both the active tenant and authenticated owner.
CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  view_key text NOT NULL,
  name text NOT NULL,
  route text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_views_pkey PRIMARY KEY (id),
  CONSTRAINT saved_views_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT saved_views_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT saved_views_company_id_user_id_view_key_key
    UNIQUE (company_id, user_id, view_key)
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_route
  ON public.saved_views USING btree (company_id, user_id, route, updated_at DESC);

-- Idempotently cover an existing partial table too; the name matches the live unique index.
CREATE UNIQUE INDEX IF NOT EXISTS saved_views_company_id_user_id_view_key_key
  ON public.saved_views USING btree (company_id, user_id, view_key);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.saved_views FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.saved_views TO service_role;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_views'
      AND policyname = 'saved_views_owner'
  ) THEN
    CREATE POLICY saved_views_owner
      ON public.saved_views
      FOR ALL TO authenticated
      USING (company_id = public.current_company_id() AND user_id = auth.uid())
      WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
  END IF;
END;
$migration$;
