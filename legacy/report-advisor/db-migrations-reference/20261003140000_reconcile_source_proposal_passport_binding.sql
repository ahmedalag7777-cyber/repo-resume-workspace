-- Reconcile legacy source-intelligence decisions/recommendations to the current
-- verified Evidence Passport when source identity is unchanged. No decision status
-- is changed by this repair.
CREATE OR REPLACE FUNCTION public.create_source_intelligence_proposal(
  p_report_job_id uuid,
  p_source_hash text,
  p_signal_id text,
  p_signal_title text,
  p_signal_message text,
  p_severity text,
  p_evidence jsonb,
  p_evidence_snapshot_id uuid
)
RETURNS TABLE(recommendation_id uuid, decision_id uuid, decision_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_decision_key text;
  v_existing public.business_intelligence_decisions%ROWTYPE;
  v_existing_recommendation public.recommendations%ROWTYPE;
  v_recommendation_id uuid;
  v_decision_id uuid;
  v_evidence jsonb;
  v_passport_id uuid;
  v_existing_evidence jsonb;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_report_job_id IS NULL OR nullif(btrim(coalesce(p_source_hash,'')), '') IS NULL THEN RAISE EXCEPTION 'SOURCE_PROPOSAL_IDENTITY_REQUIRED'; END IF;
  IF p_evidence_snapshot_id IS NULL THEN RAISE EXCEPTION 'SOURCE_PROPOSAL_EVIDENCE_REQUIRED'; END IF;

  SELECT p.id INTO v_passport_id
    FROM public.report_evidence_passports p
   WHERE p.company_id = v_company
     AND p.evidence_snapshot_id = p_evidence_snapshot_id
     AND p.report_execution_job_id = p_report_job_id
     AND p.source_hash = p_source_hash
     AND p.verification_status = 'VERIFIED'
     AND p.decision_readiness = 'READY'
   LIMIT 1;
  IF v_passport_id IS NULL THEN RAISE EXCEPTION 'SOURCE_PROPOSAL_EVIDENCE_REQUIRED'; END IF;

  IF nullif(btrim(coalesce(p_signal_id,'')), '') IS NULL OR nullif(btrim(coalesce(p_signal_title,'')), '') IS NULL THEN
    RAISE EXCEPTION 'SOURCE_PROPOSAL_SIGNAL_REQUIRED';
  END IF;

  v_decision_key := 'source-intelligence:' || p_source_hash || ':' || p_signal_id;

  SELECT * INTO v_existing
    FROM public.business_intelligence_decisions d
   WHERE d.company_id = v_company AND d.decision_key = v_decision_key
   FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    v_existing_evidence := coalesce(v_existing.evidence, '{}'::jsonb);

    IF coalesce(v_existing_evidence->>'reportExecutionJobId','') <> p_report_job_id::text
       OR coalesce(v_existing_evidence->>'sourceHash','') <> p_source_hash
       OR coalesce(v_existing_evidence->>'signalId','') <> p_signal_id THEN
      RAISE EXCEPTION 'SOURCE_PROPOSAL_EXISTING_DECISION_IDENTITY_MISMATCH';
    END IF;

    UPDATE public.business_intelligence_decisions
       SET evidence = v_existing_evidence || jsonb_build_object(
         'evidenceSnapshotId', p_evidence_snapshot_id,
         'evidencePassportId', v_passport_id,
         'provenanceReconciledAt', now()
       )
     WHERE id = v_existing.id AND company_id = v_company;

    IF v_existing.recommendation_id IS NULL THEN
      v_evidence := coalesce(p_evidence, '{}'::jsonb) || jsonb_build_object(
        'type','SOURCE_INTELLIGENCE_SIGNAL',
        'reportExecutionJobId',p_report_job_id,
        'sourceHash',p_source_hash,
        'signalId',p_signal_id,
        'signalTitle',p_signal_title,
        'signalMessage',p_signal_message,
        'severity',p_severity,
        'evidenceSnapshotId',p_evidence_snapshot_id,
        'evidencePassportId',v_passport_id,
        'decisionBoundary','PROPOSED_ONLY',
        'confidenceSemantics','NOT_AVAILABLE_UNTIL_VERIFIED_DECISION',
        'repairedLegacyProposal',true
      );
      INSERT INTO public.recommendations(
        company_id, category, priority, title, description, evidence,
        expected_impact, confidence, status, evidence_snapshot_id, metric_versions
      )
      VALUES(
        v_company, 'source-intelligence', coalesce(nullif(p_severity,''),'medium'),
        p_signal_title, p_signal_message,
        v_evidence || jsonb_build_object('recommendationRepairForDecisionId', v_existing.id),
        NULL, 'CALCULATED', 'new', p_evidence_snapshot_id, '{}'::jsonb
      )
      RETURNING id INTO v_recommendation_id;
      PERFORM public.link_recommendation_to_decision(v_recommendation_id, v_existing.id);
      RETURN QUERY SELECT v_recommendation_id, v_existing.id, coalesce(v_existing.status, 'PROPOSED');
      RETURN;
    END IF;

    SELECT * INTO v_existing_recommendation
      FROM public.recommendations r
     WHERE r.company_id = v_company
       AND r.id = v_existing.recommendation_id
       AND r.decision_id = v_existing.id
     FOR UPDATE;

    IF v_existing_recommendation.id IS NULL THEN RAISE EXCEPTION 'SOURCE_PROPOSAL_EXISTING_RECOMMENDATION_MISSING'; END IF;

    v_existing_evidence := coalesce(v_existing_recommendation.evidence, '{}'::jsonb);
    IF coalesce(v_existing_evidence->>'reportExecutionJobId','') <> p_report_job_id::text
       OR coalesce(v_existing_evidence->>'sourceHash','') <> p_source_hash
       OR coalesce(v_existing_evidence->>'signalId','') <> p_signal_id THEN
      RAISE EXCEPTION 'SOURCE_PROPOSAL_EXISTING_RECOMMENDATION_IDENTITY_MISMATCH';
    END IF;

    UPDATE public.recommendations
       SET evidence_snapshot_id = p_evidence_snapshot_id,
           evidence = v_existing_evidence || jsonb_build_object(
             'evidenceSnapshotId', p_evidence_snapshot_id,
             'evidencePassportId', v_passport_id,
             'provenanceReconciledAt', now()
           )
     WHERE id = v_existing_recommendation.id
       AND company_id = v_company
       AND decision_id = v_existing.id;

    RETURN QUERY SELECT v_existing.recommendation_id, v_existing.id, coalesce(v_existing.status, 'PROPOSED');
    RETURN;
  END IF;

  v_evidence := coalesce(p_evidence, '{}'::jsonb) || jsonb_build_object(
    'type','SOURCE_INTELLIGENCE_SIGNAL',
    'reportExecutionJobId',p_report_job_id,
    'sourceHash',p_source_hash,
    'signalId',p_signal_id,
    'signalTitle',p_signal_title,
    'signalMessage',p_signal_message,
    'severity',p_severity,
    'evidenceSnapshotId',p_evidence_snapshot_id,
    'evidencePassportId',v_passport_id,
    'decisionBoundary','PROPOSED_ONLY',
    'confidenceSemantics','NOT_AVAILABLE_UNTIL_VERIFIED_DECISION'
  );

  INSERT INTO public.recommendations(
    company_id, category, priority, title, description, evidence,
    expected_impact, confidence, status, evidence_snapshot_id, metric_versions
  )
  VALUES(
    v_company, 'source-intelligence', coalesce(nullif(p_severity,''),'medium'),
    p_signal_title, p_signal_message, v_evidence,
    NULL, 'CALCULATED', 'new', p_evidence_snapshot_id, '{}'::jsonb
  )
  RETURNING id INTO v_recommendation_id;

  v_evidence := v_evidence || jsonb_build_object('recommendationId', v_recommendation_id);
  v_decision_id := public.create_runtime_decision(
    v_decision_key, 'SOURCE_INTELLIGENCE_SIGNAL', NULL, NULL, v_evidence
  );
  PERFORM public.link_recommendation_to_decision(v_recommendation_id, v_decision_id);

  RETURN QUERY SELECT v_recommendation_id, v_decision_id, 'PROPOSED';
END;
$function$;

REVOKE ALL ON FUNCTION public.create_source_intelligence_proposal(uuid,text,text,text,text,text,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_source_intelligence_proposal(uuid,text,text,text,text,text,jsonb,uuid) TO authenticated;
