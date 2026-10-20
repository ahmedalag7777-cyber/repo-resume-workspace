-- Reconcile legacy rendered reports against the durable import checkpoint before issuing an evidence passport.
-- Verification still requires a completed tenant-bound import, matching source fingerprint, secure file record, analysis, and full canonical coverage.
CREATE OR REPLACE FUNCTION public.refresh_report_evidence_passport(p_company_id uuid, p_job_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_job public.report_execution_jobs%ROWTYPE;
  v_rendered jsonb;
  v_import_id text;
  v_import public.import_jobs%ROWTYPE;
  v_source public.file_records%ROWTYPE;
  v_source_version_id uuid;
  v_analysis public.source_analysis_snapshots%ROWTYPE;
  v_entity_type text;
  v_domain text;
  v_commit_count integer := 0;
  v_canonical_count integer := 0;
  v_authoritative_count integer;
  v_quality numeric;
  v_fingerprint text;
  v_snapshot_id uuid;
  v_passport_id uuid;
  v_coverage text;
  v_acceptance text;
  v_verification text;
  v_decision_readiness text;
  v_prior_state text;
  v_evidence jsonb;
BEGIN
  IF p_company_id IS NULL OR p_job_id IS NULL THEN RAISE EXCEPTION 'REPORT_EVIDENCE_PASSPORT_INPUT_REQUIRED'; END IF;
  SELECT * INTO v_job FROM public.report_execution_jobs WHERE id=p_job_id AND company_id=p_company_id FOR UPDATE;
  IF v_job.id IS NULL THEN RAISE EXCEPTION 'REPORT_EVIDENCE_REPORT_JOB_NOT_FOUND'; END IF;
  IF v_job.status <> 'completed' OR coalesce(v_job.checkpoint->>'stage','') <> 'rendered' THEN RAISE EXCEPTION 'REPORT_EVIDENCE_REPORT_NOT_RENDERED'; END IF;
  v_rendered := coalesce(v_job.evidence->'renderedOutput','{}'::jsonb);
  v_import_id := nullif(v_rendered->>'importId','');
  IF v_import_id IS NULL THEN
    SELECT substring(evidence_key.value from 7)
      INTO v_import_id
      FROM jsonb_array_elements_text(coalesce(v_job.checkpoint->'evidenceKeys','[]'::jsonb)) AS evidence_key(value)
      WHERE evidence_key.value LIKE 'import:%'
      LIMIT 1;
  END IF;
  v_prior_state := nullif(v_rendered->>'evidenceStatus','');
  IF v_job.source_hash !~ '^sha256:[0-9a-fA-F]{64}$' THEN RAISE EXCEPTION 'REPORT_EVIDENCE_SOURCE_HASH_INVALID'; END IF;
  BEGIN
    SELECT * INTO v_import FROM public.import_jobs WHERE company_id=p_company_id AND id=nullif(v_import_id,'')::uuid FOR UPDATE;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'REPORT_EVIDENCE_IMPORT_JOB_ID_INVALID';
  END;
  IF v_import.id IS NULL THEN RAISE EXCEPTION 'REPORT_EVIDENCE_IMPORT_JOB_NOT_FOUND'; END IF;
  IF v_import.status <> 'completed' THEN RAISE EXCEPTION 'REPORT_EVIDENCE_IMPORT_NOT_COMPLETED'; END IF;
  IF v_import.source_fingerprint IS DISTINCT FROM v_job.source_hash THEN RAISE EXCEPTION 'REPORT_EVIDENCE_IMPORT_SOURCE_HASH_MISMATCH'; END IF;
  IF v_import.file_record_id IS NULL THEN RAISE EXCEPTION 'REPORT_EVIDENCE_IMPORT_SOURCE_RECORD_MISSING'; END IF;
  SELECT * INTO v_source FROM public.file_records WHERE company_id=p_company_id AND id=v_import.file_record_id AND file_hash=v_job.source_hash LIMIT 1 FOR UPDATE;
  IF v_source.id IS NULL THEN RAISE EXCEPTION 'REPORT_EVIDENCE_SOURCE_FILE_RECORD_HASH_MISMATCH'; END IF;
  IF v_source.security_status <> 'passed' OR v_source.status NOT IN ('ready','processed','verified') THEN RAISE EXCEPTION 'REPORT_EVIDENCE_SOURCE_FILE_SECURITY_PENDING'; END IF;
  SELECT * INTO v_analysis FROM public.source_analysis_snapshots WHERE company_id=p_company_id AND source_hash=v_job.source_hash AND analysis_status='analyzed' AND (import_job_id=v_import.id OR import_job_id IS NULL) ORDER BY (import_job_id=v_import.id) DESC NULLS LAST,created_at DESC,id DESC LIMIT 1;
  IF v_analysis.id IS NULL THEN RAISE EXCEPTION 'REPORT_EVIDENCE_SOURCE_ANALYSIS_MISSING'; END IF;
  v_quality := coalesce(v_analysis.quality_score,0);
  IF v_quality < 70 THEN v_acceptance := 'REVIEW'; ELSE v_acceptance := 'ACCEPTED'; END IF;
  v_entity_type := split_part(v_job.job_key,':',2)||':'||split_part(v_job.job_key,':',3);
  v_domain := split_part(v_job.job_key,':',3);
  SELECT coalesce(sum(c.committed_count),0)::integer INTO v_commit_count FROM public.canonical_import_commits c WHERE c.company_id=p_company_id AND c.entity_type=v_entity_type AND c.source_hash=v_job.source_hash;
  SELECT count(*)::integer INTO v_canonical_count FROM public.canonical_dataset_records cdr WHERE cdr.company_id=p_company_id AND cdr.semantic_domain=v_domain AND cdr.source_hash=v_job.source_hash;
  v_authoritative_count := nullif(v_rendered->>'authoritativeCurrentRowCount','')::integer;
  IF v_authoritative_count IS NULL THEN v_authoritative_count := nullif(v_rendered->>'rowCount','')::integer; END IF;
  IF v_authoritative_count IS NULL
     AND v_import.status = 'completed'
     AND coalesce(v_import.invalid_rows,0) = 0
     AND coalesce(v_import.total_rows,0) > 0
     AND v_import.processed_rows = v_import.total_rows
     AND v_import.valid_rows = v_import.total_rows THEN
    v_authoritative_count := v_import.total_rows;
  END IF;
  IF v_authoritative_count IS NOT NULL
     AND v_commit_count = v_authoritative_count
     AND v_canonical_count = v_authoritative_count
     AND v_analysis.row_count = v_authoritative_count
     AND coalesce(v_import.invalid_rows,0) = 0
     AND v_import.total_rows = v_import.processed_rows
     AND v_import.valid_rows = v_import.total_rows THEN
    v_coverage := 'FULL';
  ELSE
    v_coverage := 'PARTIAL';
  END IF;
  IF v_coverage <> 'FULL' THEN v_acceptance := CASE WHEN v_quality >= 70 THEN 'REVIEW' ELSE 'BLOCKED' END; END IF;
  v_verification := CASE WHEN v_acceptance='ACCEPTED' AND v_coverage='FULL' THEN 'VERIFIED' ELSE 'UNVERIFIED' END;
  v_decision_readiness := CASE WHEN v_verification='VERIFIED' THEN 'READY' WHEN v_coverage='PARTIAL' THEN 'REVIEW' WHEN v_quality<70 THEN 'BLOCKED' ELSE 'REVIEW' END;
  INSERT INTO public.report_source_versions(company_id,source_key,source_path,source_hash,change_kind,tombstone,metadata,evidence)
  VALUES(p_company_id,'report:'||v_job.source_path,v_job.source_path,v_job.source_hash,'unchanged',false,
    jsonb_build_object('reportExecutionJobId',v_job.id,'fileRecordId',v_source.id),
    jsonb_build_object('sourceHash',v_job.source_hash,'securityStatus',v_source.security_status))
  ON CONFLICT(company_id,source_key,source_hash) DO UPDATE SET source_path=excluded.source_path,metadata=report_source_versions.metadata||excluded.metadata,evidence=report_source_versions.evidence||excluded.evidence
  RETURNING id INTO v_source_version_id;
  v_fingerprint := md5(concat_ws('|',v_job.source_hash,v_analysis.id::text,v_commit_count::text,v_canonical_count::text,coalesce(v_authoritative_count,-1)::text,coalesce(v_quality,-1)::text,v_source.id::text));
  v_evidence := jsonb_build_object(
    'verificationMode','DETERMINISTIC_SOURCE_BOUND',
    'reportExecutionJobId',v_job.id,
    'source',jsonb_build_object('path',v_job.source_path,'hash',v_job.source_hash,'fileRecordId',v_source.id,'fileName',v_source.file_name,'detectedFormat',v_source.detected_format,'securityStatus',v_source.security_status),
    'sourceVersion',jsonb_build_object('id',v_source_version_id,'sourceKey','report:'||v_job.source_path,'hash',v_job.source_hash),
    'analysis',jsonb_build_object('snapshotId',v_analysis.id,'status',v_analysis.analysis_status,'qualityScore',v_quality,'rowCount',v_analysis.row_count,'columnCount',v_analysis.column_count,'sourceFormat',v_analysis.source_format),
    'canonical',jsonb_build_object('entityType',v_entity_type,'committedRows',v_commit_count,'canonicalRows',v_canonical_count,'authoritativeRows',v_authoritative_count,'coverage',v_coverage)
  );
  INSERT INTO public.report_evidence_snapshots(company_id,report_execution_job_id,source_version_id,analysis_snapshot_id,source_hash,source_path,canonical_commit_count,canonical_dataset_count,authoritative_row_count,canonical_coverage_status,acceptance_status,verification_status,accepted_at,verified_at,evidence_fingerprint,lineage,evidence)
  VALUES(p_company_id,v_job.id,v_source_version_id,v_analysis.id,v_job.source_hash,v_job.source_path,v_commit_count,v_canonical_count,v_authoritative_count,v_coverage,v_acceptance,v_verification,CASE WHEN v_acceptance='ACCEPTED' THEN clock_timestamp() END,CASE WHEN v_verification='VERIFIED' THEN clock_timestamp() END,v_fingerprint,
    jsonb_build_array(jsonb_build_object('type','SOURCE_VERSION','id',v_source_version_id,'hash',v_job.source_hash),jsonb_build_object('type','ANALYSIS_SNAPSHOT','id',v_analysis.id),jsonb_build_object('type','CANONICAL_COMMIT','entityType',v_entity_type,'rows',v_commit_count),jsonb_build_object('type','CANONICAL_DATASET','domain',v_domain,'rows',v_canonical_count),jsonb_build_object('type','FILE_RECORD','id',v_source.id,'hash',v_source.file_hash)),v_evidence)
  ON CONFLICT(company_id,evidence_fingerprint) DO UPDATE SET acceptance_status=excluded.acceptance_status,verification_status=excluded.verification_status,canonical_coverage_status=excluded.canonical_coverage_status,evidence=excluded.evidence,lineage=excluded.lineage
  RETURNING id INTO v_snapshot_id;
  INSERT INTO public.report_evidence_passports(company_id,report_execution_job_id,source_version_id,evidence_snapshot_id,source_hash,acceptance_status,verification_status,decision_readiness,prior_verification_state,lineage,evidence)
  VALUES(p_company_id,v_job.id,v_source_version_id,v_snapshot_id,v_job.source_hash,v_acceptance,v_verification,v_decision_readiness,CASE WHEN v_prior_state='VERIFIED' AND coalesce(v_rendered->>'evidenceSnapshotId','')='' THEN 'LEGACY_UNRESOLVED' END,jsonb_build_array(jsonb_build_object('type','SOURCE_VERSION','id',v_source_version_id,'hash',v_job.source_hash),jsonb_build_object('type','ANALYSIS_SNAPSHOT','id',v_analysis.id),jsonb_build_object('type','CANONICAL_COMMIT','entityType',v_entity_type,'rows',v_commit_count),jsonb_build_object('type','CANONICAL_DATASET','domain',v_domain,'rows',v_canonical_count),jsonb_build_object('type','FILE_RECORD','id',v_source.id,'hash',v_source.file_hash)),v_evidence)
  ON CONFLICT(company_id,report_execution_job_id,source_hash) DO UPDATE SET source_version_id=excluded.source_version_id,evidence_snapshot_id=excluded.evidence_snapshot_id,acceptance_status=excluded.acceptance_status,verification_status=excluded.verification_status,decision_readiness=excluded.decision_readiness,prior_verification_state=coalesce(public.report_evidence_passports.prior_verification_state,excluded.prior_verification_state),lineage=excluded.lineage,evidence=excluded.evidence,updated_at=clock_timestamp()
  RETURNING id INTO v_passport_id;
  UPDATE public.report_execution_jobs
  SET evidence = evidence || jsonb_build_object(
    'evidencePassport', jsonb_build_object(
      'passportId', v_passport_id,
      'evidenceSnapshotId', v_snapshot_id,
      'acceptanceStatus', v_acceptance,
      'verificationStatus', v_verification,
      'decisionReadiness', v_decision_readiness
    ),
    'renderedOutput', v_rendered || jsonb_build_object(
      'sourceHash', v_job.source_hash,
      'sourceBound', (v_source.file_hash = v_job.source_hash AND v_import.source_fingerprint = v_job.source_hash),
      'sourcePath', v_job.source_path,
      'importId', v_import.id,
      'rowCount', v_authoritative_count,
      'authoritativeCurrentRowCount', v_authoritative_count,
      'qualityScore', v_quality,
      'analysisSnapshotId', v_analysis.id,
      'trustState', CASE WHEN v_verification = 'VERIFIED' THEN 'TRUSTED' WHEN v_quality >= 70 THEN 'REVIEW' ELSE 'BLOCKED' END,
      'evidencePassportId', v_passport_id,
      'evidenceSnapshotId', v_snapshot_id,
      'evidenceAcceptanceStatus', v_acceptance,
      'evidenceVerificationStatus', v_verification,
      'decisionReadiness', v_decision_readiness,
      'evidenceStatus', CASE WHEN v_verification = 'VERIFIED' THEN 'VERIFIED' ELSE 'REVIEW' END
    )
  ), updated_at = clock_timestamp()
  WHERE id=v_job.id AND company_id=p_company_id;
  UPDATE public.report_execution_tasks SET evidence=coalesce(evidence,'{}'::jsonb)||jsonb_build_object('evidencePassportId',v_passport_id,'evidenceSnapshotId',v_snapshot_id,'evidenceAcceptanceStatus',v_acceptance,'evidenceVerificationStatus',v_verification,'decisionReadiness',v_decision_readiness,'legacyPriorVerification',CASE WHEN v_prior_state='VERIFIED' AND coalesce(v_rendered->>'evidenceSnapshotId','')='' THEN true ELSE false END)
  WHERE report_execution_job_id=v_job.id AND company_id=p_company_id AND stage='rendered' AND status='completed';
  RETURN jsonb_build_object('reportJobId',v_job.id,'passportId',v_passport_id,'evidenceSnapshotId',v_snapshot_id,'sourceVersionId',v_source_version_id,'sourceHash',v_job.source_hash,'acceptanceStatus',v_acceptance,'verificationStatus',v_verification,'decisionReadiness',v_decision_readiness,'canonicalCoverage',v_coverage,'legacyPriorVerification',v_prior_state='VERIFIED' AND coalesce(v_rendered->>'evidenceSnapshotId','')='');
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_report_evidence_passport(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_report_evidence_passport(uuid,uuid) TO service_role;
