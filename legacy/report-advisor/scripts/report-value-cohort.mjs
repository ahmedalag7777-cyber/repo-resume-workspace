import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.REPORT_ADVISOR_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const explicitCompanyId = process.env.REPORT_ADVISOR_COMPANY_ID?.trim() || '';
if (!url || !serviceRole) {
  throw new Error('REPORT_VALUE_COHORT_ENV_REQUIRED');
}

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function safeRequestPath(input) {
  try {
    const raw = typeof input === 'string' ? input : input?.url ?? String(input);
    return new URL(raw).pathname;
  } catch {
    return 'unknown';
  }
}
function logStage(stage, status, extra = {}) {
  console.log(JSON.stringify({ event: 'REPORT_VALUE_COHORT_STAGE', stage, status, ...extra }));
}
const resilientFetch = async (input, init = {}) => {
  let last;
  const path = safeRequestPath(input);
  const method = String(init.method ?? input?.method ?? 'GET').toUpperCase();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!RETRYABLE_HTTP.has(response.status)) return response;
      const body = await response.clone().text().catch(() => '');
      let databaseCode = '';
      try {
        const parsed = JSON.parse(body);
        databaseCode = String(parsed?.code ?? parsed?.error?.code ?? parsed?.error?.details?.code ?? '');
      } catch {
        // A non-JSON error body still gets the bounded generic retry path.
      }
      const statementTimeout =
        databaseCode === '57014' ||
        /statement timeout|canceling statement due to statement timeout/i.test(body);
      const maxAttempts = statementTimeout ? 2 : 5;
      if (attempt >= maxAttempts) {
        console.error(JSON.stringify({
          event: 'SUPABASE_RETRY_EXHAUSTED',
          method,
          path,
          status: response.status,
          databaseCode: databaseCode || null,
          statementTimeout,
          attempts: attempt,
        }));
        return response;
      }
      console.warn(JSON.stringify({
        event: 'SUPABASE_RETRY',
        method,
        path,
        status: response.status,
        databaseCode: databaseCode || null,
        statementTimeout,
        attempt,
        maxAttempts,
      }));
      last = new Error('SUPABASE_RETRYABLE_HTTP_' + response.status + (databaseCode ? ':' + databaseCode : ''));
      await wait(statementTimeout ? 500 : 1000 * 2 ** (attempt - 1));
    } catch (error) {
      last = error;
      if (attempt === 5) {
        console.error(JSON.stringify({ event: 'SUPABASE_FETCH_FAILED', method, path, attempts: attempt, message: String(error?.message ?? error) }));
        throw error;
      }
      console.warn(JSON.stringify({ event: 'SUPABASE_FETCH_RETRY', method, path, attempt, message: String(error?.message ?? error) }));
      await wait(1000 * 2 ** (attempt - 1));
    }
  }
  throw last ?? new Error('SUPABASE_RETRY_EXHAUSTED');
};

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: resilientFetch },
});

const TARGET_COHORT_SIZE = 40;
const eligiblePath = /\.(xlsx|xls|xlsm|csv|tsv|ods|pdf|docx|doc|rtf|json|jsonl|xml|yaml|yml|txt|md|markdown|jpg|jpeg|png|webp|tiff|bmp)$/i;
const syntheticCanonicalPath = /^canonical-import:/i;
const supportedGenericJob = /^canonical-import:generic:/i;

function isRealReportJob(row) {
  const sourcePath = String(row.source_path ?? '').trim();
  const sourceHash = String(row.source_hash ?? '').trim();
  const jobKey = String(row.job_key ?? '').trim();
  return Boolean(
    row.company_id &&
    sourceHash &&
    /^sha256:[0-9a-fA-F]{64}$/.test(sourceHash) &&
    eligiblePath.test(sourcePath) &&
    !syntheticCanonicalPath.test(sourcePath) &&
    supportedGenericJob.test(jobKey),
  );
}

async function selectCohortCandidates() {
  const { data, error } = await supabase.rpc('get_report_value_cohort_candidates', {
    p_limit: 100,
    p_company_id: explicitCompanyId || null,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.job_id),
    company_id: String(row.company_id),
    source_path: String(row.source_path ?? ''),
    source_hash: String(row.source_hash ?? ''),
    job_key: String(row.job_key ?? ''),
    checkpoint: row.checkpoint ?? {},
    evidence: row.evidence ?? {},
    updated_at: row.updated_at ?? null,
  }));
}

