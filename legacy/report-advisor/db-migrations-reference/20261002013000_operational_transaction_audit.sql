-- Operational transaction audit boundary.
-- Orders, sales invoices and payments emit immutable tenant-scoped trace rows.
-- Mutations remain inside canonical RPCs; this migration only provides audit evidence.

create or replace function public.audit_operational_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_company uuid := coalesce(new.company_id, old.company_id);
  v_entity_id uuid := coalesce(new.id, old.id);
begin
  if v_company is null then
    raise exception 'AUDIT_COMPANY_REQUIRED';
  end if;

  if v_company <> public.current_company_id() then
    raise exception 'AUDIT_TENANT_CONTEXT_MISMATCH';
  end if;

  insert into public.audit_logs (
    company_id, action, entity_type, entity_id,
    old_value, new_value, source, user_label, correlation_id
  ) values (
    v_company,
    tg_table_name || ':' || lower(tg_op),
    tg_table_name,
    v_entity_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    'operations-runtime',
    auth.uid()::text,
    v_entity_id::text
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_orders_operational_audit on public.orders;
create trigger trg_orders_operational_audit
after insert or update or delete on public.orders
for each row execute function public.audit_operational_change();

drop trigger if exists trg_sales_invoices_operational_audit on public.sales_invoices;
create trigger trg_sales_invoices_operational_audit
after insert or update or delete on public.sales_invoices
for each row execute function public.audit_operational_change();

drop trigger if exists trg_payments_operational_audit on public.payments;
create trigger trg_payments_operational_audit
after insert or update or delete on public.payments
for each row execute function public.audit_operational_change();

revoke all on function public.audit_operational_change() from public;
