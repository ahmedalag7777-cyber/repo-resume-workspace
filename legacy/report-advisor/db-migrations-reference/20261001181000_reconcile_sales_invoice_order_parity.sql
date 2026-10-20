-- Restore parity for live sales_invoices.order_id discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.

alter table public.sales_invoices
  add column if not exists order_id uuid;

do $function$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_invoices_order_id_fkey'
      and conrelid = 'public.sales_invoices'::regclass
  ) then
    alter table public.sales_invoices
      add constraint sales_invoices_order_id_fkey
      foreign key (order_id) references public.orders(id);
  end if;
end
$function$;

create index if not exists idx_sales_invoices_order_id
  on public.sales_invoices(order_id);
