import fs from 'node:fs/promises';
import { listReportArchetypes, runReportArchetype, detectReportArchetype } from '../src/lib/report-intelligence/archetype-registry.ts';

const baseURL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const supabaseURL = (process.env.REPORT_ADVISOR_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY?.trim();
const email = process.env.TEST_USER_A_EMAIL?.trim();
const password = process.env.TEST_USER_A_PASSWORD;
const approverEmail = process.env.TEST_APPROVER_EMAIL?.trim();
const approverPassword = process.env.TEST_APPROVER_PASSWORD;
const exactHead = process.env.EXACT_HEAD || 'UNKNOWN';
const reportDir = process.env.E2E_REPORT_DIR || 'artifacts/e2e-business';
const outFile = reportDir + '/real-48-archetype-proof.json';
for (const [name, value] of Object.entries({ supabaseURL, anonKey, email, password, approverEmail, approverPassword })) {
  if (!value) throw new Error('REAL_48_PROOF_ENV_MISSING:' + name);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { apikey: anonKey, ...(options.headers || {}) } });
  const body = await response.text();
  if (!response.ok) throw new Error('SUPABASE_HTTP_' + response.status + ':' + body.slice(0, 1200));
  return body ? JSON.parse(body) : null;
}

async function signInActor(actor, actorPassword, missingCode) {
  const auth = await fetchJson(supabaseURL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: actor, password: actorPassword }),
  });
  const token = auth?.access_token;
  if (!token) throw new Error(missingCode);
  return token;
}

async function currentUserId(token) {
  const user = await fetchJson(supabaseURL + '/auth/v1/user', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!user?.id) throw new Error('REAL_48_USER_ID_MISSING');
  return String(user.id);
}

const accessToken = await signInActor(email, password, 'REAL_48_PROOF_ACCESS_TOKEN_MISSING');
const approverAccessToken = await signInActor(approverEmail, approverPassword, 'REAL_48_APPROVER_ACCESS_TOKEN_MISSING');
const requesterUserId = await currentUserId(accessToken);
const approverUserId = await currentUserId(approverAccessToken);
if (requesterUserId === approverUserId) throw new Error('REAL_48_APPROVER_MUST_DIFFER_FROM_REQUESTER');

async function restRpc(functionName, payload, token = accessToken) {
  return fetchJson(supabaseURL + '/rest/v1/rpc/' + functionName, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(payload),
  });
}

async function restSelect(table, filters, select, options = {}, token = accessToken) {
  const url = new URL(supabaseURL + '/rest/v1/' + table);
  url.searchParams.set('select', select);
  for (const [column, value] of Object.entries(filters)) url.searchParams.set(column, 'eq.' + value);
  if (options.order) url.searchParams.set('order', options.order);
  if (options.limit) url.searchParams.set('limit', String(options.limit));
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: 'Bearer ' + accessToken,
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(table + '_HTTP_' + response.status + ':' + body.slice(0, 1200));
  return body ? JSON.parse(body) : [];
}

const companies = await restSelect('report_execution_jobs', { status: 'completed' }, 'company_id', { limit: 1000 });
const tenantIds = [...new Set(companies.map((row) => row.company_id).filter(Boolean))];
if (tenantIds.length === 0) throw new Error('REAL_48_PROOF_NO_COMPLETED_REPORT_JOBS');

const proof = {
  exactHead,
  generatedAt: new Date().toISOString(),
  status: 'NOT_PROVEN',
  tenantIds,
  sourceJobsScanned: 0,
  archetypes: [],
};

const allProfiles = listReportArchetypes();
const byId = new Map(allProfiles.map((profile) => [profile.id, profile]));
const candidateJobs = [];

