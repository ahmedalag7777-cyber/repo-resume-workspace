-- CYCLE-025: truth tables are written only through canonical guarded RPCs/triggers.
-- Tenant RLS is not sufficient when direct authenticated DML can bypass lifecycle,
-- provenance, and audit invariants.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.decision_outcomes FROM authenticated;
GRANT SELECT ON TABLE public.decision_outcomes TO authenticated;

-- Audit history is append-only. Inserts are produced by SECURITY DEFINER audit triggers;
-- normal authenticated clients must not be able to forge audit records directly.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM authenticated;
