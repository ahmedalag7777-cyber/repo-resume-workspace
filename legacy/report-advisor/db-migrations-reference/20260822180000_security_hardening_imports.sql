-- Security hardening for the file/document intelligence and import boundary.
-- The original schema intentionally exposed broad anon CRUD for local-first prototyping.
-- Production import/file paths must not accept unauthenticated writes or RPC execution.
-- Tenant predicates remain a separate release gate until the canonical membership resolver
-- is available in the database; this migration deliberately avoids inventing one.

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
    'data_quality_reports',
    'imports',
    'import_rows'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_select_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS anon_insert_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS anon_update_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS anon_delete_%I ON %I', t, t);

    EXECUTE format('DROP POLICY IF EXISTS authenticated_select_%I ON %I', t, t);
    EXECUTE format('CREATE POLICY authenticated_select_%I ON %I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_insert_%I ON %I', t, t);
    EXECUTE format('CREATE POLICY authenticated_insert_%I ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_update_%I ON %I', t, t);
    EXECUTE format('CREATE POLICY authenticated_update_%I ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_delete_%I ON %I', t, t);
    EXECUTE format('CREATE POLICY authenticated_delete_%I ON %I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION import_create_job(uuid, text, integer, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION import_update_job_progress(uuid, integer, integer, integer, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION import_finish_job(uuid, text, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION import_upsert_product(uuid, text, text, text, numeric, numeric, numeric, numeric, text) FROM anon;

GRANT EXECUTE ON FUNCTION import_create_job(uuid, text, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION import_update_job_progress(uuid, integer, integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION import_finish_job(uuid, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION import_upsert_product(uuid, text, text, text, numeric, numeric, numeric, numeric, text) TO authenticated;

COMMENT ON TABLE file_records IS 'Production boundary: unauthenticated access disabled; tenant authorization must be enforced by the canonical membership policy.';
COMMENT ON TABLE import_jobs IS 'Production boundary: unauthenticated access disabled; tenant authorization must be enforced by the canonical membership policy.';
