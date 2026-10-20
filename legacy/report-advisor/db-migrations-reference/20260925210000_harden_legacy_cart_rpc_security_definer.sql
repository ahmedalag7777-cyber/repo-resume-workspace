-- Harden legacy customer-cart RPCs that remain live in Staging.
-- Source-of-truth verified against project fnqbvfuwbdpwvhcgzksl on 2026-09-25.
-- The RPCs were SECURITY DEFINER with an empty search_path while referencing public tables
-- without schema qualification. Public CREATE is revoked for anon/authenticated/public;
-- this migration makes the source contract explicit and search-path safe.
create or replace function public.clear_cart()
returns void
language plpgsql
security definer
set search_path to public, pg_catalog
as $function$
begin
  delete from public.cart_items ci
  using public.carts c
  where ci.cart_id = c.id
    and c.user_id = auth.uid()
    and c.customer_id = public.current_customer_id()
    and c.company_id = public.current_customer_company_id();
end;
$function$;

create or replace function public.get_cart()
returns table(
  product_id uuid,
  sku text,
  name text,
  unit text,
  quantity integer,
  authorized_price numeric,
  currency text
)
language plpgsql
stable
security definer
set search_path to public, pg_catalog
as $function$
begin
  return query
  select
    p.id,
    p.sku,
    p.name,
    p.unit,
    ci.quantity,
    coalesce(
      (
        select cpt.unit_price
        from public.customer_price_tiers cpt
        where cpt.customer_id = public.current_customer_id()
          and cpt.product_id = p.id
          and cpt.company_id = public.current_customer_company_id()
          and cpt.min_quantity <= ci.quantity
        order by cpt.min_quantity desc
        limit 1
      ),
      p.selling_price
    ),
    coalesce(
      (
        select c.currency
        from public.companies c
        where c.id = public.current_customer_company_id()
      ),
      'SAR'
    )
  from public.carts c
  join public.cart_items ci on ci.cart_id = c.id
  join public.products p on p.id = ci.product_id
  where c.user_id = auth.uid()
    and c.customer_id = public.current_customer_id()
    and c.company_id = public.current_customer_company_id();
end;
$function$;

create or replace function public.remove_cart_item(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path to public, pg_catalog
as $function$
begin
  delete from public.cart_items ci
  using public.carts c
  where ci.cart_id = c.id
    and ci.product_id = p_product_id
    and c.user_id = auth.uid()
    and c.customer_id = public.current_customer_id()
    and c.company_id = public.current_customer_company_id();
end;
$function$;

create or replace function public.set_cart_item(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path to public, pg_catalog
as $function$
declare
  v_cart uuid;
  v_company uuid;
  v_customer uuid;
  v_available numeric;
begin
  v_company := public.current_customer_company_id();
  v_customer := public.current_customer_id();

  if v_company is null or v_customer is null then
    raise exception 'customer context required';
  end if;

  select coalesce(sum(ib.quantity), 0)
    into v_available
  from public.inventory_balances ib
  where ib.company_id = v_company
    and ib.product_id = p_product_id;

  if p_quantity < 1 or p_quantity > 100000 or p_quantity > v_available then
    raise exception 'quantity exceeds available stock';
  end if;

  insert into public.carts(company_id, customer_id, user_id)
  values(v_company, v_customer, auth.uid())
  on conflict(company_id, user_id)
  do update set updated_at = now()
  returning id into v_cart;

  insert into public.cart_items(cart_id, product_id, quantity)
  values(v_cart, p_product_id, p_quantity)
  on conflict(cart_id, product_id)
  do update set quantity = excluded.quantity, updated_at = now();
end;
$function$;

revoke all on function public.clear_cart() from public, anon;
revoke all on function public.get_cart() from public, anon;
revoke all on function public.remove_cart_item(uuid) from public, anon;
revoke all on function public.set_cart_item(uuid, integer) from public, anon;

grant execute on function public.clear_cart() to authenticated;
grant execute on function public.clear_cart() to service_role;
grant execute on function public.get_cart() to authenticated;
grant execute on function public.get_cart() to service_role;
grant execute on function public.remove_cart_item(uuid) to authenticated;
grant execute on function public.remove_cart_item(uuid) to service_role;
grant execute on function public.set_cart_item(uuid, integer) to authenticated;
grant execute on function public.set_cart_item(uuid, integer) to service_role;