for (const companyId of tenantIds) {
  const jobs = await restSelect(
    'report_execution_jobs',
    { company_id: companyId, status: 'completed' },
    'id,company_id,source_path,source_hash,evidence,completed_at',
    { order: 'completed_at.desc', limit: 500 },
  );
  proof.sourceJobsScanned += jobs.length;

  const hashes = [...new Set(jobs.map((job) => String(job.source_hash ?? '')).filter(Boolean))];
  const analysesByHash = new Map();
  for (let i = 0; i < hashes.length; i += 100) {
    const batch = hashes.slice(i, i + 100);
    if (!batch.length) continue;
    const url = new URL(supabaseURL + '/rest/v1/source_analysis_snapshots');
    url.searchParams.set('select', 'source_hash,row_count,datasets,created_at');
    url.searchParams.set('company_id', 'eq.' + companyId);
    url.searchParams.set('source_hash', 'in.(' + batch.map((hash) => '"' + hash.replaceAll('"', '') + '"').join(',') + ')');
    url.searchParams.set('order', 'created_at.desc');
    const response = await fetch(url, { headers: { apikey: anonKey, Authorization: 'Bearer ' + accessToken } });
    const body = await response.text();
    if (!response.ok) throw new Error('source_analysis_snapshots_HTTP_' + response.status + ':' + body.slice(0, 1200));
    const analyses = body ? JSON.parse(body) : [];
    for (const analysis of analyses) {
      const hash = String(analysis.source_hash ?? '');
      if (hash && !analysesByHash.has(hash)) analysesByHash.set(hash, analysis);
    }
  }

  for (const job of jobs) {
    const rendered = job?.evidence?.renderedOutput;
    if (!rendered || typeof rendered !== 'object') continue;
    const analysis = analysesByHash.get(String(job.source_hash ?? '')) ?? null;
    const dataset = analysis?.datasets?.[0];
    const columns = Array.isArray(dataset?.columns) ? dataset.columns : [];
    const availableFields = [...new Set(columns.map((column) => column?.mappedField).filter(Boolean))];
    const detected = detectReportArchetype({
      sourcePath: String(job.source_path ?? ''),
      specialty: typeof rendered.sourceSpecialty === 'string' ? rendered.sourceSpecialty : null,
      availableFields,
    });
    // Runtime proof must be derived from canonical source analysis, not trusted from rendered output metadata.
    // A rendered archetype id is accepted only when it exactly agrees with the detector result.
    const detectedArchetypeId = detected.profile?.id ?? null;
    const renderedArchetypeId = typeof rendered.archetypeId === 'string' && byId.has(rendered.archetypeId)
      ? rendered.archetypeId
      : null;
    if (!detectedArchetypeId || !byId.has(detectedArchetypeId)) continue;
    if (renderedArchetypeId && renderedArchetypeId !== detectedArchetypeId) {
      continue;
    }
    candidateJobs.push({
      job,
      rendered,
      archetypeId: detectedArchetypeId,
      detectionEvidence: {
        sourcePath: String(job.source_path ?? ''),
        specialty: typeof rendered.sourceSpecialty === 'string' ? rendered.sourceSpecialty : null,
        availableFields,
      },
    });
  }
}

