-- File Intelligence security baseline: anonymous clients must never have direct CRUD access.
-- Tenant-scoped authenticated policies are managed by the application's existing authorization layer;
-- this migration only removes the unsafe anonymous surface introduced by the legacy schema migration.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'file_records',
    'synonym_dictionary',
    'import_profiles',
    'import_snapshots',
    'import_jobs',
    'import_job_rows',
    'data_quality_reports'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_select_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_insert_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_update_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_delete_' || t, t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- The import RPC surface must not be callable by anonymous clients.
DO $$
BEGIN
  IF to_regprocedure('public.import_upsert_chunk(jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.import_upsert_chunk(jsonb) FROM anon;
  END IF;
END $$;

COMMENT ON TABLE public.file_records IS 'File Intelligence metadata; anonymous direct CRUD is prohibited.';
COMMENT ON TABLE public.import_jobs IS 'Import lifecycle; anonymous direct CRUD is prohibited.';
