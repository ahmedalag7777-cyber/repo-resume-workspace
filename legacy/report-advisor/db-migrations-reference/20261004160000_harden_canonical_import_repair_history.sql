-- Repair-history audit table is server-side only.
-- Keep end-user roles without table privileges and enforce RLS as defense in depth.
alter table public.canonical_import_repair_history enable row level security;
revoke all on table public.canonical_import_repair_history from anon, authenticated, public;
grant all on table public.canonical_import_repair_history to service_role;
