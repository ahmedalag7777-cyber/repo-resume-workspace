-- Reconcile repository function definitions with the already-verified staging
-- SECURITY DEFINER runtime surface. No new RPCs are introduced and no grants are
-- changed here; this is a forward-only source-parity repair.
--
-- Canonical staging verification on 2026-09-18 showed these functions already
-- running with SET search_path TO 'public', 'pg_catalog'. The repository's
-- latest historical definitions had drifted from that live-safe state, causing
-- the exact-head security-definer certification contract to fail.

CREATE OR REPLACE FUNCTION public.create_decision_work_item(
  p_decision_id uuid,
  p_recommendation_id uuid,
  p_department text,
  p_assignee_id uuid,
  p_assignee_label text,
  p_title text,
  p_description text,
  p_priority text,
  p_due_at timestamp with time zone,
  p_expected_impact numeric,
  p_evidence_refs jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_company is null or v_user is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.company_memberships m
    where m.company_id = v_company
      and m.user_id = v_user
      and m.is_active = true
      and lower(m.role) in ('owner','admin','administrator')
  ) then
    raise exception 'WORK_ITEM_MUTATION_FORBIDDEN';
  end if;

  if not exists (
    select 1
    from public.business_intelligence_decisions d
    where d.id = p_decision_id
      and d.company_id = v_company
      and d.status = 'APPROVED'
  ) then
    raise exception 'DECISION_NOT_APPROVED';
  end if;

  if p_recommendation_id is not null
     and not exists (
       select 1
       from public.recommendations r
       where r.id = p_recommendation_id
         and r.company_id = v_company
         and r.decision_id = p_decision_id
     ) then
    raise exception 'RECOMMENDATION_NOT_FOUND_OR_NOT_LINKED';
  end if;

  if p_assignee_id is null then
    raise exception 'WORK_ITEM_OWNER_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.company_memberships m
    where m.company_id = v_company
      and m.user_id = p_assignee_id
      and m.is_active = true
  ) then
    raise exception 'ASSIGNEE_NOT_ACTIVE_TENANT_MEMBER';
  end if;

  if p_assignee_label is null or btrim(p_assignee_label) = '' then
    raise exception 'WORK_ITEM_OWNER_LABEL_REQUIRED';
  end if;

  if p_department is null or btrim(p_department) = '' then
    raise exception 'WORK_ITEM_DEPARTMENT_REQUIRED';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'WORK_ITEM_TITLE_REQUIRED';
  end if;

  if p_priority not in ('LOW','MEDIUM','HIGH','CRITICAL') then
    raise exception 'INVALID_WORK_ITEM_PRIORITY';
  end if;

  if p_evidence_refs is null
     or jsonb_typeof(p_evidence_refs) <> 'array'
     or jsonb_array_length(p_evidence_refs) = 0 then
    raise exception 'WORK_ITEM_EVIDENCE_REQUIRED';
  end if;

  insert into public.decision_work_items(
    company_id,
    decision_id,
    recommendation_id,
    department,
    assignee_id,
    assignee_label,
    title,
    description,
    priority,
    due_at,
    expected_impact,
    evidence_refs
  )
  values(
    v_company,
    p_decision_id,
    p_recommendation_id,
    p_department,
    p_assignee_id,
    p_assignee_label,
    p_title,
    p_description,
    p_priority,
    p_due_at,
    p_expected_impact,
    p_evidence_refs
  )
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_runtime_decision(
  p_decision_key text,
  p_decision_type text,
  p_confidence numeric,
  p_expected_impact numeric,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_decision_key IS NULL OR btrim(p_decision_key)='' THEN
    RAISE EXCEPTION 'DECISION_KEY_REQUIRED';
  END IF;
  IF p_decision_type IS NULL OR btrim(p_decision_type)='' THEN
    RAISE EXCEPTION 'DECISION_TYPE_REQUIRED';
  END IF;
  IF p_confidence IS NULL OR p_confidence < 0 OR p_confidence > 1 THEN
    RAISE EXCEPTION 'DECISION_CONFIDENCE_OUT_OF_RANGE';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence) <> 'object' OR p_evidence = '{}'::jsonb THEN
    RAISE EXCEPTION 'DECISION_EVIDENCE_REQUIRED';
  END IF;

  INSERT INTO public.business_intelligence_decisions(
    company_id,
    decision_key,
    decision_type,
    status,
    confidence,
    expected_impact,
    evidence
  )
  VALUES(
    v_company,
    p_decision_key,
    p_decision_type,
    'PROPOSED',
    p_confidence,
    p_expected_impact,
    p_evidence
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decide_approval(
  p_approval_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_decision uuid;
  v_decision_status text;
  v_status text;
  v_requested_by uuid;
begin
  if v_company is null or v_user is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = v_company
      and cm.user_id = v_user
      and cm.is_active
      and cm.role in ('owner','admin')
  ) then
    raise exception 'APPROVAL_ROLE_FORBIDDEN';
  end if;

  select decision_id
    into v_decision
  from public.decision_approvals
  where id = p_approval_id
    and company_id = v_company;

  if v_decision is null then
    raise exception 'APPROVAL_NOT_FOUND';
  end if;

  select status
    into v_decision_status
  from public.business_intelligence_decisions
  where id = v_decision
    and company_id = v_company
  for update;

  if v_decision_status is distinct from 'PROPOSED' then
    raise exception 'DECISION_STATE_CHANGED';
  end if;

  select status, requested_by
    into v_status, v_requested_by
  from public.decision_approvals
  where id = p_approval_id
    and company_id = v_company
  for update;

  if v_status <> 'PENDING' then
    raise exception 'APPROVAL_NOT_PENDING';
  end if;

  if p_approve and v_requested_by = v_user then
    raise exception 'SELF_APPROVAL_FORBIDDEN';
  end if;

  update public.decision_approvals
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      decided_at = now(),
      decided_by = v_user,
      reason = p_reason
  where id = p_approval_id
    and company_id = v_company
    and status = 'PENDING';

  if not found then
    raise exception 'APPROVAL_STATE_CHANGED';
  end if;

  update public.business_intelligence_decisions
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      approved_by = case when p_approve then v_user else null end,
      approved_at = case when p_approve then now() else null end,
      rejection_reason = case when p_approve then null else p_reason end
  where id = v_decision
    and company_id = v_company
    and status = 'PROPOSED';

  if not found then
    raise exception 'DECISION_STATE_CHANGED';
  end if;

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.link_recommendation_to_decision(
  p_recommendation_id uuid,
  p_decision_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_company_id uuid;
  v_recommendation_company uuid;
  v_recommendation_decision uuid;
  v_decision_company uuid;
  v_decision_recommendation uuid;
begin
  v_company_id := public.current_company_id();

  if auth.uid() is null or v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  select company_id, decision_id
    into v_recommendation_company, v_recommendation_decision
  from public.recommendations
  where id = p_recommendation_id
    and company_id = v_company_id
  for update;

  if not found then
    raise exception 'RECOMMENDATION_NOT_FOUND_OR_FORBIDDEN';
  end if;

  select company_id, recommendation_id
    into v_decision_company, v_decision_recommendation
  from public.business_intelligence_decisions
  where id = p_decision_id
    and company_id = v_company_id
  for update;

  if not found then
    raise exception 'DECISION_NOT_FOUND_OR_FORBIDDEN';
  end if;

  if v_recommendation_decision is not null
     and v_recommendation_decision <> p_decision_id then
    raise exception 'RECOMMENDATION_ALREADY_LINKED';
  end if;

  if v_decision_recommendation is not null
     and v_decision_recommendation <> p_recommendation_id then
    raise exception 'DECISION_ALREADY_LINKED';
  end if;

  update public.recommendations
  set decision_id = p_decision_id
  where id = p_recommendation_id
    and company_id = v_company_id;

  update public.business_intelligence_decisions
  set recommendation_id = p_recommendation_id
  where id = p_decision_id
    and company_id = v_company_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_decision_work_item(
  p_work_item_id uuid,
  p_title text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF NOT EXISTS(
    SELECT 1
    FROM public.decision_work_items w
    WHERE w.id = p_work_item_id
      AND w.company_id = v_company
  ) THEN
    RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  INSERT INTO public.alerts(
    company_id,
    severity,
    category,
    title,
    description,
    entity_type,
    entity_id
  )
  VALUES(
    v_company,
    'info',
    'decision_action',
    p_title,
    p_description,
    'decision_work_item',
    p_work_item_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_recommendation_outcome(
  p_recommendation_key text,
  p_observed_at timestamp with time zone,
  p_expected_impact numeric DEFAULT NULL::numeric,
  p_actual_impact numeric DEFAULT NULL::numeric,
  p_outcome_quality numeric DEFAULT NULL::numeric,
  p_status text DEFAULT 'insufficient'::text,
  p_decision_id uuid DEFAULT NULL::uuid,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_company uuid:=public.current_company_id();
  v_user uuid:=auth.uid();
  v_id uuid;
  v_recommendation_id uuid;
  v_recommendation_decision uuid;
  v_decision_id uuid;
  v_evidence_snapshot_id text:=nullif(btrim(coalesce(p_evidence->>'evidence_snapshot_id','')),'');
begin
  if v_company is null or v_user is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  if p_recommendation_key is null
     or btrim(p_recommendation_key)=''
     or p_observed_at is null then
    raise exception 'OUTCOME_IDENTITY_INCOMPLETE';
  end if;

  select r.id, r.decision_id
    into v_recommendation_id, v_recommendation_decision
  from public.recommendations r
  where r.id::text = p_recommendation_key
    and r.company_id = v_company;

  if v_recommendation_id is null then
    select d.id
      into v_decision_id
    from public.business_intelligence_decisions d
    where d.decision_key = p_recommendation_key
      and d.company_id = v_company;

    if v_decision_id is null then
      raise exception 'OUTCOME_PROVENANCE_NOT_FOUND';
    end if;
  else
    if v_recommendation_decision is not null then
      v_decision_id := v_recommendation_decision;
    end if;
  end if;

  if p_decision_id is not null then
    if not exists(
      select 1
      from public.business_intelligence_decisions d
      where d.id = p_decision_id
        and d.company_id = v_company
    ) then
      raise exception 'DECISION_NOT_FOUND_OR_FORBIDDEN';
    end if;

    if v_decision_id is not null and v_decision_id <> p_decision_id then
      raise exception 'RECOMMENDATION_DECISION_MISMATCH';
    end if;

    v_decision_id := p_decision_id;
  end if;

  if v_decision_id is null then
    raise exception 'DECISION_PROVENANCE_REQUIRED';
  end if;

  if not exists(
    select 1
    from public.business_intelligence_decisions d
    where d.id = v_decision_id
      and d.company_id = v_company
      and d.status = 'APPROVED'
  ) then
    raise exception 'OUTCOME_DECISION_NOT_APPROVED_OR_FORBIDDEN';
  end if;

  if not exists(
    select 1
    from public.decision_work_items w
    where w.decision_id = v_decision_id
      and w.company_id = v_company
      and w.status = 'COMPLETED'
  ) then
    raise exception 'OUTCOME_WORK_NOT_COMPLETED';
  end if;

  if v_evidence_snapshot_id is null then
    raise exception 'OUTCOME_EVIDENCE_REQUIRED';
  end if;

  if not (
    exists(
      select 1 from public.kpi_evidence_snapshots s
      where s.id::text = v_evidence_snapshot_id
        and s.company_id = v_company
    )
    or exists(
      select 1 from public.business_state_snapshots s
      where s.id::text = v_evidence_snapshot_id
        and s.company_id = v_company
    )
    or exists(
      select 1 from public.import_snapshots s
      where s.id::text = v_evidence_snapshot_id
        and s.company_id = v_company
    )
    or exists(
      select 1 from public.operational_health_snapshots s
      where s.id::text = v_evidence_snapshot_id
        and s.company_id = v_company
    )
    or exists(
      select 1 from public.decision_action_receipts r
      where r.id::text = v_evidence_snapshot_id
        and r.company_id = v_company
        and r.status = 'SUCCEEDED'
    )
  ) then
    raise exception 'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN';
  end if;

  if p_status not in ('positive','negative','neutral','insufficient') then
    raise exception 'INVALID_OUTCOME_STATUS';
  end if;

  if p_status in ('positive','negative','neutral')
     and (p_expected_impact is null or p_actual_impact is null) then
    raise exception 'OUTCOME_VALUES_REQUIRED_FOR_KNOWN_STATUS';
  end if;

  if p_outcome_quality is not null
     and (p_outcome_quality < 0 or p_outcome_quality > 1) then
    raise exception 'OUTCOME_QUALITY_OUT_OF_RANGE';
  end if;

  insert into public.recommendation_outcomes(
    company_id,
    recommendation_key,
    decision_id,
    observed_at,
    expected_impact,
    actual_impact,
    outcome_quality,
    status,
    evidence
  )
  values(
    v_company,
    p_recommendation_key,
    v_decision_id,
    p_observed_at,
    p_expected_impact,
    p_actual_impact,
    p_outcome_quality,
    p_status,
    coalesce(p_evidence,'{}'::jsonb)
  )
  on conflict(company_id,recommendation_key) do update set
    decision_id = excluded.decision_id,
    observed_at = excluded.observed_at,
    expected_impact = excluded.expected_impact,
    actual_impact = excluded.actual_impact,
    outcome_quality = excluded.outcome_quality,
    status = excluded.status,
    evidence = excluded.evidence
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_decision_approval(
  p_decision_id uuid,
  p_reason text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_company uuid := public.current_company_id();
  v_id uuid;
  v_user uuid := auth.uid();
  v_existing_status text;
  v_decision_status text;
begin
  if v_company is null or v_user is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  select d.status
    into v_decision_status
  from public.business_intelligence_decisions d
  where d.id = p_decision_id
    and d.company_id = v_company
  for update;

  if v_decision_status is distinct from 'PROPOSED' then
    raise exception 'DECISION_NOT_APPROVABLE';
  end if;

  select a.status
    into v_existing_status
  from public.decision_approvals a
  where a.company_id = v_company
    and a.decision_id = p_decision_id
  for update;

  if v_existing_status in ('APPROVED','REJECTED','CANCELLED') then
    raise exception 'APPROVAL_TERMINAL_NOT_REOPENABLE';
  end if;

  insert into public.decision_approvals(
    company_id,
    decision_id,
    status,
    requested_by,
    reason
  )
  values(
    v_company,
    p_decision_id,
    'PENDING',
    v_user,
    p_reason
  )
  on conflict(company_id,decision_id) do update
  set status = 'PENDING',
      requested_by = excluded.requested_by,
      reason = excluded.reason,
      requested_at = now(),
      decided_at = null,
      decided_by = null
  where public.decision_approvals.status not in ('APPROVED','REJECTED','CANCELLED')
  returning id into v_id;

  if v_id is null then
    raise exception 'APPROVAL_TERMINAL_NOT_REOPENABLE';
  end if;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.retry_report_execution_job(
  p_job_id uuid,
  p_company_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  affected integer;
  v_company_id uuid := public.current_company_id();
  v_is_service_role boolean := COALESCE(auth.jwt()->>'role','') = 'service_role';
BEGIN
  IF NOT v_is_service_role AND (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATED_USER_REQUIRED';
  END IF;

  IF p_company_id IS NULL OR p_job_id IS NULL THEN
    RAISE EXCEPTION 'REPORT_EXECUTION_RETRY_INPUT_INVALID';
  END IF;

  IF NOT v_is_service_role
     AND (v_company_id IS NULL OR p_company_id IS DISTINCT FROM v_company_id) THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;

  UPDATE public.report_execution_jobs
  SET status = 'queued',
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_error = '{}'::jsonb,
      completed_at = null,
      updated_at = clock_timestamp()
  WHERE id = p_job_id
    AND company_id = p_company_id
    AND status = 'failed'
    AND attempt < max_attempts;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$function$;
