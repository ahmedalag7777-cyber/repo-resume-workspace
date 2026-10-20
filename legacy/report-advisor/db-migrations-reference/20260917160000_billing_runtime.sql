begin;

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  monthly_amount_minor bigint,
  currency text,
  interval text not null default 'month' check (interval in ('month','year')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (monthly_amount_minor is null or monthly_amount_minor >= 0),
  check (currency is null or length(currency) between 3 and 3)
);

create table if not exists public.billing_plan_capabilities (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.billing_plans(id) on delete cascade,
  capability text not null,
  enabled boolean not null default true,
  monthly_limit numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(plan_id, capability),
  check (length(trim(capability)) > 0),
  check (monthly_limit is null or monthly_limit >= 0)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  status text not null check (status in ('trialing','active','past_due','paused','cancelled','expired')),
  provider text not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  started_at timestamptz not null default clock_timestamp(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (current_period_end is null or current_period_start is null or current_period_end > current_period_start),
  check (grace_ends_at is null or current_period_end is null or grace_ends_at >= current_period_end)
);

create table if not exists public.billing_usage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  capability text not null,
  quantity numeric not null,
  period_start date not null,
  idempotency_key text not null,
  source text not null default 'app',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  unique(company_id, period_start, idempotency_key),
  check (quantity > 0),
  check (length(trim(capability)) > 0),
  check (length(trim(idempotency_key)) > 0)
);

create table if not exists public.billing_subscription_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  from_status text,
  to_status text,
  payload_hash text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  unique(provider, provider_event_id)
);

create index if not exists billing_plan_capabilities_plan_idx on public.billing_plan_capabilities(plan_id);
create index if not exists billing_subscriptions_company_status_idx on public.billing_subscriptions(company_id, status);
create index if not exists billing_usage_events_company_capability_period_idx on public.billing_usage_events(company_id, capability, period_start);
create index if not exists billing_subscription_events_company_time_idx on public.billing_subscription_events(company_id, occurred_at desc);

alter table public.billing_plans enable row level security;
alter table public.billing_plan_capabilities enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_usage_events enable row level security;
alter table public.billing_subscription_events enable row level security;

