// FINAL REAL-REPORT RESUME CONTRACT: long PDF resumes execute in the background and proof polls the durable checkpoint.
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { securityScan } from '../../src/lib/file-engine/security.ts';
import { detectFormat } from '../../src/lib/file-engine/detector.ts';
import { parseFile } from '../../src/lib/file-engine/adapters.ts';
import { reconcileForCanonical } from '../../src/lib/import/canonical-truth-boundary.ts';
import { runCanonicalImportThroughDurableRunner } from '../../src/lib/import/canonical-production-adapter.ts';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const fields = ['message', 'code', 'details', 'hint', 'status', 'statusCode'];
    const parts = fields.flatMap((field) => {
      const item = value[field];
      return item == null || String(item).trim() === '' ? [] : [`${field}=${String(item).trim()}`];
    });
    if (parts.length) return parts.join(' | ');
    try {
      const encoded = JSON.stringify(value);
      if (encoded) return encoded;
    } catch {
      // Fall through to String() for non-serializable error objects.
    }
  }
  return String(error);
}

function env(name: string): string {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`NETLIFY_ENV_MISSING:${name}`);
  return value;
}

function bearer(request: Request): string {
  const value = request.headers.get('authorization') ?? '';
  if (!/^Bearer\s+\S+$/i.test(value)) throw new Error('AUTHENTICATED_USER_REQUIRED');
  return value;
}

function reportEntityTypeFromJobKey(jobKey: string): string {
  const parts = jobKey.split(':');
  if (parts[0] !== 'canonical-import') throw new Error('REPORT_EXECUTION_JOB_KEY_INVALID');
  if (parts[1] === 'generic' && parts[2]) return 'generic:' + parts[2];
  if (parts[1]) return parts[1];
  throw new Error('REPORT_EXECUTION_ENTITY_TYPE_MISSING');
}

