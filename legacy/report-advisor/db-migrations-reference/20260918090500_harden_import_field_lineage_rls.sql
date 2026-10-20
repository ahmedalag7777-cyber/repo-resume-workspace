-- Forward-only security hardening: keep field-level import lineage out of the authenticated browser surface.
-- The table is consumed by trusted server-side/service-role paths. RLS is explicit and
-- authenticated/anonymous roles receive no table privileges. Historical migration records
-- are not rewritten.
begin;

alter table public.import_field_lineage enable row level security;

drop policy if exists authenticated_import_field_lineage_deny on public.import_field_lineage;
create policy authenticated_import_field_lineage_deny
on public.import_field_lineage
as restrictive
for all
to authenticated
using (false)
with check (false);

revoke all on table public.import_field_lineage from anon, authenticated;

commit;