for (const profile of allProfiles) {
  const candidate = candidateJobs.find((item) => item.archetypeId === profile.id);
  if (!candidate) {
    proof.archetypes.push({
      number: profile.number,
      archetypeId: profile.id,
      title: profile.title,
      status: 'NOT_PROVEN_REAL_SOURCE',
      reason: 'NO_COMPLETED_REAL_REPORT_WITH_EXACT_ARCHETYPE_ID',
    });
    continue;
  }

  const { job, rendered } = candidate;
  const analysisRows = await restSelect(
    'source_analysis_snapshots',
    { company_id: job.company_id, source_hash: job.source_hash },
    'id,import_job_id,row_count,datasets,created_at',
    { order: 'created_at.desc', limit: 1 },
  );
  const analysis = analysisRows[0] ?? null;
  const dataset = analysis?.datasets?.[0];
  const columns = Array.isArray(dataset?.columns) ? dataset.columns : [];
  const availableFields = [...new Set(columns.map((column) => column?.mappedField).filter(Boolean))];
  const sourceRows = await restSelect(
    'canonical_dataset_records',
    { company_id: job.company_id, source_hash: job.source_hash, import_job_id: analysis?.import_job_id ?? '' },
    'id,company_id,import_job_id,source_hash,row_number,data,provenance',
    { order: 'row_number.asc', limit: 5000 },
  );
  const passportRows = await restSelect(
    'report_evidence_passports',
    { company_id: job.company_id, report_execution_job_id: job.id, source_hash: job.source_hash },
    'id,company_id,report_execution_job_id,evidence_snapshot_id,source_hash,verification_status,decision_readiness,acceptance_status',
    { order: 'updated_at.desc', limit: 5 },
  );
  const passport = passportRows.find((row) =>
    String(row.company_id) === String(job.company_id) &&
    String(row.report_execution_job_id) === String(job.id) &&
    String(row.source_hash) === String(job.source_hash) &&
    String(row.verification_status) === 'VERIFIED' &&
    String(row.decision_readiness) === 'READY'
  ) ?? null;
  const renderedSnapshotId = typeof rendered.evidenceSnapshotId === 'string' ? rendered.evidenceSnapshotId : null;
  const renderedPassportId = typeof rendered.evidencePassportId === 'string' ? rendered.evidencePassportId : null;
  const evidenceSnapshotId = passport ? String(passport.evidence_snapshot_id ?? '') || renderedSnapshotId : null;
  const evidencePassportId = passport ? String(passport.id) : null;
  let snapshot = null;
  if (passport && evidenceSnapshotId) {
    const snapshotRows = await restSelect(
      'report_evidence_snapshots',
      { company_id: job.company_id, id: evidenceSnapshotId, report_execution_job_id: job.id, source_hash: job.source_hash },
      'id,company_id,report_execution_job_id,source_version_id,analysis_snapshot_id,source_hash,canonical_coverage_status,acceptance_status,verification_status',
      { limit: 2 },
    );
    snapshot = snapshotRows.find((row) =>
      String(row.company_id) === String(job.company_id) &&
      String(row.report_execution_job_id) === String(job.id) &&
      String(row.source_hash) === String(job.source_hash) &&
      String(row.verification_status) === 'VERIFIED' &&
      String(row.canonical_coverage_status) === 'FULL'
    ) ?? null;
  }
  if (!passport || !evidenceSnapshotId || !snapshot) {
    proof.archetypes.push({
      number: profile.number,
      archetypeId: profile.id,
      title: profile.title,
      status: 'REVIEW_REQUIRED',
      sourcePath: job.source_path ?? null,
      sourceHash: job.source_hash,
      reportJobId: job.id,
      tenantId: job.company_id,
      evidenceSnapshotId: renderedSnapshotId,
      evidencePassportId: renderedPassportId,
      reason: 'REAL_SOURCE_EVIDENCE_SNAPSHOT_NOT_VERIFIED_FULL_FOR_EXACT_JOB_HASH',
    });
    continue;
  }
  if (renderedSnapshotId && renderedSnapshotId !== evidenceSnapshotId) throw new Error('REAL_48_RENDERED_SNAPSHOT_MISMATCH:' + profile.id);
  if (renderedPassportId && renderedPassportId !== evidencePassportId) throw new Error('REAL_48_RENDERED_PASSPORT_MISMATCH:' + profile.id);

  const result = runReportArchetype({
    archetypeId: profile.id,
    report: {
      specialty: profile.adapterSpecialty,
      rowCount: Number(job?.evidence?.renderedOutput?.rowCount ?? analysis?.row_count ?? sourceRows.length),
      canonicalRows: sourceRows.map((row) => ({ row_number: row.row_number, data: row.data })),
      sourceAnalysis: { datasets: analysis?.datasets ?? [] },
    },
    availableFields: availableFields,
    sampleSize: sourceRows.length,
    provenance: {
      tenantId: job.company_id,
      sourceHash: job.source_hash,
      reportExecutionJobId: job.id,
      evidenceSnapshotId,
      evidencePassportId,
      sourceVersionId: typeof rendered.sourceVersionId === 'string' ? rendered.sourceVersionId : null,
    },
    profileVersion: profile.version,
  });

  const validProof =
    result.profile.id === profile.id &&
    result.state === 'SUPPORTED' &&
    result.advisory.claims.length > 0 &&
    result.advisory.questions.length > 0 &&
    result.advisory.proofState === 'VERIFIED' &&
    result.advisory.claims.every((claim) =>
      claim.archetypeId === profile.id &&
      claim.tenantId === job.company_id &&
      claim.sourceHash === job.source_hash &&
      claim.reportExecutionJobId === job.id &&
      claim.evidenceSnapshotId === evidenceSnapshotId
    ) &&
    result.intelligence.signals.some((signal) => signal.id === 'model:' + profile.id) &&
    result.intelligence.recommendations.some((recommendation) => recommendation.id === 'rec:archetype:' + profile.id) &&
    Boolean(evidenceSnapshotId && evidencePassportId && snapshot);

  proof.archetypes.push({
    number: profile.number,
    archetypeId: profile.id,
    title: profile.title,
    status: validProof ? 'SUPPORTED' : 'REVIEW_REQUIRED',
    sourcePath: job.source_path ?? null,
    sourceHash: job.source_hash,
    reportJobId: job.id,
    tenantId: job.company_id,
    evidenceSnapshotId,
    evidencePassportId,
    sourceRowCount: sourceRows.length,
    availableFieldCount: availableFields.length,
    advisoryQuestionCount: result.advisory.questions.length,
    advisoryClaimCount: result.advisory.claims.length,
    advisoryProofState: result.advisory.proofState,
    runtimeState: result.state,
    recommendationCount: result.intelligence.recommendations.length,
    reason: validProof ? null : 'REAL_SOURCE_RUNTIME_PROOF_INCOMPLETE',
  });
}

