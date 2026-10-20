-- Repeatable staging/browser proof reset for explicitly seeded E2E orders.
-- This is a guarded canonical RPC, not direct test DML.
create or replace function public.prepare_e2e_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_role text;
  v_order public.orders%rowtype;
  v_item record;
  v_invoice_id uuid;
begin
  if v_company is null or v_user is null then
    raise exception using errcode='42501', message='TENANT_CONTEXT_REQUIRED';
  end if;
  select cm.role into v_role
  from public.company_memberships cm
  where cm.company_id=v_company and cm.user_id=v_user and cm.is_active=true
  limit 1;
  if v_role not in ('owner','admin') then
    raise exception using errcode='42501', message='E2E_RESET_ADMIN_REQUIRED';
  end if;
  select * into v_order from public.orders
  where id=p_order_id and company_id=v_company
  for update;
  if not found then
    raise exception using errcode='P0002', message='E2E_ORDER_NOT_FOUND';
  end if;
  if coalesce(v_order.idempotency_key,'') not like 'E2E-ORDER-%' then
    raise exception using errcode='42501', message='E2E_ORDER_TAG_REQUIRED';
  end if;
  if v_order.status <> 'pending' then
    for v_item in
      select oi.product_id, oi.quantity
      from public.order_items oi
      where oi.company_id=v_company and oi.order_id=v_order.id
    loop
      update public.inventory_balances ib
         set quantity=ib.quantity + v_item.quantity, updated_at=now()
       where ib.company_id=v_company and ib.warehouse_id=v_order.warehouse_id
         and ib.product_id=v_item.product_id;
      if not found then
        raise exception using errcode='P0001', message='E2E_RESET_INVENTORY_BALANCE_MISSING';
      end if;
      insert into public.inventory_movements(
        company_id, warehouse_id, product_id, movement_type, quantity,
        reference_type, reference_id, movement_date, notes
      ) values(
        v_company, v_order.warehouse_id, v_item.product_id, 'return', v_item.quantity,
        'e2e_order_reset', v_order.id, current_date, 'Repeatable browser E2E reset'
      );
    end loop;

    select si.id into v_invoice_id
    from public.sales_invoices si
    where si.company_id=v_company and si.order_id=v_order.id
    order by si.created_at desc limit 1;

    if v_invoice_id is not null then
      delete from public.payments where company_id=v_company and invoice_id=v_invoice_id;
      delete from public.sales_invoices where company_id=v_company and id=v_invoice_id;
    end if;

    insert into public.order_status_history(company_id, order_id, from_status, to_status, actor_id)
    values(v_company, v_order.id, v_order.status, 'pending', v_user);

    update public.orders set status='pending', updated_at=now()
    where company_id=v_company and id=v_order.id and status <> 'pending'
    returning * into v_order;

    insert into public.order_outbox_events(company_id,order_id,event_type,payload)
    values(v_company,v_order.id,'order.e2e_reset',jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number));

    insert into public.audit_logs(company_id, action, entity_type, entity_id, old_value, new_value, source)
    values(v_company,'order_e2e_reset','order',v_order.id,jsonb_build_object('status','non-pending'),jsonb_build_object('status','pending'),'e2e-provisioning');
  end if;
  return v_order;
end;
$$;

revoke all on function public.prepare_e2e_order(uuid) from public, anon;
grant execute on function public.prepare_e2e_order(uuid) to authenticated;