drop policy if exists billing_plans_member_select on public.billing_plans;
create policy billing_plans_member_select on public.billing_plans
  for select to authenticated using (
    exists (
      select 1 from public.company_memberships m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );

drop policy if exists billing_plan_capabilities_member_select on public.billing_plan_capabilities;
create policy billing_plan_capabilities_member_select on public.billing_plan_capabilities
  for select to authenticated using (
    exists (
      select 1 from public.company_memberships m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );

drop policy if exists billing_subscriptions_tenant_select on public.billing_subscriptions;
create policy billing_subscriptions_tenant_select on public.billing_subscriptions
  for select to authenticated using (company_id = public.current_company_id());

drop policy if exists billing_usage_events_tenant_select on public.billing_usage_events;
create policy billing_usage_events_tenant_select on public.billing_usage_events
  for select to authenticated using (company_id = public.current_company_id());

drop policy if exists billing_subscription_events_tenant_select on public.billing_subscription_events;
create policy billing_subscription_events_tenant_select on public.billing_subscription_events
  for select to authenticated using (company_id = public.current_company_id());

create or replace function public.billing_current_subscription()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_company_id uuid := public.current_company_id();
  v_row record;
begin
  if auth.uid() is null or v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  select s.id, s.company_id, s.plan_id, s.status, s.provider, s.current_period_start,
         s.current_period_end, s.trial_ends_at, s.grace_ends_at, s.cancel_at_period_end,
         p.code as plan_code, p.name as plan_name, p.monthly_amount_minor, p.currency, p.interval
    into v_row
    from public.billing_subscriptions s
    join public.billing_plans p on p.id = s.plan_id
   where s.company_id = v_company_id;

  if not found then
    return jsonb_build_object('status','NOT_CONFIGURED','company_id',v_company_id);
  end if;

  return jsonb_build_object(
    'status', v_row.status,
    'company_id', v_row.company_id,
    'subscription_id', v_row.id,
    'plan_id', v_row.plan_id,
    'plan_code', v_row.plan_code,
    'plan_name', v_row.plan_name,
    'provider', v_row.provider,
    'current_period_start', v_row.current_period_start,
    'current_period_end', v_row.current_period_end,
    'trial_ends_at', v_row.trial_ends_at,
    'grace_ends_at', v_row.grace_ends_at,
    'cancel_at_period_end', v_row.cancel_at_period_end,
    'monthly_amount_minor', v_row.monthly_amount_minor,
    'currency', v_row.currency,
    'interval', v_row.interval
  );
end;
$function$;

create or replace function public.billing_check_entitlement(
  p_capability text,
  p_quantity numeric default 1
)
returns table(
  company_id uuid,
  capability text,
  allowed boolean,
  reason text,
  plan_code text,
  enabled boolean,
  monthly_limit numeric,
  used numeric
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_company_id uuid := public.current_company_id();
  v_status text;
  v_plan_id uuid;
  v_plan_code text;
  v_enabled boolean;
  v_limit numeric;
  v_used numeric := 0;
  v_period_start date := date_trunc('month', current_date)::date;
  v_grace_ends_at timestamptz;
begin
  if auth.uid() is null or v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'BILLING_QUANTITY_INVALID';
  end if;

  select s.status, s.plan_id, s.grace_ends_at, p.code
    into v_status, v_plan_id, v_grace_ends_at, v_plan_code
    from public.billing_subscriptions s
    join public.billing_plans p on p.id = s.plan_id and p.active = true
   where s.company_id = v_company_id;

  if not found then
    return query select v_company_id, p_capability, false, 'SUBSCRIPTION_NOT_CONFIGURED', null::text, false, null::numeric, 0::numeric;
    return;
  end if;

  select c.enabled, c.monthly_limit
    into v_enabled, v_limit
    from public.billing_plan_capabilities c
   where c.plan_id = v_plan_id and c.capability = p_capability;

  if not found then
    return query select v_company_id, p_capability, false, 'CAPABILITY_NOT_CONFIGURED', v_plan_code, false, null::numeric, 0::numeric;
    return;
  end if;

  select coalesce(sum(quantity),0)
    into v_used
    from public.billing_usage_events
   where company_id = v_company_id and capability = p_capability and period_start = v_period_start;

  if v_status = 'active' or v_status = 'trialing' then
    null;
  elsif v_status = 'past_due' and v_grace_ends_at is not null and v_grace_ends_at >= clock_timestamp() then
    null;
  else
    return query select v_company_id, p_capability, false, upper(v_status), v_plan_code, v_enabled, v_limit, v_used;
    return;
  end if;

  if not v_enabled then
    return query select v_company_id, p_capability, false, 'CAPABILITY_DISABLED', v_plan_code, v_enabled, v_limit, v_used;
  elsif v_limit is not null and v_used + p_quantity > v_limit then
    return query select v_company_id, p_capability, false, 'QUOTA_EXCEEDED', v_plan_code, v_enabled, v_limit, v_used;
  else
    return query select v_company_id, p_capability, true, 'ACTIVE', v_plan_code, v_enabled, v_limit, v_used;
  end if;
end;
$function$;

create or replace function public.billing_record_usage(
  p_capability text,
  p_quantity numeric,
  p_idempotency_key text,
  p_source text default 'app',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_company_id uuid := public.current_company_id();
  v_period_start date := date_trunc('month', current_date)::date;
  v_decision record;
  v_existing public.billing_usage_events%rowtype;
  v_row public.billing_usage_events%rowtype;
begin
  if auth.uid() is null or v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'BILLING_QUANTITY_INVALID';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'BILLING_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into v_existing
    from public.billing_usage_events
   where company_id = v_company_id and period_start = v_period_start and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.capability <> p_capability or v_existing.quantity <> p_quantity then
      raise exception 'BILLING_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('status','IDEMPOTENT_REPLAY','id',v_existing.id,'company_id',v_existing.company_id,'capability',v_existing.capability,'quantity',v_existing.quantity,'period_start',v_existing.period_start);
  end if;

  select * into v_decision from public.billing_check_entitlement(p_capability, p_quantity) limit 1;
  if not v_decision.allowed then
    raise exception 'ENTITLEMENT_DENIED:%', v_decision.reason;
  end if;

  insert into public.billing_usage_events(company_id, capability, quantity, period_start, idempotency_key, source, metadata)
  values(v_company_id, p_capability, p_quantity, v_period_start, trim(p_idempotency_key), coalesce(nullif(trim(p_source),''),'app'), coalesce(p_metadata,'{}'::jsonb))
  returning * into v_row;

  return jsonb_build_object('status','RECORDED','id',v_row.id,'company_id',v_row.company_id,'capability',v_row.capability,'quantity',v_row.quantity,'period_start',v_row.period_start,'idempotency_key',v_row.idempotency_key);
end;
$function$;

create or replace function public.billing_set_subscription(
  p_plan_id uuid,
  p_status text,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_trial_ends_at timestamptz default null,
  p_grace_ends_at timestamptz default null,
  p_cancel_at_period_end boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_company_id uuid := public.current_company_id();
  v_row public.billing_subscriptions%rowtype;
  v_role text;
begin
  if auth.uid() is null or v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  select role into v_role from public.company_memberships where company_id = v_company_id and user_id = auth.uid() and is_active = true limit 1;
  if coalesce(v_role,'') <> 'admin' then raise exception 'BILLING_ADMIN_REQUIRED'; end if;
  if p_status not in ('trialing','active','past_due','paused','cancelled','expired') then raise exception 'BILLING_STATUS_INVALID'; end if;
  if not exists (select 1 from public.billing_plans where id = p_plan_id and active = true) then raise exception 'BILLING_PLAN_NOT_FOUND'; end if;

  insert into public.billing_subscriptions(company_id, plan_id, status, current_period_start, current_period_end, trial_ends_at, grace_ends_at, cancel_at_period_end)
  values(v_company_id, p_plan_id, p_status, p_current_period_start, p_current_period_end, p_trial_ends_at, p_grace_ends_at, p_cancel_at_period_end)
  on conflict(company_id) do update set
    plan_id = excluded.plan_id,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    trial_ends_at = excluded.trial_ends_at,
    grace_ends_at = excluded.grace_ends_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = clock_timestamp()
  returning * into v_row;

  insert into public.billing_subscription_events(company_id, subscription_id, provider, provider_event_id, event_type, to_status, payload)
  values(v_company_id, v_row.id, v_row.provider, 'manual:' || v_row.id::text || ':' || extract(epoch from clock_timestamp())::bigint, 'MANUAL_SUBSCRIPTION_UPDATE', v_row.status, '{}'::jsonb);

  return jsonb_build_object('status','UPDATED','subscription_id',v_row.id,'company_id',v_row.company_id,'plan_id',v_row.plan_id,'subscription_status',v_row.status);
end;
$function$;

grant execute on function public.billing_current_subscription() to authenticated;
grant execute on function public.billing_check_entitlement(text,numeric) to authenticated;
grant execute on function public.billing_record_usage(text,numeric,text,text,jsonb) to authenticated;
grant execute on function public.billing_set_subscription(uuid,text,timestamptz,timestamptz,timestamptz,timestamptz,boolean) to authenticated;

commit;
