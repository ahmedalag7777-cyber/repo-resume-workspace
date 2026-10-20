-- Transactional spine staff read boundary.
-- No DML authority is added here; mutation remains inside the SECURITY DEFINER RPCs.
-- Customer self-service SELECT policies remain intact.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='orders' and policyname='orders_staff_select'
  ) then
    create policy orders_staff_select
      on public.orders
      for select to authenticated
      using (
        company_id = public.current_company_id()
        and exists (
          select 1
          from public.company_memberships cm
          where cm.company_id = orders.company_id
            and cm.user_id = (select auth.uid())
            and cm.is_active
            and cm.role = any (array['owner','admin','sales','warehouse'])
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='order_items' and policyname='order_items_staff_select'
  ) then
    create policy order_items_staff_select
      on public.order_items
      for select to authenticated
      using (
        company_id = public.current_company_id()
        and exists (
          select 1
          from public.company_memberships cm
          where cm.company_id = order_items.company_id
            and cm.user_id = (select auth.uid())
            and cm.is_active
            and cm.role = any (array['owner','admin','sales','warehouse'])
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_price_tiers' and policyname='price_tiers_staff_select'
  ) then
    create policy price_tiers_staff_select
      on public.customer_price_tiers
      for select to authenticated
      using (
        company_id = public.current_company_id()
        and exists (
          select 1
          from public.company_memberships cm
          where cm.company_id = customer_price_tiers.company_id
            and cm.user_id = (select auth.uid())
            and cm.is_active
            and cm.role = any (array['owner','admin','sales'])
        )
      );
  end if;
end $$;
