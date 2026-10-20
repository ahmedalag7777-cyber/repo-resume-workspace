-- Remove the obsolete six-argument enqueue overload before restoring it as a safe wrapper.
DROP FUNCTION IF EXISTS public.enqueue_report_execution_job(uuid, text, text, text, text[], integer);

REVOKE ALL ON FUNCTION public.enqueue_report_execution_job(uuid, text, text, text, text[], integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_report_execution_job(uuid, text, text, text, text[], integer, boolean) TO service_role;
