-- Reconstructed from live privilege state on 2026-08-29.
-- Exact historical source was not recovered verbatim; this preserves the observed
-- append-only authenticated boundary without changing existing insert capability.
revoke update, delete, truncate on table public.audit_logs from authenticated;
