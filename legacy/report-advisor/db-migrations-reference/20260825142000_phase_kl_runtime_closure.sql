-- Phase K/L runtime closure: all mutations are tenant-scoped, lease-aware and aligned with the canonical Phase L schema.
CREATE OR REPLACE FUNCTION public.advance_report_execution_checkpoint(
  p_job_id uuid, p_worker_id text, p_checkpoint jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  UPDATE report_execution_jobs
  SET checkpoint=p_checkpoint, status='processing', updated_at=now()
  WHERE id=p_job_id AND company_id=public.current_company_id()
    AND lease_owner=p_worker_id AND lease_expires_at > now()
    AND status IN ('leased','processing');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected=1;
END; $$;
GRANT EXECUTE ON FUNCTION public.advance_report_execution_checkpoint(uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_report_execution_job(
  p_job_id uuid, p_worker_id text, p_evidence jsonb DEFAULT '{}'::jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  UPDATE report_execution_jobs
  SET status='completed', evidence=COALESCE(p_evidence,'{}'::jsonb), completed_at=now(), updated_at=now(), lease_owner=null, lease_expires_at=null
  WHERE id=p_job_id AND company_id=public.current_company_id() AND lease_owner=p_worker_id
    AND lease_expires_at > now() AND status IN ('leased','processing');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected=1;
END; $$;
GRANT EXECUTE ON FUNCTION public.complete_report_execution_job(uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.fail_report_execution_job(
  p_job_id uuid, p_worker_id text, p_error jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  UPDATE report_execution_jobs
  SET status=CASE WHEN attempt >= max_attempts THEN 'dead_letter' ELSE 'failed' END,
      last_error=COALESCE(p_error,'{}'::jsonb), updated_at=now(), lease_owner=null, lease_expires_at=null
  WHERE id=p_job_id AND company_id=public.current_company_id() AND lease_owner=p_worker_id
    AND status IN ('leased','processing');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected=1;
END; $$;
GRANT EXECUTE ON FUNCTION public.fail_report_execution_job(uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_control_plane_health(
  p_overall_score numeric, p_evidence_score numeric, p_data_quality_score numeric,
  p_forecast_score numeric, p_decision_score numeric, p_trust_score numeric,
  p_critical_blocker_count integer DEFAULT 0, p_evidence jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result_id uuid;
BEGIN
  INSERT INTO control_plane_health_snapshots(company_id,overall_score,evidence_score,data_quality_score,forecast_score,decision_score,trust_score,critical_blocker_count,evidence)
  VALUES(public.current_company_id(),LEAST(1,GREATEST(0,p_overall_score)),LEAST(1,GREATEST(0,p_evidence_score)),LEAST(1,GREATEST(0,p_data_quality_score)),LEAST(1,GREATEST(0,p_forecast_score)),LEAST(1,GREATEST(0,p_decision_score)),LEAST(1,GREATEST(0,p_trust_score)),GREATEST(0,p_critical_blocker_count),COALESCE(p_evidence,'{}'::jsonb))
  RETURNING id INTO result_id;
  RETURN result_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_control_plane_health(numeric,numeric,numeric,numeric,numeric,numeric,integer,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_executive_evidence_edge(
  p_source_type text, p_source_key text, p_target_type text, p_target_key text,
  p_relation text, p_weight numeric DEFAULT 1, p_evidence jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result_id uuid;
BEGIN
  IF p_relation NOT IN ('supports','derived_from','contradicts','causes','measures','recommends','blocks') THEN RAISE EXCEPTION 'invalid evidence relation'; END IF;
  INSERT INTO executive_evidence_graph(company_id,source_type,source_key,target_type,target_key,relation,weight,evidence)
  VALUES(public.current_company_id(),p_source_type,p_source_key,p_target_type,p_target_key,p_relation,LEAST(1,GREATEST(0,p_weight)),COALESCE(p_evidence,'{}'::jsonb))
  ON CONFLICT(company_id,source_type,source_key,target_type,target_key,relation)
  DO UPDATE SET weight=EXCLUDED.weight,evidence=EXCLUDED.evidence,created_at=now()
  RETURNING id INTO result_id;
  RETURN result_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_executive_evidence_edge(text,text,text,text,text,numeric,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.autonomy_runtime_gate(p_domain_key text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'domain',p_domain_key,
    'eligible',public.can_enter_phase_l_autonomy(p_domain_key),
    'health',public.compute_control_plane_health(),
    'trust_healthy',public.is_continuous_trust_healthy('production'),
    'critical_drift',EXISTS(SELECT 1 FROM control_plane_drift_events d WHERE d.company_id=public.current_company_id() AND d.severity IN ('high','critical') AND d.status IN ('open','blocked'))
  );
$$;
GRANT EXECUTE ON FUNCTION public.autonomy_runtime_gate(text) TO authenticated;
