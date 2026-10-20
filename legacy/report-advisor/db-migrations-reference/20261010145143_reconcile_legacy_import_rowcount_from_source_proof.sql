-- Repair only legacy completed imports whose counters are zero but whose
-- source hash, secured file record, rendered row count, analysis snapshot,
-- canonical commit count, and canonical dataset count agree exactly.
WITH candidate_proofs AS (
  SELECT
    i.id AS import_job_id,
    i.company_id,
    j.id AS report_job_id,
    j.source_hash,
    j.source_path,
    row_proof.proven_rows,
    a.id AS analysis_snapshot_id,
    a.row_count AS analysis_rows,
    a.quality_score,
    f.id AS file_record_id,
    f.file_hash,
    f.security_status,
    f.status AS file_status,
    commits.committed_rows,
    canonical.canonical_rows
  FROM public.report_execution_jobs j
  CROSS JOIN LATERAL (
    SELECT
      COALESCE(
        NULLIF(j.evidence->'renderedOutput'->>'authoritativeCurrentRowCount', ''),
        NULLIF(j.evidence->'renderedOutput'->>'rowCount', '')
      ) AS row_count_text,
      COALESCE(
        NULLIF(j.evidence->'renderedOutput'->>'importId', ''),
        (
          SELECT substring(k.value FROM 8)
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(j.checkpoint->'evidenceKeys') = 'array'
                THEN j.checkpoint->'evidenceKeys'
              ELSE '[]'::jsonb
            END
          ) AS k(value)
          WHERE k.value LIKE 'import:%'
          LIMIT 1
        )
      ) AS import_id_text
  ) AS refs
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN refs.row_count_text ~ '^[1-9][0-9]*$'
      THEN refs.row_count_text::integer
      ELSE NULL
    END AS proven_rows
  ) AS row_proof
  JOIN public.import_jobs i
    ON i.id::text = refs.import_id_text
   AND i.company_id = j.company_id
  JOIN public.file_records f
    ON f.id = i.file_record_id
   AND f.company_id = i.company_id
  JOIN LATERAL (
    SELECT a0.id, a0.row_count, a0.quality_score
    FROM public.source_analysis_snapshots a0
    WHERE a0.company_id = j.company_id
      AND a0.source_hash = j.source_hash
      AND a0.analysis_status = 'analyzed'
      AND (a0.import_job_id = i.id OR a0.import_job_id IS NULL)
    ORDER BY (a0.import_job_id = i.id) DESC NULLS LAST,
             a0.created_at DESC,
             a0.id DESC
    LIMIT 1
  ) AS a ON TRUE
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(c.committed_count), 0)::integer AS committed_rows
    FROM public.canonical_import_commits c
    WHERE c.company_id = j.company_id
      AND c.source_hash = j.source_hash
      AND c.entity_type = split_part(j.job_key, ':', 2) || ':' || split_part(j.job_key, ':', 3)
  ) AS commits ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS canonical_rows
    FROM public.canonical_dataset_records d
    WHERE d.company_id = j.company_id
      AND d.source_hash = j.source_hash
      AND d.semantic_domain = split_part(j.job_key, ':', 3)
  ) AS canonical ON TRUE
  JOIN public.report_evidence_passports p
    ON p.report_execution_job_id = j.id
   AND p.company_id = j.company_id
   AND p.source_hash = j.source_hash
  JOIN public.report_evidence_snapshots s
    ON s.id = p.evidence_snapshot_id
   AND s.company_id = p.company_id
   AND s.report_execution_job_id = p.report_execution_job_id
  WHERE j.status = 'completed'
    AND j.checkpoint->>'stage' = 'rendered'
    AND j.source_hash ~* '^sha256:[0-9a-f]{64}$'
    AND p.verification_status = 'UNVERIFIED'
    AND p.decision_readiness = 'REVIEW'
    AND s.canonical_coverage_status = 'PARTIAL'
    AND i.status = 'completed'
    AND COALESCE(i.total_rows, 0) = 0
    AND COALESCE(i.processed_rows, 0) = 0
    AND COALESCE(i.valid_rows, 0) = 0
    AND COALESCE(i.invalid_rows, 0) = 0
    AND i.source_fingerprint = j.source_hash
    AND i.file_record_id IS NOT NULL
    AND f.file_hash = j.source_hash
    AND f.security_status = 'passed'
    AND f.status IN ('ready', 'processed', 'verified')
    AND row_proof.proven_rows IS NOT NULL
    AND a.row_count = row_proof.proven_rows
    AND COALESCE(a.quality_score, 0) >= 70
    AND commits.committed_rows = row_proof.proven_rows
    AND canonical.canonical_rows = row_proof.proven_rows
),
eligible_imports AS (
  SELECT
    import_job_id,
    company_id,
    MIN(proven_rows) AS proven_rows,
    JSONB_AGG(DISTINCT report_job_id::text) AS report_job_ids,
    JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
      'reportJobId', report_job_id,
      'sourcePath', source_path,
      'sourceHash', source_hash,
      'fileRecordId', file_record_id,
      'fileHash', file_hash,
      'securityStatus', security_status,
      'fileStatus', file_status,
      'analysisSnapshotId', analysis_snapshot_id,
      'analysisRows', analysis_rows,
      'qualityScore', quality_score,
      'canonicalCommitRows', committed_rows,
      'canonicalDatasetRows', canonical_rows,
      'provenRows', proven_rows
    )) AS proof
  FROM candidate_proofs
  GROUP BY import_job_id, company_id
  HAVING COUNT(DISTINCT proven_rows) = 1
     AND MIN(proven_rows) = MAX(proven_rows)
)
UPDATE public.import_jobs i
SET total_rows = e.proven_rows,
    processed_rows = e.proven_rows,
    valid_rows = e.proven_rows,
    result_summary =
      (CASE
        WHEN JSONB_TYPEOF(i.result_summary) = 'object' THEN i.result_summary
        ELSE JSONB_BUILD_OBJECT('_legacyResultSummaryBeforeRowCountReconciliation', i.result_summary)
      END)
      || JSONB_BUILD_OBJECT(
        'legacyRowCountReconciliation',
        JSONB_BUILD_OBJECT(
          'status', 'RECONCILED_FROM_SOURCE_BOUND_PROOF',
          'ruleVersion', 'source-hash-file-security-rendered-analysis-commit-canonical-exact-match/v1',
          'rowCount', e.proven_rows,
          'sourceFingerprint', i.source_fingerprint,
          'fileRecordId', i.file_record_id,
          'reportJobIds', e.report_job_ids,
          'proof', e.proof,
          'reconciledAt', clock_timestamp()
        )
      )
