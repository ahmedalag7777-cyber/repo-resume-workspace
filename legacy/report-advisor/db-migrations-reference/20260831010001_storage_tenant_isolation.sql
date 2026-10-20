-- Storage tenant isolation contract.
-- Object paths MUST be rooted at <company_id>/... for browser/API access.
-- Service-role/trusted automation remains outside these client RLS policies.

create policy "storage_objects_select_current_tenant"
on storage.objects
for select
to authenticated
using (
  (storage.foldername(name))[1] = (select current_company_id()::text)
);

create policy "storage_objects_insert_current_tenant"
on storage.objects
for insert
to authenticated
with check (
  (storage.foldername(name))[1] = (select current_company_id()::text)
  and owner_id = (select auth.uid()::text)
);

create policy "storage_objects_update_current_tenant_owner"
on storage.objects
for update
to authenticated
using (
  (storage.foldername(name))[1] = (select current_company_id()::text)
  and owner_id = (select auth.uid()::text)
)
with check (
  (storage.foldername(name))[1] = (select current_company_id()::text)
  and owner_id = (select auth.uid()::text)
);

create policy "storage_objects_delete_current_tenant_owner"
on storage.objects
for delete
to authenticated
using (
  (storage.foldername(name))[1] = (select current_company_id()::text)
  and owner_id = (select auth.uid()::text)
);

revoke all on storage.objects from anon;
