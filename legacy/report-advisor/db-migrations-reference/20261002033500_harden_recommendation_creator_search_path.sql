-- Harden the canonical recommendation RPC after extending its evidence boundary.
create or replace function public.create_runtime_recommendation(
  p_category text,
  p_priority text,
  p_title text,
  p_description text default null,
  p_evidence jsonb default '{}'::jsonb,
  p_expected_impact numeric default null,
  p_evidence_snapshot_id uuid default null,
  p_metric_versions jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_company is null or v_user is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'RECOMMENDATION_TITLE_REQUIRED';
  end if;

  if p_evidence_snapshot_id is null then
    raise exception 'RECOMMENDATION_EVIDENCE_REQUIRED';
  end if;

  if not (
    exists (select 1 from public.kpi_evidence_snapshots s where s.id = p_evidence_snapshot_id and s.company_id = v_company)
    or exists (select 1 from public.business_state_snapshots s where s.id = p_evidence_snapshot_id and s.company_id = v_company)
    or exists (select 1 from public.import_snapshots s where s.id = p_evidence_snapshot_id and s.company_id = v_company)
    or exists (select 1 from public.operational_health_snapshots s where s.id = p_evidence_snapshot_id and s.company_id = v_company)
    or exists (select 1 from public.source_analysis_snapshots s where s.id = p_evidence_snapshot_id and s.company_id = v_company)
  ) then
    raise exception 'RECOMMENDATION_EVIDENCE_NOT_FOUND_OR_FORBIDDEN';
  end if;

  insert into public.recommendations(
    company_id, category, priority, title, description, evidence, expected_impact,
    confidence, status, evidence_snapshot_id, metric_versions
  )
  values(
    v_company, p_category, coalesce(nullif(p_priority, ''), 'medium'), p_title,
    p_description, coalesce(p_evidence, '{}'::jsonb), p_expected_impact,
    'CALCULATED', 'new', p_evidence_snapshot_id, coalesce(p_metric_versions, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_runtime_recommendation(text,text,text,text,jsonb,numeric,uuid,jsonb) from public, anon;
grant execute on function public.create_runtime_recommendation(text,text,text,text,jsonb,numeric,uuid,jsonb) to authenticated;