logStage('candidate_rpc', 'START');
const candidateJobs = await selectCohortCandidates();
logStage('candidate_rpc', 'PASS', { candidatePool: candidateJobs.length });
if (candidateJobs.length < TARGET_COHORT_SIZE) throw new Error('REPORT_VALUE_COHORT_CANDIDATES_INCOMPLETE:' + candidateJobs.length + '/' + TARGET_COHORT_SIZE);
console.log(JSON.stringify({ candidatePool: candidateJobs.length, targetCohort: TARGET_COHORT_SIZE }));

const candidateIds = candidateJobs.map((job) => String(job.id));
logStage('existing_passports_read', 'START', { candidateIds: candidateIds.length });
const { data: existingPassports, error: existingPassportError } = await supabase
  .from('report_evidence_passports')
  .select('id,company_id,report_execution_job_id,evidence_snapshot_id,verification_status,decision_readiness')
  .in('report_execution_job_id', candidateIds);
if (existingPassportError) throw existingPassportError;
logStage('existing_passports_read', 'PASS', { passports: (existingPassports ?? []).length });

const existingSnapshotIds = [...new Set((existingPassports ?? []).map((row) => row.evidence_snapshot_id).filter(Boolean).map(String))];
logStage('existing_snapshots_read', 'START', { snapshotIds: existingSnapshotIds.length });
const { data: existingSnapshots, error: existingSnapshotError } = existingSnapshotIds.length
  ? await supabase.from('report_evidence_snapshots')
      .select('id,canonical_coverage_status,verification_status')
      .in('id', existingSnapshotIds)
  : { data: [], error: null };
if (existingSnapshotError) throw existingSnapshotError;
logStage('existing_snapshots_read', 'PASS', { snapshots: (existingSnapshots ?? []).length });

const snapshotById = new Map((existingSnapshots ?? []).map((row) => [String(row.id), row]));
const existingPassportByJobId = new Map((existingPassports ?? []).map((row) => [String(row.report_execution_job_id), row]));
const alreadyProven = new Map();
for (const job of candidateJobs) {
  const passport = existingPassportByJobId.get(String(job.id));
  const snapshot = passport?.evidence_snapshot_id
    ? snapshotById.get(String(passport.evidence_snapshot_id))
    : null;
  const accepted =
    String(passport?.verification_status ?? '') === 'VERIFIED' &&
    String(passport?.decision_readiness ?? '') === 'READY' &&
    String(snapshot?.verification_status ?? '') === 'VERIFIED' &&
    String(snapshot?.canonical_coverage_status ?? '') === 'FULL';
  if (accepted) alreadyProven.set(String(job.id), { passport, snapshot });
}
console.log(JSON.stringify({ alreadyProven: alreadyProven.size, candidatePool: candidateJobs.length }));

const provenJobs = [];
const refreshResults = [];
for (let offset = 0; offset < candidateJobs.length && provenJobs.length < TARGET_COHORT_SIZE; offset += 4) {
  const batch = candidateJobs.slice(offset, offset + 4);
  logStage('refresh_passport_batch', 'START', { batch: Math.floor(offset / 4) + 1, rows: batch.length, acceptedBefore: provenJobs.length });
  const batchResults = await Promise.all(batch.map(async (job) => {
    const existing = alreadyProven.get(String(job.id));
    if (existing) {
      return {
        jobId: String(job.id),
        companyId: String(job.company_id),
        source: String(job.source_path ?? ''),
        status: 'VERIFIED',
        decisionReadiness: 'READY',
        coverage: 'FULL',
        passportId: existing.passport?.id ? String(existing.passport.id) : null,
        cohortAccepted: true,
        reason: 'PASSPORT_ALREADY_VERIFIED_READY_FULL',
      };
    }
    const { data, error } = await supabase.rpc('refresh_report_evidence_passport', { p_company_id: String(job.company_id), p_job_id: String(job.id) });
    if (error) return { jobId: String(job.id), companyId: String(job.company_id), source: String(job.source_path ?? ''), status: 'REVIEW', decisionReadiness: 'REVIEW', coverage: 'UNKNOWN', passportId: null, cohortAccepted: false, reason: String(error.message || error) };
    const accepted = String(data?.verificationStatus ?? '') === 'VERIFIED' && String(data?.decisionReadiness ?? '') === 'READY' && String(data?.canonicalCoverage ?? '') === 'FULL';
    return { jobId: String(job.id), companyId: String(job.company_id), source: String(job.source_path ?? ''), status: String(data?.verificationStatus ?? 'REVIEW'), decisionReadiness: String(data?.decisionReadiness ?? 'REVIEW'), coverage: String(data?.canonicalCoverage ?? 'UNKNOWN'), passportId: data?.passportId ? String(data.passportId) : null, cohortAccepted: accepted, reason: accepted ? null : 'PASSPORT_NOT_CLOSED' };
  }));
  for (const row of batchResults) { refreshResults.push(row); if (row.cohortAccepted && provenJobs.length < TARGET_COHORT_SIZE) { const job = candidateJobs.find((item) => String(item.id) === row.jobId); if (job) provenJobs.push(job); } }
  console.log(JSON.stringify({ refreshBatch: Math.floor(offset / 4) + 1, accepted: provenJobs.length, results: batchResults }));
  logStage('refresh_passport_batch', 'PASS', { batch: Math.floor(offset / 4) + 1, accepted: provenJobs.length });
}
const sourceJobs = provenJobs.slice(0, TARGET_COHORT_SIZE);

