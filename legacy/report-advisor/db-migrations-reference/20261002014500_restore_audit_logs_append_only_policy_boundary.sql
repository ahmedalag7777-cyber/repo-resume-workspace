-- Audit logs are append-only for authenticated application users.
-- INSERT occurs through trusted SECURITY DEFINER runtime triggers.
-- The application role must never be able to mutate or erase audit evidence.

drop policy if exists tenant_update on public.audit_logs;
drop policy if exists tenant_delete on public.audit_logs;
revoke update, delete, truncate on table public.audit_logs from authenticated;