export async function handleCanonicalImport(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  try {
    const authorization = bearer(request);
    const supabaseUrl = env('VITE_SUPABASE_URL');
    const anonKey = env('VITE_SUPABASE_ANON_KEY');
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user?.id) throw new Error('AUTHENTICATED_USER_REQUIRED');

    const { data: companyId, error: companyError } = await userClient.rpc('current_company_id');
    if (companyError || !companyId) throw new Error('TENANT_CONTEXT_REQUIRED');

    const payload = await request.json() as {
      importId?: string;
      fileName?: string;
      sourceHash?: string;
      entityType?: 'products' | 'customers' | 'sales_invoices' | `generic:${string}`;
      resumeReportExecutionJobId?: string;
      rows?: unknown[];
      qualityScore?: number;
      qualityApproved?: boolean;
      mode?: 'execute' | 'finalize-source';
    };

    const mode = payload.mode ?? 'execute';
    const resumeReportExecutionJobId = typeof payload.resumeReportExecutionJobId === 'string' ? payload.resumeReportExecutionJobId.trim() : '';
    let importId = typeof payload.importId === 'string' ? payload.importId.trim() : '';
    let fileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
    let sourceHash = typeof payload.sourceHash === 'string' ? payload.sourceHash.trim() : '';
    let entityType = payload.entityType;

    if (resumeReportExecutionJobId) {
      const { data: reportJob, error: reportJobError } = await serviceClient
        .from('report_execution_jobs')
        .select('id,company_id,source_path,source_hash,job_key,status,checkpoint,evidence')
        .eq('id', resumeReportExecutionJobId)
        .eq('company_id', companyId)
        .maybeSingle();
      if (reportJobError || !reportJob) throw new Error('REPORT_EXECUTION_JOB_NOT_FOUND_OR_FORBIDDEN');
      const checkpoint = reportJob.checkpoint && typeof reportJob.checkpoint === 'object' ? reportJob.checkpoint as Record<string, unknown> : {};
      const evidenceKeys = Array.isArray(checkpoint.evidenceKeys) ? checkpoint.evidenceKeys.map(String) : [];
      importId = importId || (evidenceKeys.find((key) => key.startsWith('import:'))?.slice(7) ?? '');
      fileName = fileName || String(reportJob.source_path ?? '');
      sourceHash = sourceHash || String(reportJob.source_hash ?? checkpoint.sourceHash ?? '');
      entityType = reportEntityTypeFromJobKey(String(reportJob.job_key ?? ''));

      if (reportJob.status === 'completed' && checkpoint.stage === 'rendered') {
        const { count: canonicalRowCount, error: canonicalCountError } = await serviceClient
          .from('canonical_dataset_records')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('source_hash', sourceHash);
        if (canonicalCountError) throw canonicalCountError;

        const { data: latestCommit, error: latestCommitError } = await serviceClient
          .from('canonical_import_commits')
          .select('committed_count')
          .eq('company_id', companyId)
          .eq('source_hash', sourceHash)
          .order('committed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestCommitError) throw latestCommitError;

        if (Number(canonicalRowCount ?? 0) > 0 && Number(latestCommit?.committed_count ?? -1) === Number(canonicalRowCount)) {
          const { error: recoveryError } = await serviceClient.rpc('recover_missing_source_analysis_snapshots', {
            p_company_id: companyId,
          });
          if (recoveryError) throw recoveryError;

          const { data: snapshot, error: snapshotReadError } = await serviceClient
            .from('source_analysis_snapshots')
            .select('id,row_count,column_count,quality_score,datasets')
            .eq('company_id', companyId)
            .eq('source_hash', sourceHash)
            .eq('analysis_status', 'analyzed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (snapshotReadError || !snapshot) {
            throw new Error('AUTHORITATIVE_SOURCE_ANALYSIS_RECOVERY_READBACK_FAILED');
          }

          const checkpointImportId = evidenceKeys.find((key) => key.startsWith('import:'))?.slice(7) ?? '';
          if (!checkpointImportId) throw new Error('REPORT_EXECUTION_IMPORT_ID_MISSING');

          const { data: importJob, error: importJobError } = await userClient
            .from('import_jobs')
            .select('id,status,total_rows,processed_rows,valid_rows,invalid_rows')
            .eq('id', checkpointImportId)
            .eq('company_id', companyId)
            .maybeSingle();
          if (importJobError || !importJob) throw new Error('IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN');

          if (['queued', 'processing'].includes(String(importJob.status))) {
            const { error: totalRowsError } = await userClient
              .from('import_jobs')
              .update({ total_rows: Number(canonicalRowCount) })
              .eq('id', checkpointImportId)
              .eq('company_id', companyId)
              .in('status', ['queued', 'processing']);
            if (totalRowsError) throw totalRowsError;

            const { error: finishError } = await userClient.rpc('import_finish_job', {
              p_job_id: checkpointImportId,
              p_status: 'completed',
              p_result_summary: {
                source_hash: sourceHash,
                committed: Number(canonicalRowCount),
                invalidRows: 0,
                recovered_from_canonical_dataset: true,
                analysis_snapshot_id: snapshot.id,
              },
              p_error_message: null,
            });
            if (finishError) throw finishError;
          } else if (importJob.status === 'completed' && Number(importJob.valid_rows ?? 0) !== Number(canonicalRowCount)) {
            throw new Error('IMPORT_JOB_COMPLETED_ROW_MISMATCH');
          }

          const currentEvidence = reportJob.evidence && typeof reportJob.evidence === 'object'
            ? reportJob.evidence as Record<string, unknown>
            : {};
          const currentRendered = currentEvidence.renderedOutput && typeof currentEvidence.renderedOutput === 'object'
            ? currentEvidence.renderedOutput as Record<string, unknown>
            : {};
          const recoveredEvidence = {
            ...currentEvidence,
            sourceSnapshotId: snapshot.id,
            evidenceStatus: 'AWAITING_EVIDENCE_SNAPSHOT',
            recoveredFromCanonicalDataset: true,
            renderedOutput: {
              ...currentRendered,
              sourceHash: String(reportJob.source_hash ?? sourceHash),
              sourcePath: String(reportJob.source_path ?? fileName),
              importId: checkpointImportId,
              sourceSnapshotId: snapshot.id,
              analysisSnapshotId: snapshot.id,
              authoritativeCurrentRowCount: Number(canonicalRowCount),
              canonicalCommitVerified: true,
              evidenceStatus: 'AWAITING_EVIDENCE_SNAPSHOT',
            },
          };
          const { error: evidenceRepairError } = await serviceClient
            .from('report_execution_jobs')
            .update({ evidence: recoveredEvidence })
            .eq('id', resumeReportExecutionJobId)
            .eq('company_id', companyId);
          if (evidenceRepairError) throw evidenceRepairError;

          return json(200, {
            importId: checkpointImportId,
            sourceHash,
            snapshotId: snapshot.id,
            authoritativeRowCount: Number(canonicalRowCount),
            authoritativeQualityScore: Number(snapshot.quality_score ?? 0),
            recoveredFromCanonicalDataset: true,
            jobId: reportJob.id,
          });
        }
      }
    }

    const genericEntity = typeof entityType === 'string' && /^generic:[a-z][a-z0-9_-]{0,63}$/.test(entityType);
    if (entityType !== 'products' && entityType !== 'customers' && entityType !== 'sales_invoices' && !genericEntity) throw new Error('CANONICAL_IMPORT_ENTITY_TYPE_INVALID');
    if (!importId || !entityType || (mode === 'execute' && !resumeReportExecutionJobId && (!Array.isArray(payload.rows) || !Number.isFinite(payload.qualityScore) || typeof payload.qualityApproved !== 'boolean'))) {
      throw new Error('CANONICAL_IMPORT_REQUEST_INVALID');
    }

    const { data: job, error: jobError } = await serviceClient
      .from('import_jobs')
      .select('id, company_id, file_record_id, job_type, result_summary')
      .eq('id', importId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job?.file_record_id) throw new Error('IMPORT_JOB_SOURCE_RECORD_NOT_FOUND_OR_FORBIDDEN');
    if (job.job_type && job.job_type !== entityType) throw new Error('IMPORT_JOB_ENTITY_TYPE_MISMATCH');

    const { data: fileRecord, error: fileError } = await serviceClient
      .from('file_records')
      .select('id, company_id, file_name, file_mime, file_size, file_hash, security_status, status, metadata')
      .eq('id', job.file_record_id)
      .eq('company_id', companyId)
      .maybeSingle();
    if (fileError) throw fileError;
    if (!fileRecord) throw new Error('IMPORT_JOB_SOURCE_RECORD_NOT_FOUND_OR_FORBIDDEN');

    const metadata = (fileRecord.metadata && typeof fileRecord.metadata === 'object') ? fileRecord.metadata as Record<string, unknown> : {};
    const storageBucket = String(metadata.storage_bucket ?? 'documents');
    const storagePath = String(metadata.storage_path ?? '');
    if (storageBucket !== 'documents' || !storagePath) throw new Error('AUTHORITATIVE_SOURCE_STORAGE_BINDING_INVALID');
    if (!storagePath.startsWith(`${companyId}/imports/`)) throw new Error('AUTHORITATIVE_SOURCE_STORAGE_TENANT_MISMATCH');

    const { data: sourceBlob, error: downloadError } = await serviceClient.storage
      .from(storageBucket)
      .download(storagePath);
    if (downloadError || !sourceBlob) throw new Error(`AUTHORITATIVE_SOURCE_DOWNLOAD_FAILED:${downloadError?.message ?? 'EMPTY_SOURCE'}`);

    const bytes = new Uint8Array(await sourceBlob.arrayBuffer());
    const sourceSha = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

    if (sourceHash && sourceHash !== sourceSha) {
      throw new Error('AUTHORITATIVE_SOURCE_HASH_MISMATCH');
    }

    const sourceFile = new File([bytes], fileRecord.file_name || fileName || 'import', {
      type: fileRecord.file_mime || sourceBlob.type || 'application/octet-stream',
      lastModified: Date.now(),
    });
    const security = securityScan(sourceFile, bytes.buffer);
    if (!security.passed) throw new Error(`AUTHORITATIVE_SOURCE_SECURITY_REJECTED:${security.issues.join(' | ')}`);

    const detection = detectFormat(sourceFile, bytes.buffer);
    if (detection.format === 'unknown') throw new Error('AUTHORITATIVE_SOURCE_FORMAT_UNKNOWN');

    if (mode === 'finalize-source') {
      return json(200, { importId: job.id, sourceHash: sourceSha });
    }

    const authoritativeDatasets = await parseFile(bytes.buffer, fileRecord.file_name || fileName || 'import', detection.format);
    const authoritativeDataset = authoritativeDatasets[0];
    if (!authoritativeDataset || authoritativeDataset.rowCount === 0) throw new Error('AUTHORITATIVE_SOURCE_PARSE_EMPTY');

    const authoritativeQualityScore = Math.max(0, Math.min(100, Math.round(authoritativeDataset.qualityScore)));
    if (authoritativeQualityScore < 50) throw new Error(`CANONICAL_IMPORT_QUALITY_REJECTED:${authoritativeQualityScore}`);
    if (authoritativeQualityScore < 75 && payload.qualityApproved !== true) {
      throw new Error(`CANONICAL_IMPORT_REVIEW_APPROVAL_REQUIRED:${authoritativeQualityScore}`);
    }

    const authoritativeRows = authoritativeDataset.rows.map((data, index) => ({ rowNumber: index + 1, data }));
    let repairExistingSource = false;
    if (resumeReportExecutionJobId) {
      const { data: existingCommit, error: existingCommitError } = await serviceClient
        .from('canonical_import_commits')
        .select('committed_count')
        .eq('company_id', companyId)
        .eq('entity_type', entityType)
        .eq('source_hash', sourceSha)
        .maybeSingle();
      if (existingCommitError) throw existingCommitError;
      repairExistingSource = Boolean(
        existingCommit &&
        Number(existingCommit.committed_count ?? -1) !== authoritativeRows.length,
      );
      if (repairExistingSource) {
        console.log('[canonical-import-execute] source repair required', {
          sourceHash: sourceSha,
          previousCommittedCount: Number(existingCommit?.committed_count ?? -1),
          authoritativeRowCount: authoritativeRows.length,
          parserVersion: '2026-09-30-arabic-sales-layout-v2',
        });
      }
    }

    const reconciled = reconcileForCanonical(
      entityType,
      String(companyId),
      fileRecord.file_name || fileName || 'import',
      sourceSha,
      job.id,
      (_data, rowNumber) => `${sourceSha}:${rowNumber}`,
      authoritativeRows,
    );
    if (reconciled.rejected.length > 0) {
      throw new Error(`CANONICAL_RECONCILIATION_REJECTED:${reconciled.rejected.map(item => `${item.rowNumber}:${item.reason}`).join(',')}`);
    }
    if (reconciled.rows.length !== authoritativeRows.length) throw new Error('AUTHORITATIVE_SOURCE_RECONCILIATION_COUNT_MISMATCH');

    const verifiedMetadata = {
      ...metadata,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      raw_bytes_sha256: sourceSha,
      detected_format: detection.format,
      server_verified_at: new Date().toISOString(),
      server_verified_by: userData.user.id,
      parser_version: '2026-09-30-arabic-sales-layout-v2',
    };

    const { error: fileUpdateError } = await serviceClient
      .from('file_records')
      .update({
        file_hash: sourceSha,
        file_size: bytes.byteLength,
        file_mime: fileRecord.file_mime || sourceBlob.type || detection.mime,
        security_status: 'passed',
        status: 'ready',
        metadata: verifiedMetadata,
      })
      .eq('id', fileRecord.id)
      .eq('company_id', companyId);
    if (fileUpdateError) throw fileUpdateError;

    const { error: jobUpdateError } = await serviceClient
      .from('import_jobs')
      .update({
        source_fingerprint: sourceSha,
        result_summary: {
          ...(job.result_summary && typeof job.result_summary === 'object' ? job.result_summary : {}),
          source_verified: true,
          source_hash: sourceSha,
          source_storage_bucket: storageBucket,
          source_storage_path: storagePath,
          server_verified_at: verifiedMetadata.server_verified_at,
        },
      })
      .eq('id', job.id)
      .eq('company_id', companyId);
    if (jobUpdateError) throw jobUpdateError;

    let execution;
    try {
      execution = await runCanonicalImportThroughDurableRunner(
        {
          importId: job.id,
          fileName: fileRecord.file_name || fileName || 'import',
          sourceHash: sourceSha,
          entityType,
          rows: reconciled.rows,
          qualityScore: authoritativeQualityScore,
          qualityApproved: resumeReportExecutionJobId ? true : payload.qualityApproved === true,
          repairExistingSource,
        },
        {
          serverExecution: true,
          workerClient: serviceClient,
          dataClient: userClient,
          companyId: String(companyId),
          requestedBy: userData.user.id,
        },
      );
    } catch (error) {
      const detail = describeError(error);
      throw new Error(`CANONICAL_IMPORT_DURABLE_RUN_FAILED:${entityType}:${job.id}:${detail}`);
    }

    let snapshotId: string | null = null;
    const { data: snapshot, error: snapshotError } = await serviceClient
        .from('source_analysis_snapshots')
        .insert({
          company_id: companyId,
          import_job_id: job.id,
          source_hash: sourceSha,
          source_path: storagePath,
          source_format: detection.format,
          analysis_status: 'analyzed',
          entity_type: 'source-data',
          quality_score: authoritativeQualityScore,
          row_count: authoritativeRows.length,
          column_count: Array.isArray(authoritativeDataset.columns) ? authoritativeDataset.columns.length : 0,
          datasets: [{
            name: fileRecord.file_name || fileName || 'import',
            rowCount: authoritativeRows.length,
            columnCount: Array.isArray(authoritativeDataset.columns) ? authoritativeDataset.columns.length : 0,
            columns: authoritativeDataset.columns,
            preview: Array.isArray(authoritativeDataset.preview) ? authoritativeDataset.preview.slice(0, 25) : [],
          }],
          canonical_text: [
            `source=${fileRecord.file_name || fileName || 'import'}`,
            `server_authoritative_quality=${authoritativeQualityScore}%`,
            `source_sha=${sourceSha}`,
          ].join(' | '),
          visual_assets: [],
          warnings: [],
          metadata: {
            fileName: fileRecord.file_name || fileName || 'import',
            sourceFormat: detection.format,
            serverAuthoritativeSource: true,
            serverAuthoritativeQualityScore: authoritativeQualityScore,
            committed: authoritativeRows.length,
            jobId: execution.jobId,
            sourceStoragePath: storagePath,
          },
        })
        .select('id')
        .single();
      if (snapshotError || !snapshot?.id) {
        throw new Error('AUTHORITATIVE_SOURCE_ANALYSIS_PERSIST_FAILED:' + (snapshotError?.message ?? 'EMPTY_SNAPSHOT_ID'));
      }
      snapshotId = snapshot.id;

      const { data: completedReport, error: completedReportError } = await serviceClient
        .from('report_execution_jobs')
        .select('evidence')
        .eq('id', execution.jobId)
        .eq('company_id', companyId)
        .maybeSingle();
      if (completedReportError || !completedReport) {
        throw new Error('REPORT_EXECUTION_EVIDENCE_READBACK_FAILED');
      }

      const evidence = completedReport.evidence && typeof completedReport.evidence === 'object'
        ? completedReport.evidence as Record<string, unknown>
        : {};
      const rendered = evidence.renderedOutput && typeof evidence.renderedOutput === 'object'
        ? evidence.renderedOutput as Record<string, unknown>
        : {};
      // Analysis snapshot proves source extraction and lineage, not a governed evidence passport.
      // Keep the report awaiting evidence until refresh_report_evidence_passport validates canonical coverage.
      const linkedEvidence = {
        ...evidence,
        sourceSnapshotId: snapshotId,
        evidenceStatus: 'AWAITING_EVIDENCE_SNAPSHOT',
        renderedOutput: {
          ...rendered,
          sourceSnapshotId: snapshotId,
          evidenceStatus: 'AWAITING_EVIDENCE_SNAPSHOT',
          sourceAnalysisSnapshotId: snapshotId,
        },
      };

      const { error: evidenceUpdateError } = await serviceClient
        .from('report_execution_jobs')
        .update({ evidence: linkedEvidence })
        .eq('id', execution.jobId)
        .eq('company_id', companyId);
      if (evidenceUpdateError) {
        throw new Error('REPORT_EXECUTION_EVIDENCE_LINK_FAILED:' + evidenceUpdateError.message);
      }

    return json(200, {
      ...execution,
      importId: job.id,
      sourceHash: sourceSha,
      snapshotId,
      authoritativeRowCount: authoritativeRows.length,
      authoritativeQualityScore,
      authoritativeColumns: authoritativeDataset.columns,
      authoritativePreview: authoritativeDataset.preview.slice(0, 25),
    });
  } catch (error) {
    const message = describeError(error) || 'CANONICAL_IMPORT_SERVER_EXECUTION_FAILED';
    console.error('[canonical-import-execute] failed', error);
    const status = message.startsWith('NETLIFY_ENV_MISSING') ? 503 : 400;
    const debugEnabled = Netlify.env.get('REPORT_ADVISOR_E2E_DEBUG') === '1';
    const detail = debugEnabled
      ? message.slice(0, 512)
      : 'CANONICAL_IMPORT_SERVER_EXECUTION_FAILED';
    return json(status, { error: 'CANONICAL_IMPORT_SERVER_EXECUTION_FAILED', detail });
  }
}

export default async (request: Request): Promise<Response> => {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const cloned = request.clone();
    try {
      const body = await cloned.json() as { resumeReportExecutionJobId?: string };
      if (typeof body.resumeReportExecutionJobId === 'string' && body.resumeReportExecutionJobId.trim()) {
        const backgroundUrl = new URL('/.netlify/functions/canonical-import-resume-background', request.url);
        const dispatched = await fetch(backgroundUrl, {
          method: 'POST',
          headers: {
            Authorization: request.headers.get('authorization') ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (!dispatched.ok) {
          const detail = await dispatched.text();
          return new Response(JSON.stringify({ error: 'CANONICAL_IMPORT_BACKGROUND_DISPATCH_FAILED', detail: detail.slice(0, 1000) }), { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
        }
        return new Response(JSON.stringify({ accepted: true, background: true, resumeReportExecutionJobId: body.resumeReportExecutionJobId.trim() }), { status: 202, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }
    } catch {
      // Fall through to the canonical synchronous handler for malformed/non-resume requests.
    }
  }
  return handleCanonicalImport(request);
}

export const config = {
  path: '/api/canonical-import-execute',
};