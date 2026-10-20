-- Restore parity for live purchase_items.company_id discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.

-- Parent composite uniqueness must exist before tenant-scoped foreign keys are created during fresh restore.
create unique index if not exists purchase_invoices_company_id_id_key
  on public.purchase_invoices(company_id, id);

create unique index if not exists products_company_id_id_key
  on public.products(company_id, id);

alter table public.purchase_items
  add column if not exists company_id uuid;

do $function$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_items_invoice_company_fkey'
      and conrelid = 'public.purchase_items'::regclass
  ) then
    alter table public.purchase_items
      add constraint purchase_items_invoice_company_fkey
      foreign key (company_id, invoice_id)
      references public.purchase_invoices(company_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_items_product_company_fkey'
      and conrelid = 'public.purchase_items'::regclass
  ) then
    alter table public.purchase_items
      add constraint purchase_items_product_company_fkey
      foreign key (company_id, product_id)
      references public.products(company_id, id);
  end if;
end
$function$;

create index if not exists idx_purchase_items_company_id
  on public.purchase_items(company_id);