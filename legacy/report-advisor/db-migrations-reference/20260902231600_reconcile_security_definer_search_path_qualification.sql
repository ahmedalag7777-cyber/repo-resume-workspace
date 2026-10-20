-- SECURITY DEFINER functions intentionally run with a locked pg_catalog search_path.
-- Every application relation must therefore be schema-qualified; otherwise the
-- function can fail at runtime with relation-not-found errors.

CREATE OR REPLACE FUNCTION public.can_certify_autonomous_domain(p_domain_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.autonomy_domain_controls c
    WHERE c.company_id = public.current_company_id()
      AND c.domain_key = p_domain_key
      AND c.enabled
      AND c.trust_state = 'eligible'
      AND c.rollback_enabled
  )
  AND public.is_continuous_trust_healthy('production')
  AND NOT EXISTS (
    SELECT 1
    FROM public.control_plane_drift_events d
    WHERE d.company_id = public.current_company_id()
      AND d.severity = 'critical'
      AND d.status IN ('open','blocked')
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_execute_bi_decision(p_decision_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_intelligence_decisions d
    JOIN public.governance_policies p
      ON p.company_id = d.company_id
     AND p.policy_key = d.policy_key
     AND p.status = 'active'
     AND p.effective_at <= now()
     AND (p.expires_at IS NULL OR p.expires_at > now())
    LEFT JOIN public.business_risk_budgets b
      ON b.company_id = d.company_id
     AND b.domain = d.decision_type
     AND b.status = 'active'
    WHERE d.company_id = public.current_company_id()
      AND d.decision_key = p_decision_key
      AND d.status = 'APPROVED'
      AND COALESCE(d.confidence, 0) >= 0.80
      AND COALESCE(jsonb_typeof(d.evidence), 'null') = 'object'
      AND (b.id IS NULL OR b.consumed_risk < b.max_risk)
  )
  AND public.is_continuous_trust_healthy('production');
$function$;

CREATE OR REPLACE FUNCTION public.can_execute_control_plane_run(p_run_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.control_plane_optimization_runs r
    WHERE r.company_id = public.current_company_id()
      AND r.run_key = p_run_key
      AND r.status = 'approved'
      AND r.risk_budget IS NOT NULL
      AND r.risk_budget >= 0
      AND r.liquidity_reserved IS NOT NULL
      AND r.liquidity_reserved >= 0
      AND r.service_level_target IS NOT NULL
      AND r.service_level_target >= 0
      AND jsonb_typeof(r.evidence) = 'object'
      AND jsonb_typeof(r.evidence->'source_refs') = 'array'
      AND jsonb_array_length(r.evidence->'source_refs') > 0
  )
  AND public.is_continuous_trust_healthy('production')
  AND NOT EXISTS (
    SELECT 1
    FROM public.control_plane_drift_events d
    WHERE d.company_id = public.current_company_id()
      AND d.status IN ('open','blocked')
      AND d.severity = 'critical'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_continuous_trust_healthy(p_certificate_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT public.is_trust_certificate_valid(p_certificate_key)
    AND NOT EXISTS (
      SELECT 1 FROM public.tenant_isolation_canary_runs
      WHERE company_id = public.current_company_id()
        AND status IN ('failed','blocked')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.billing_liveness_probes
      WHERE company_id = public.current_company_id()
        AND status IN ('failed','blocked')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.artifact_verification_runs
      WHERE company_id = public.current_company_id()
        AND status IN ('failed','blocked')
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_trust_certificate_valid(p_certificate_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.trust_certifications
    WHERE company_id = public.current_company_id()
      AND certificate_key = p_certificate_key
      AND status = 'valid'
      AND blocker_count = 0
      AND expires_at > now()
  );
$function$;