const refreshSummary = {
  candidatePool: candidateJobs.length,
  attempted: refreshResults.length,
  accepted: refreshResults.filter((row) => row.cohortAccepted).length,
  verified: refreshResults.filter((row) => row.status === 'VERIFIED').length,
  review: refreshResults.filter((row) => row.status === 'REVIEW').length,
  unverified: refreshResults.filter((row) => row.status === 'UNVERIFIED').length,
  blockedReasons: refreshResults.filter((row) => !row.cohortAccepted).map((row) => ({ source: row.source, reason: row.reason, status: row.status })),
};

if (refreshSummary.accepted !== TARGET_COHORT_SIZE) {
  throw new Error('REPORT_VALUE_COHORT_PASSPORT_NOT_CLOSED:' + JSON.stringify(refreshSummary));
}

const jobIds = sourceJobs.map((job) => String(job.id));

logStage('cohort_passports_read', 'START', { reportJobs: jobIds.length });
const { data: passports, error: passportError } = await supabase
  .from('report_evidence_passports')
  .select('id,company_id,report_execution_job_id,evidence_snapshot_id,source_hash,acceptance_status,verification_status,decision_readiness,evidence')
  .in('report_execution_job_id', jobIds);
if (passportError) throw passportError;
logStage('cohort_passports_read', 'PASS', { passports: (passports ?? []).length });

const snapshotIds = [...new Set((passports ?? []).map((row) => row.evidence_snapshot_id).filter(Boolean).map(String))];
logStage('recommendations_read', 'START', { evidenceSnapshots: snapshotIds.length });
const { data: recommendations, error: recommendationError } = snapshotIds.length
  ? await supabase
      .from('recommendations')
      .select('id,company_id,decision_id,evidence_snapshot_id,evidence,status,expected_impact')
      .in('evidence_snapshot_id', snapshotIds)
  : { data: [], error: null };
if (recommendationError) throw recommendationError;
logStage('recommendations_read', 'PASS', { recommendations: (recommendations ?? []).length });

const recommendationIds = [...new Set((recommendations ?? []).map((row) => row.id).filter(Boolean).map(String))];
logStage('decisions_read', 'START', { recommendations: recommendationIds.length });
const { data: decisions, error: decisionError } = recommendationIds.length
  ? await supabase
      .from('business_intelligence_decisions')
      .select('id,company_id,recommendation_id,status,evidence,approved_at,expected_impact,confidence')
      .in('recommendation_id', recommendationIds)
  : { data: [], error: null };
if (decisionError) throw decisionError;
logStage('decisions_read', 'PASS', { decisions: (decisions ?? []).length });

const decisionIds = [...new Set((decisions ?? []).map((row) => String(row.id)))];
logStage('approvals_read', 'START', { decisions: decisionIds.length });
const { data: approvals, error: approvalError } = decisionIds.length
  ? await supabase.from('decision_approvals').select('id,company_id,decision_id,status').in('decision_id', decisionIds)
  : { data: [], error: null };
if (approvalError) throw approvalError;
logStage('approvals_read', 'PASS', { approvals: (approvals ?? []).length });

logStage('work_items_read', 'START', { decisions: decisionIds.length });
const { data: workItems, error: workError } = decisionIds.length
  ? await supabase.from('decision_work_items').select('id,company_id,decision_id,status,evidence_refs').in('decision_id', decisionIds)
  : { data: [], error: null };
if (workError) throw workError;
logStage('work_items_read', 'PASS', { workItems: (workItems ?? []).length });

logStage('outcomes_read', 'START', { decisions: decisionIds.length });
const { data: outcomes, error: outcomeError } = decisionIds.length
  ? await supabase.from('recommendation_outcomes').select('id,company_id,decision_id,status,expected_impact,actual_impact,evidence').in('decision_id', decisionIds)
  : { data: [], error: null };
if (outcomeError) throw outcomeError;
logStage('outcomes_read', 'PASS', { outcomes: (outcomes ?? []).length });