const supported = proof.archetypes.filter((item) => item.status === 'SUPPORTED').length;
const missing = proof.archetypes.filter((item) => item.status === 'NOT_PROVEN_REAL_SOURCE').length;
const review = proof.archetypes.filter((item) => item.status === 'REVIEW_REQUIRED').length;

if (supported === 48 && missing === 0 && review === 0) {
  const lineage = [];
  const runId = process.env.GITHUB_RUN_ID || ('local-' + Date.now());

  for (const item of proof.archetypes) {
    const signalId = 'real-48:' + runId + ':' + item.archetypeId;
    const proposal = await restRpc('create_source_intelligence_proposal', {
      p_report_job_id: item.reportJobId,
      p_source_hash: item.sourceHash,
      p_signal_id: signalId,
      p_signal_title: item.title,
      p_signal_message: 'Real-source archetype advisory lineage proof for ' + item.archetypeId,
      p_severity: 'medium',
      p_evidence: {
        gate: 'REAL_48_ARCHETYPE_LINEAGE',
        exactHead,
        archetypeId: item.archetypeId,
        evaluatorId: 'archetype.evaluator.' + item.archetypeId,
        sourceHash: item.sourceHash,
        reportExecutionJobId: item.reportJobId,
        evidenceSnapshotId: item.evidenceSnapshotId,
        evidencePassportId: item.evidencePassportId,
        measurementStatus: 'INSUFFICIENT',
      },
      p_evidence_snapshot_id: item.evidenceSnapshotId,
    });
    const proposalRow = Array.isArray(proposal) ? proposal[0] : proposal;
    if (!proposalRow?.recommendation_id || !proposalRow?.decision_id) {
      throw new Error('REAL_48_LINEAGE_RECOMMENDATION_DECISION_MISSING:' + item.archetypeId);
    }

    const recommendationId = String(proposalRow.recommendation_id);
    const decisionId = String(proposalRow.decision_id);
    const approvalId = String(await restRpc('request_decision_approval', {
      p_decision_id: decisionId,
      p_reason: 'REAL_48_ARCHETYPE_LINEAGE_GATE',
    }, accessToken));
    await restRpc('decide_approval', {
      p_approval_id: approvalId,
      p_approve: true,
      p_reason: 'REAL_48_DISTINCT_APPROVER_PROOF; no outcome or impact fabricated.',
    }, approverAccessToken);

    const workItemId = String(await restRpc('create_decision_work_item', {
      p_decision_id: decisionId,
      p_recommendation_id: recommendationId,
      p_department: '48-archetype-gate',
      p_assignee_id: null,
      p_assignee_label: 'Report-Advisor 48 Archetype Gate',
      p_title: item.title,
      p_description: 'Source-bound archetype action-lineage proof.',
      p_priority: 'HIGH',
      p_due_at: null,
      p_expected_impact: null,
      p_evidence_refs: [{
        archetypeId: item.archetypeId,
        sourceHash: item.sourceHash,
        reportExecutionJobId: item.reportJobId,
        evidenceSnapshotId: item.evidenceSnapshotId,
        evidencePassportId: item.evidencePassportId,
      }],
    }, approverAccessToken));

    await restRpc('start_decision_work_item', { p_work_item_id: workItemId }, approverAccessToken);
    await restRpc('complete_decision_work_item', {
      p_work_item_id: workItemId,
      p_actual_impact: null,
      p_evidence: {
        gate: 'REAL_48_ARCHETYPE_LINEAGE',
        measurementStatus: 'INSUFFICIENT',
        actualImpact: null,
        expectedImpact: null,
        archetypeId: item.archetypeId,
        sourceHash: item.sourceHash,
        reportExecutionJobId: item.reportJobId,
        evidenceSnapshotId: item.evidenceSnapshotId,
      },
    }, approverAccessToken);

    const recommendations = await restSelect(
      'recommendations',
      { company_id: item.tenantId, id: recommendationId },
      'id,company_id,decision_id,evidence_snapshot_id,status,evidence,expected_impact,actual_impact',
      { limit: 1 },
    );
    const decisions = await restSelect(
      'business_intelligence_decisions',
      { company_id: item.tenantId, id: decisionId },
      'id,company_id,recommendation_id,status,evidence,approved_at,executed_at',
      { limit: 1 },
    );
    const approvals = await restSelect(
      'decision_approvals',
      { company_id: item.tenantId, id: approvalId, decision_id: decisionId },
      'id,company_id,decision_id,status,requested_by,decided_by,decided_at',
      { limit: 1 },
    );
    const workItems = await restSelect(
      'decision_work_items',
      { company_id: item.tenantId, id: workItemId, decision_id: decisionId },
      'id,company_id,decision_id,recommendation_id,status,expected_impact,actual_impact,evidence_refs',
      { limit: 1 },
    );
    const outcomes = await restSelect(
      'recommendation_outcomes',
      { company_id: item.tenantId, decision_id: decisionId },
      'id,company_id,decision_id,status,expected_impact,actual_impact,observed_at,observed_by,evidence',
      { order: 'observed_at.desc', limit: 5 },
    );

    const recommendation = recommendations[0];
    const decision = decisions[0];
    const approval = approvals[0];
    const workItem = workItems[0];
    const outcome = outcomes[0];

    if (!recommendation || !decision || !approval || !workItem || !outcome) {
      throw new Error('REAL_48_LINEAGE_READBACK_MISSING:' + item.archetypeId);
    }
    if (String(recommendation.company_id) !== String(item.tenantId) ||
        String(decision.company_id) !== String(item.tenantId) ||
        String(approval.company_id) !== String(item.tenantId) ||
        String(workItem.company_id) !== String(item.tenantId) ||
        String(outcome.company_id) !== String(item.tenantId)) {
      throw new Error('REAL_48_LINEAGE_TENANT_MISMATCH:' + item.archetypeId);
    }
    if (String(recommendation.decision_id) !== decisionId) throw new Error('REAL_48_LINEAGE_RECOMMENDATION_DECISION_MISMATCH:' + item.archetypeId);
    if (String(decision.recommendation_id) !== recommendationId) throw new Error('REAL_48_LINEAGE_DECISION_RECOMMENDATION_MISMATCH:' + item.archetypeId);
    if (approval.status !== 'APPROVED') throw new Error('REAL_48_LINEAGE_APPROVAL_NOT_APPROVED:' + item.archetypeId);
    if (String(approval.requested_by) === String(approval.decided_by)) throw new Error('REAL_48_LINEAGE_APPROVER_NOT_DISTINCT:' + item.archetypeId);
    if (String(approval.decided_by) !== approverUserId) throw new Error('REAL_48_LINEAGE_APPROVER_ID_MISMATCH:' + item.archetypeId);
    if (String(workItem.decision_id) !== decisionId || String(workItem.recommendation_id) !== recommendationId) throw new Error('REAL_48_LINEAGE_WORK_LINK_MISMATCH:' + item.archetypeId);
    if (workItem.status !== 'COMPLETED') throw new Error('REAL_48_LINEAGE_WORK_NOT_COMPLETED:' + item.archetypeId);
    if (workItem.actual_impact !== null) throw new Error('REAL_48_LINEAGE_FABRICATED_WORK_IMPACT:' + item.archetypeId);
    if (String(outcome.decision_id) !== decisionId || outcome.status !== 'insufficient') throw new Error('REAL_48_LINEAGE_OUTCOME_STATE_MISMATCH:' + item.archetypeId);
    if (outcome.expected_impact !== null || outcome.actual_impact !== null) throw new Error('REAL_48_LINEAGE_FABRICATED_OUTCOME_IMPACT:' + item.archetypeId);
    if (!outcome.observed_by) throw new Error('REAL_48_LINEAGE_OBSERVED_BY_MISSING:' + item.archetypeId);
    if (String(outcome.observed_by) !== approverUserId) throw new Error('REAL_48_LINEAGE_OBSERVED_BY_MISMATCH:' + item.archetypeId);
    if (!outcome.observed_at) throw new Error('REAL_48_LINEAGE_OBSERVED_AT_MISSING:' + item.archetypeId);

    lineage.push({
      archetypeId: item.archetypeId,
      tenantId: item.tenantId,
      sourcePath: item.sourcePath,
      sourceHash: item.sourceHash,
      reportExecutionJobId: item.reportJobId,
      evidenceSnapshotId: item.evidenceSnapshotId,
      evidencePassportId: item.evidencePassportId,
      recommendationId,
      decisionId,
      approvalId,
      workItemId,
      outcomeId: String(outcome.id),
      outcomeStatus: outcome.status,
      expectedImpact: outcome.expected_impact,
      actualImpact: outcome.actual_impact,
      learningState: 'INSUFFICIENT',
    });
  }

  proof.lineage = {
    status: 'PASS',
    runId,
    matrixCount: lineage.length,
    closureState: '48/48 RECOMMENDATION→DECISION→APPROVAL→WORK→INSUFFICIENT OUTCOME→READBACK→LEARNING',
    noFabricatedImpact: true,
    matrix: lineage,
  };
} else {
  proof.lineage = {
    status: 'NOT_RUN',
    reason: '48_REAL_SOURCE_RUNTIME_NOT_CLOSED',
  };
}

proof.summary = { total: proof.archetypes.length, supported, missing, review, lineageStatus: proof.lineage.status };
proof.status = supported === 48 && missing === 0 && review === 0 && proof.lineage.status === 'PASS' ? 'PASS' : 'NOT_PROVEN';

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(outFile, JSON.stringify(proof, null, 2));

console.log(JSON.stringify(proof, null, 2));
if (proof.status !== 'PASS') {
  console.error('REAL_48_ARCHETYPE_PROOF_NOT_COMPLETE:supported=' + supported + ':missing=' + missing + ':review=' + review);
  process.exitCode = 1;
}
