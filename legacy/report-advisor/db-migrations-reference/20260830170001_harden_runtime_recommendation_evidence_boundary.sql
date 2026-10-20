-- Defense-in-depth for the canonical recommendation creation RPC.
-- The application contract already requires an evidence snapshot; the database
-- boundary must reject direct authenticated RPC calls that omit it.

CREATE OR REPLACE FUNCTION public.create_runtime_recommendation(
  p_category text,
  p_priority text,
  p_title text,
  p_description text DEFAULT NULL::text,
  p_evidence jsonb DEFAULT '{}'::jsonb,
  p_expected_impact numeric DEFAULT NULL::numeric,
  p_evidence_snapshot_id uuid DEFAULT NULL::uuid,
  p_metric_versions jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'RECOMMENDATION_TITLE_REQUIRED';
  END IF;
  IF p_evidence_snapshot_id IS NULL THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVIDENCE_REQUIRED';
  END IF;

  INSERT INTO public.recommendations(
    company_id, category, priority, title, description, evidence,
    expected_impact, confidence, status, evidence_snapshot_id, metric_versions
  )
  VALUES(
    v_company,
    p_category,
    COALESCE(NULLIF(p_priority, ''), 'medium'),
    p_title,
    p_description,
    COALESCE(p_evidence, '{}'::jsonb),
    p_expected_impact,
    'CALCULATED',
    'new',
    p_evidence_snapshot_id,
    COALESCE(p_metric_versions, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_runtime_recommendation(text, text, text, text, jsonb, numeric, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_runtime_recommendation(text, text, text, text, jsonb, numeric, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_runtime_recommendation(text, text, text, text, jsonb, numeric, uuid, jsonb) TO authenticated;
