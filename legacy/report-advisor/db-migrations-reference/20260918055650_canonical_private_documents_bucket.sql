-- Canonical private application document bucket for tenant-scoped storage runtime.
-- Object names remain rooted at <company_id>/... and are protected by the
-- storage.objects tenant/owner policies declared in 20260831010000.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