const passportByJobId = new Map((passports ?? []).map((row) => [String(row.report_execution_job_id), row]));
const recommendationsBySnapshot = new Map();
for (const row of recommendations ?? []) {
  const key = String(row.evidence_snapshot_id);
  const list = recommendationsBySnapshot.get(key) ?? [];
  list.push(row);
  recommendationsBySnapshot.set(key, list);
}

const decisionsByRecommendation = new Map();
for (const row of decisions ?? []) {
  if (!row.recommendation_id) continue;
  decisionsByRecommendation.set(String(row.recommendation_id), row);
}

const result = sourceJobs.map((job) => {
  const hash = String(job.source_hash);
  const tenantId = String(job.company_id);
  const passport = passportByJobId.get(String(job.id));
  const snapshotId = passport ? String(passport.evidence_snapshot_id) : '';
  const sourceRecommendations = snapshotId ? (recommendationsBySnapshot.get(snapshotId) ?? []) : [];
  const sourceDecisionIds = sourceRecommendations.map((row) => String(row.id)).map((id) => decisionsByRecommendation.get(id)).filter(Boolean);
  const sourceDecision = sourceDecisionIds.find((row) => {
    const evidence = row.evidence && typeof row.evidence === 'object' ? row.evidence : {};
    return String(evidence.sourceHash ?? '') === hash;
  }) ?? null;
  const decisionId = sourceDecision ? String(sourceDecision.id) : '';
  const approval = decisionId ? (approvals ?? []).find((row) => String(row.decision_id) === decisionId) : null;
  const sourceWork = decisionId
    ? (workItems ?? []).find((row) => {
        if (String(row.decision_id) !== decisionId) return false;
        const refs = Array.isArray(row.evidence_refs) ? row.evidence_refs : [];
        return refs.some((ref) => ref && typeof ref === 'object' && String(ref.sourceHash ?? '') === hash);
      })
    : null;
  const outcome = decisionId ? (outcomes ?? []).find((row) => String(row.decision_id) === decisionId) : null;

  const rendered = job.evidence?.renderedOutput && typeof job.evidence.renderedOutput === 'object'
    ? job.evidence.renderedOutput
    : {};
  const signals = Array.isArray(passport?.evidence?.businessSignals) ? passport.evidence.businessSignals : [];
  const learning = outcome?.evidence && typeof outcome.evidence === 'object' && outcome.evidence.learning
    ? 'PASS'
    : outcome ? 'REVIEW' : 'NOT APPLICABLE';
  const benchmark = String(rendered.benchmarkStatus ?? '') === 'INSUFFICIENT_SAMPLE'
    ? 'INSUFFICIENT SAMPLE'
    : rendered.benchmarkStatus
      ? 'REVIEW'
      : 'NOT APPLICABLE';

  return {
    source: String(job.source_path ?? ''),
    companyId: tenantId,
    passport: passport?.verification_status === 'VERIFIED' ? 'PASS' : passport?.acceptance_status === 'REVIEW' ? 'REVIEW' : 'BLOCKED',
    signals: signals.length ? 'PASS' : 'REVIEW',
    recommendation: sourceRecommendations.length ? 'PASS' : 'REVIEW',
    decision: sourceDecision ? 'PASS' : 'REVIEW',
    approval: approval?.status === 'APPROVED' ? 'PASS' : approval ? 'REVIEW' : 'REVIEW',
    work: sourceWork?.status === 'COMPLETED' ? 'PASS' : sourceWork ? 'REVIEW' : 'REVIEW',
    outcome: outcome ? 'PASS' : 'REVIEW',
    learning,
    benchmark,
  };
});

const summary = {
  cohort: result.length,
  uniqueSourceHashes: new Set(sourceJobs.map((job) => String(job.source_hash))).size,
  tenants: new Set(result.map((row) => row.companyId)).size,
  evidencePassport: result.filter((row) => row.passport === 'PASS').length,
  signals: result.filter((row) => row.signals === 'PASS').length,
  recommendations: result.filter((row) => row.recommendation === 'PASS').length,
  decisions: result.filter((row) => row.decision === 'PASS').length,
  approvals: result.filter((row) => row.approval === 'PASS').length,
  work: result.filter((row) => row.work === 'PASS').length,
  outcomes: result.filter((row) => row.outcome === 'PASS').length,
  learning: result.filter((row) => row.learning === 'PASS').length,
  benchmarkReady: result.filter((row) => row.benchmark === 'PASS').length,
};

console.log(JSON.stringify({ summary, refreshSummary, refreshResults, reports: result }, null, 2));
