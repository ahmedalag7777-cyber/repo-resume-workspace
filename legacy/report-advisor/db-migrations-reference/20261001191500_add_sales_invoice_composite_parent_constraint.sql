-- PostgreSQL FK parent parity for sale_items(company_id, invoice_id).
-- Source-of-truth: live Report-Advisor staging schema observed on 2026-10-01.

create unique index if not exists sales_invoices_company_id_id_key
  on public.sales_invoices(company_id, id);

do $function$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_invoices_company_id_id_key'
      and conrelid = 'public.sales_invoices'::regclass
  ) then
    alter table public.sales_invoices
      add constraint sales_invoices_company_id_id_key
      unique using index sales_invoices_company_id_id_key;
  end if;
end
$function$;
