-- Repair the legacy source-intelligence recommendation that predates the
-- evidenceSnapshotId/evidencePassportId provenance boundary.
--
-- The live refresh RPC already enforces the same tenant/evidence rules; this
-- migration only routes the affected legacy rows through that trusted repair
-- path. It never fabricates an evidence snapshot.

DO $$
DECLARE
  r record;
  v_user uuid;
BEGIN
  FOR r IN
    SELECT
      rec.id,
      rec.company_id,
      rec.evidence->>'reportExecutionJobId' AS job_id,
      rec.evidence->>'sourceHash' AS source_hash,
      p.evidence_snapshot_id
    FROM public.recommendations rec
    JOIN public.report_evidence_passports p
      ON p.company_id = rec.company_id
     AND p.report_execution_job_id = NULLIF(rec.evidence->>'reportExecutionJobId','')::uuid
     AND p.source_hash = NULLIF(TRIM(rec.evidence->>'sourceHash'),'')
     AND p.verification_status = 'VERIFIED'
     AND p.decision_readiness = 'READY'
    WHERE LOWER(COALESCE(rec.category,'')) = 'source-intelligence'
      AND rec.evidence_snapshot_id IS NULL
      AND NULLIF(rec.evidence->>'reportExecutionJobId','') IS NOT NULL
      AND NULLIF(TRIM(rec.evidence->>'sourceHash'),'') IS NOT NULL
  LOOP
    SELECT m.user_id
      INTO v_user
      FROM public.company_memberships m
     WHERE m.company_id = r.company_id
       AND m.is_active = true
     ORDER BY m.is_default DESC, (m.role = 'admin') DESC, m.created_at
     LIMIT 1;

    IF v_user IS NULL THEN
      RAISE EXCEPTION 'SOURCE_PROVENANCE_REPAIR_AUTHORITY_MISSING:%', r.company_id;
    END IF;

    PERFORM set_config(
      'request.jwt.claims',
      json_build_object(
        'sub', v_user,
        'role', 'authenticated'
      )::text,
      true
    );

    -- This function is the governed provenance repair boundary. It verifies
    -- the current tenant, the live VERIFIED/READY passport, and source identity
    -- before touching the recommendation.
    PERFORM public.refresh_source_intelligence_recommendation_evidence(
      r.id,
      r.job_id::uuid,
      r.source_hash,
      r.evidence_snapshot_id
    );
  END LOOP;
END $$;
