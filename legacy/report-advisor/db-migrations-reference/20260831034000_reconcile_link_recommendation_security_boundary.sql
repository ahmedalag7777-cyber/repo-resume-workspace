-- Security boundary reconciliation for the authenticated decision-link RPC.
-- The live staging environment exposes this SECURITY DEFINER function, but the
-- repository did not previously carry an equivalent migration definition.
-- Keep the exposure intentional, tenant-scoped, and search_path-pinned.

CREATE OR REPLACE FUNCTION public.link_recommendation_to_decision(
  p_recommendation_id uuid,
  p_decision_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  v_company_id := public.current_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.recommendations
    WHERE id = p_recommendation_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_intelligence_decisions
    WHERE id = p_decision_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'DECISION_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  UPDATE public.recommendations
  SET decision_id = p_decision_id
  WHERE id = p_recommendation_id
    AND company_id = v_company_id;

  UPDATE public.business_intelligence_decisions
  SET recommendation_id = p_recommendation_id
  WHERE id = p_decision_id
    AND company_id = v_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_recommendation_to_decision(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.link_recommendation_to_decision(uuid, uuid) FROM anon;
