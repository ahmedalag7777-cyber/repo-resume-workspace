-- FK parent parity: PostgreSQL requires UNIQUE/PRIMARY KEY constraints, not standalone unique indexes.
-- Source-of-truth: Report-Advisor staging project on 2026-10-01.

create unique index if not exists purchase_invoices_company_id_id_key
  on public.purchase_invoices(company_id, id);

create unique index if not exists products_company_id_id_key
  on public.products(company_id, id);

do $function$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_invoices_company_id_id_key'
      and conrelid = 'public.purchase_invoices'::regclass
  ) then
    alter table public.purchase_invoices
      add constraint purchase_invoices_company_id_id_key
      unique using index purchase_invoices_company_id_id_key;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_company_id_id_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_company_id_id_key
      unique using index products_company_id_id_key;
  end if;
end
$function$;
