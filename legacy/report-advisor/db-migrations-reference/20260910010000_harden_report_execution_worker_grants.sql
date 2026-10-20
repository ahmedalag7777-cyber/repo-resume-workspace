-- Worker RPCs are internal privileged operations. They are never a client API.
-- Keep the public/authenticated roles unable to execute them, and grant only service_role.
-- The functions themselves remain tenant/job/lease fenced by their company_id and lease predicates.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid,
           n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'enqueue_report_execution_job',
        'claim_report_execution_job',
        'heartbeat_report_execution_job',
        'advance_report_execution_checkpoint',
        'complete_report_execution_job',
        'fail_report_execution_job',
        'recover_expired_report_execution_jobs',
        'retry_report_execution_job'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.schema_name, fn.function_name, fn.identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      fn.schema_name, fn.function_name, fn.identity_args
    );
  END LOOP;
END
$$;