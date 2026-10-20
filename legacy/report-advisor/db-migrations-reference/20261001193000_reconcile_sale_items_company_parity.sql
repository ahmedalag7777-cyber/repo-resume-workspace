-- Restore parity for live sale_items.company_id discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.

alter table public.sale_items
  add column if not exists company_id uuid;

do $function$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sale_items_invoice_company_fkey'
      and conrelid = 'public.sale_items'::regclass
  ) then
    alter table public.sale_items
      add constraint sale_items_invoice_company_fkey
      foreign key (company_id, invoice_id)
      references public.sales_invoices(company_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sale_items_product_company_fkey'
      and conrelid = 'public.sale_items'::regclass
  ) then
    alter table public.sale_items
      add constraint sale_items_product_company_fkey
      foreign key (company_id, product_id)
      references public.products(company_id, id);
  end if;
end
$function$;

create index if not exists idx_sale_items_company_id
  on public.sale_items(company_id);

alter table public.sale_items enable row level security;

drop policy if exists tenant_select on public.sale_items;
create policy tenant_select
  on public.sale_items
  for select to authenticated
  using (
    exists (
      select 1 from public.sales_invoices i
      where i.id = sale_items.invoice_id
        and i.company_id = public.current_company_id()
    )
  );

drop policy if exists tenant_insert on public.sale_items;
create policy tenant_insert
  on public.sale_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.sales_invoices i
      where i.id = sale_items.invoice_id
        and i.company_id = public.current_company_id()
    )
  );

drop policy if exists tenant_update on public.sale_items;
create policy tenant_update
  on public.sale_items
  for update to authenticated
  using (
    exists (
      select 1 from public.sales_invoices i
      where i.id = sale_items.invoice_id
        and i.company_id = public.current_company_id()
    )
  )
  with check (
    exists (
      select 1 from public.sales_invoices i
      where i.id = sale_items.invoice_id
        and i.company_id = public.current_company_id()
    )
  );

drop policy if exists tenant_delete on public.sale_items;
create policy tenant_delete
  on public.sale_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.sales_invoices i
      where i.id = sale_items.invoice_id
        and i.company_id = public.current_company_id()
    )
  );

revoke all on table public.sale_items from anon;
revoke all on table public.sale_items from authenticated;
grant select, insert, update, delete on table public.sale_items to authenticated;
grant all on table public.sale_items to service_role;
