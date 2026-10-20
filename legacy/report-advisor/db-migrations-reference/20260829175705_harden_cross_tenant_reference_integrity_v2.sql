-- Harden cross-tenant references that are not fully covered by FK constraints.
-- Canonical generic tenant-reference trigger helper used by the warehouse/branch guard.
-- It must exist before the trigger is created and is intentionally replay-safe.
create or replace function public.enforce_same_company_reference()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  referenced_id uuid;
  parent_company uuid;
  parent_table text := tg_argv[0];
  fk_column text := tg_argv[1];
begin
  if tg_nargs <> 2 then
    raise exception 'TENANT_REFERENCE_ARGUMENTS_REQUIRED';
  end if;

  referenced_id := nullif(to_jsonb(new)->>fk_column, '')::uuid;
  if referenced_id is null then
    return new;
  end if;

  execute format(
    'select company_id from public.%I where id = $1',
    parent_table
  )
  into parent_company
  using referenced_id;

  if parent_company is null then
    raise exception 'REFERENCED_ENTITY_NOT_FOUND';
  end if;

  if parent_company is distinct from new.company_id then
    raise exception 'TENANT_CONTEXT_MISMATCH';
  end if;

  return new;
end;
$function$;

-- Recovered from the production-applied migration state on 2026-08-29.

create or replace function public.enforce_payment_reference_same_company()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  parent_company uuid;
begin
  if new.customer_id is not null then
    select company_id into parent_company from public.customers where id = new.customer_id;
    if parent_company is null or parent_company is distinct from new.company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  end if;
  if new.supplier_id is not null then
    select company_id into parent_company from public.suppliers where id = new.supplier_id;
    if parent_company is null or parent_company is distinct from new.company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  end if;
  if new.invoice_id is not null then
    select company_id into parent_company from public.sales_invoices where id = new.invoice_id;
    if parent_company is null or parent_company is distinct from new.company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  end if;
  return new;
end;
$function$;

create or replace function public.enforce_item_reference_same_invoice_company()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare invoice_company uuid; parent_company uuid; invoice_table text := tg_argv[0];
begin
  execute format('select company_id from public.%I where id = $1', invoice_table) into invoice_company using new.invoice_id;
  if invoice_company is null then raise exception 'REFERENCED_ENTITY_NOT_FOUND'; end if;
  if new.product_id is not null then
    select company_id into parent_company from public.products where id = new.product_id;
    if parent_company is null or parent_company is distinct from invoice_company then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_payment_reference_company on public.payments;
create trigger trg_payment_reference_company before insert or update on public.payments
for each row execute function public.enforce_payment_reference_same_company();

drop trigger if exists trg_sale_item_product_company on public.sale_items;
create trigger trg_sale_item_product_company before insert or update on public.sale_items
for each row execute function public.enforce_item_reference_same_invoice_company('sales_invoices');

drop trigger if exists trg_purchase_item_product_company on public.purchase_items;
create trigger trg_purchase_item_product_company before insert or update on public.purchase_items
for each row execute function public.enforce_item_reference_same_invoice_company('purchase_invoices');

drop trigger if exists trg_warehouse_branch_company on public.warehouses;
create trigger trg_warehouse_branch_company before insert or update on public.warehouses
for each row execute function public.enforce_same_company_reference('branches','branch_id');
