-- CYCLE-026: certification/evidence records are proof artifacts, not client-writable state.
-- Normal authenticated clients may read tenant-scoped evidence but must not forge,
-- rewrite, or delete certification/rollback/backup proof directly.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.trust_certifications FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.autonomy_certification_runs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.backup_verification_runs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.autonomy_rollback_drills FROM authenticated;
GRANT SELECT ON TABLE public.trust_certifications, public.autonomy_certification_runs, public.backup_verification_runs, public.autonomy_rollback_drills TO authenticated;
