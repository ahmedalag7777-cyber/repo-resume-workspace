-- Reduce the exposed API surface of internal trust/tenant helper functions.
-- These helpers are consumed by database-side authorization logic, not by the web client.
-- Mutating runtime RPCs retain authenticated execution and enforce their own tenant/authority gates.
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_certify_autonomous_domain(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_execute_bi_decision(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_execute_control_plane_run(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_continuous_trust_healthy(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_trust_certificate_valid(text) FROM authenticated;
