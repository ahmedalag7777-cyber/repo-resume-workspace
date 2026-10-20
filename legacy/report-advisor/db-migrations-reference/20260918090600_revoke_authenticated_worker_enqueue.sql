-- Forward-only worker security hardening.
-- Durable worker lifecycle is service_role-only; browser/authenticated clients must
-- use the authenticated server boundary and must never execute worker primitives directly.
begin;

revoke execute on function public.enqueue_report_execution_job(uuid, text, text, text, text[], integer)
from public, anon, authenticated;

commit;
