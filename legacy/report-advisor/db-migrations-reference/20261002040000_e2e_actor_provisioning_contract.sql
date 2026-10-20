create or replace function public.provision_e2e_test_membership(
  p_company_id uuid,
  p_user_id uuid,
  p_role text,
  p_is_default boolean default false
)
returns public.company_memberships
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_membership public.company_memberships;
  v_company_name text;
  v_metadata jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'E2E_PROVISION_SERVICE_ROLE_ONLY';
  end if;

  select c.name into v_company_name
  from public.companies c
  where c.id = p_company_id;

  if v_company_name is null then
    raise exception 'E2E_PROVISION_TENANT_NOT_FOUND';
  end if;

  if v_company_name <> 'RUNTIME-EVIDENCE-A-401117'
     and v_company_name not like 'Aghbari Report Corpus CI %' then
    raise exception 'E2E_PROVISION_TENANT_NOT_ALLOWED';
  end if;

  if p_role not in ('admin','manager','sales','warehouse') then
    raise exception 'E2E_PROVISION_ROLE_NOT_ALLOWED';
  end if;

  select u.raw_user_meta_data into v_metadata
  from auth.users u
  where u.id = p_user_id;

  if v_metadata is null then
    raise exception 'E2E_PROVISION_ACTOR_NOT_FOUND';
  end if;

  if coalesce(v_metadata ->> 'e2e_actor', '') <> 'true'
     or coalesce(v_metadata ->> 'e2e_purpose', '') <> 'full-product-browser-e2e' then
    raise exception 'E2E_PROVISION_ACTOR_NOT_TAGGED';
  end if;

  if p_is_default then
    update public.company_memberships
    set is_default = false
    where user_id = p_user_id
      and is_active = true
      and company_id <> p_company_id;
  end if;

  insert into public.company_memberships(
    id, company_id, user_id, role, is_active, created_at, is_default
  )
  values(
    gen_random_uuid(), p_company_id, p_user_id, p_role, true, now(), p_is_default
  )
  on conflict(company_id, user_id)
  do update set
    role = excluded.role,
    is_active = true,
    is_default = excluded.is_default
  returning * into v_membership;

  insert into public.audit_logs(
    id, company_id, action, entity_type, entity_id,
    old_value, new_value, source, user_label, correlation_id, created_at
  )
  values(
    gen_random_uuid(),
    p_company_id,
    'e2e_actor_membership_provisioned',
    'company_membership',
    v_membership.id,
    null,
    jsonb_build_object(
      'companyId', p_company_id,
      'userId', p_user_id,
      'role', v_membership.role,
      'isActive', v_membership.is_active,
      'isDefault', v_membership.is_default
    ),
    'e2e-actor-provisioner',
    'service_role',
    'e2e-provision:' || v_membership.id::text,
    now()
  );

  return v_membership;
end;
$$;

revoke all on function public.provision_e2e_test_membership(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.provision_e2e_test_membership(uuid, uuid, text, boolean) to service_role;