FROM eligible_imports e
WHERE i.id = e.import_job_id
  AND i.company_id = e.company_id
  AND i.status = 'completed'
  AND COALESCE(i.total_rows, 0) = 0
  AND COALESCE(i.processed_rows, 0) = 0
  AND COALESCE(i.valid_rows, 0) = 0
  AND COALESCE(i.invalid_rows, 0) = 0;

-- Re-evaluate only report passports named in the persisted reconciliation proof.
-- Any failure aborts the transaction, so the ledger and passport cannot diverge.
DO $reconcile$
DECLARE
  candidate RECORD;
  unresolved_count integer;
BEGIN
  FOR candidate IN
    SELECT DISTINCT j.company_id, j.id AS report_job_id
    FROM public.import_jobs i
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN JSONB_TYPEOF(i.result_summary->'legacyRowCountReconciliation'->'reportJobIds') = 'array'
          THEN i.result_summary->'legacyRowCountReconciliation'->'reportJobIds'
        ELSE '[]'::jsonb
      END
    ) AS report_refs(report_job_id)
    JOIN public.report_execution_jobs j
      ON j.id::text = report_refs.report_job_id
     AND j.company_id = i.company_id
    JOIN public.report_evidence_passports p
      ON p.report_execution_job_id = j.id
     AND p.company_id = j.company_id
     AND p.source_hash = j.source_hash
    WHERE i.result_summary->'legacyRowCountReconciliation'->>'status' = 'RECONCILED_FROM_SOURCE_BOUND_PROOF'
      AND p.verification_status <> 'VERIFIED'
    ORDER BY j.company_id, j.id
  LOOP
    PERFORM public.refresh_report_evidence_passport(candidate.company_id, candidate.report_job_id);
  END LOOP;

  SELECT COUNT(*)::integer
    INTO unresolved_count
  FROM public.import_jobs i
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
      WHEN JSONB_TYPEOF(i.result_summary->'legacyRowCountReconciliation'->'reportJobIds') = 'array'
        THEN i.result_summary->'legacyRowCountReconciliation'->'reportJobIds'
      ELSE '[]'::jsonb
    END
  ) AS report_refs(report_job_id)
  JOIN public.report_execution_jobs j
    ON j.id::text = report_refs.report_job_id
   AND j.company_id = i.company_id
  JOIN public.report_evidence_passports p
    ON p.report_execution_job_id = j.id
   AND p.company_id = j.company_id
   AND p.source_hash = j.source_hash
  JOIN public.report_evidence_snapshots s
    ON s.id = p.evidence_snapshot_id
   AND s.company_id = p.company_id
   AND s.report_execution_job_id = p.report_execution_job_id
  WHERE i.result_summary->'legacyRowCountReconciliation'->>'status' = 'RECONCILED_FROM_SOURCE_BOUND_PROOF'
    AND (p.verification_status <> 'VERIFIED' OR p.decision_readiness <> 'READY' OR s.canonical_coverage_status <> 'FULL');

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'LEGACY_ROWCOUNT_RECONCILIATION_PASSPORT_NOT_CLOSED:%', unresolved_count;
  END IF;
END;
$reconcile$;
