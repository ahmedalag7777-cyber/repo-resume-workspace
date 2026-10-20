-- Canonical watched-report persistence boundary.
-- Authenticated clients must use the tenant-bound recorder RPC; direct table DML
-- would bypass folder ownership, identity, state and source-version guards.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.watched_report_files FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_watched_report_file(
  uuid, text, text, bigint, timestamptz, text
) TO authenticated;
