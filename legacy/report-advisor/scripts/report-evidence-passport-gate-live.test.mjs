import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const resilientFetch = async (input, init = {}) => {
  let last;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!RETRYABLE_HTTP.has(response.status) || attempt === 20) return response;
      last = new Error('SUPABASE_RETRYABLE_HTTP_' + response.status);
    } catch (error) {
      last = error;
      if (attempt === 20) throw error;
    }
    await wait(Math.min(10000, 1000 * 2 ** (attempt - 1)));
  }
  throw last ?? new Error('SUPABASE_RETRY_EXHAUSTED');
};

const url = process.env.REPORT_ADVISOR_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY?.trim();

for (const [name, value] of Object.entries({
  REPORT_ADVISOR_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  REPORT_ADVISOR_SUPABASE_ANON_KEY: anonKey,
})) {
  if (!value) throw new Error('LIVE_GATE_ENV_REQUIRED:' + name);
}

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: resilientFetch },
});

const timeoutFetch = async (input, init = {}) => {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('LIVE_GATE_REQUEST_TIMEOUT')), 30000);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!RETRYABLE_HTTP.has(response.status) || attempt === 4) return response;
      lastError = new Error('LIVE_GATE_RETRYABLE_HTTP_' + response.status);
    } catch (error) {
      lastError = error;
      if (attempt === 4) throw error;
    } finally {
      clearTimeout(timer);
    }
    await wait(1000 * 2 ** (attempt - 1));
  }
  throw lastError ?? new Error('LIVE_GATE_REQUEST_RETRY_EXHAUSTED');
};

const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: resilientFetch },
});

const runTag = 'gate-live-' + Date.now() + '-' + randomUUID().slice(0, 8);
const users = [];
const created = {
  recommendations: [],
  decisions: [],
  approvals: [],
  work: [],
  outcomes: [],
};

async function expectBlocked(label, fn, expectedErrors = []) {
  try {
    await fn();
    throw new Error(label + '_UNEXPECTED_ALLOW');
  } catch (error) {
    const message = String(error?.message ?? error);
    const acceptedErrors = Array.isArray(expectedErrors) ? expectedErrors : [expectedErrors];
    assert.ok(
      acceptedErrors.some((expectedError) => message.includes(expectedError)),
      label + '_WRONG_ERROR:' + message,
    );
    return message;
  }
}

async function createUser(label) {
  const email = label.toLowerCase() + '-' + runTag + '@e2e.report-advisor.invalid';
  const password = 'Gate-' + randomUUID() + '-Aa9!';
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { e2e_actor: 'true', e2e_purpose: 'full-product-browser-e2e' },
  });
  if (error) throw error;
  users.push(String(data.user.id));
  return { id: String(data.user.id), email, password };
}

async function provisionMembership(companyId, userId, role = 'admin') {
  const { data, error } = await service.rpc('provision_e2e_test_membership', {
    p_company_id: companyId,
    p_user_id: userId,
    p_role: role,
    p_is_default: true,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function signIn(credentials) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: timeoutFetch },
  });
  const { error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error) throw error;
  return client;
}

const { data: passports, error: passportError } = await service
  .from('report_evidence_passports')
  .select('id,company_id,evidence_snapshot_id,report_execution_job_id,source_hash,verification_status,decision_readiness,prior_verification_state')
  .eq('verification_status', 'VERIFIED')
  .eq('decision_readiness', 'READY')
  .order('created_at', { ascending: false })
  .limit(1);

if (passportError) throw passportError;
const passport = passports?.[0];
if (!passport) throw new Error('LIVE_GATE_VERIFIED_PASSPORT_MISSING');

const { data: companies, error: companyError } = await service
  .from('companies')
  .select('id,name')
  .order('created_at', { ascending: true })
  .limit(100);
if (companyError) throw companyError;

const isAllowedE2ETenant = (name) =>
  name === 'RUNTIME-EVIDENCE-A-401117' ||
  String(name ?? '').startsWith('Aghbari Report Corpus CI ');

const otherCompany = (companies ?? []).find(
  (company) => company.id !== passport.company_id && isAllowedE2ETenant(company.name),
);

if (!otherCompany) {
  throw new Error('LIVE_GATE_SECOND_ALLOWED_TENANT_MISSING');
}

const { data: completionSnapshots, error: completionSnapshotError } = await service
  .from('source_analysis_snapshots')
  .select('id')
  .eq('company_id', passport.company_id)
  .eq('source_hash', passport.source_hash)
  .order('created_at', { ascending: false })
  .limit(1);
if (completionSnapshotError) throw completionSnapshotError;
const completionEvidenceSnapshotId = completionSnapshots?.[0]?.id;
if (!completionEvidenceSnapshotId) throw new Error('LIVE_GATE_SOURCE_ANALYSIS_SNAPSHOT_MISSING');

const userA = await createUser('gate-auth-a');
const userB = await createUser('gate-auth-b');
const approver = await createUser('gate-approver');

await provisionMembership(passport.company_id, userA.id, 'admin');
await provisionMembership(otherCompany.id, userB.id, 'admin');
await provisionMembership(passport.company_id, approver.id, 'admin');

const clientA = await signIn(userA);
const clientB = await signIn(userB);
const clientApprover = await signIn(approver);

const { data: sameTenantPassports, error: sameTenantReadError } = await clientA
  .from('report_evidence_passports')
  .select('id,company_id,evidence_snapshot_id,report_execution_job_id,source_hash')
  .eq('id', passport.id);

if (sameTenantReadError) throw sameTenantReadError;
assert.equal(sameTenantPassports?.length, 1, 'AUTHENTICATED_SAME_TENANT_PASSPORT_READ_MISSING');
assert.equal(
  String(sameTenantPassports[0]?.company_id),
  String(passport.company_id),
  'AUTHENTICATED_SAME_TENANT_PASSPORT_WRONG_COMPANY',
);

const { data: wrongTenantPassports, error: wrongTenantReadError } = await clientB
  .from('report_evidence_passports')
  .select('id')
  .eq('id', passport.id);

if (wrongTenantReadError) throw wrongTenantReadError;
assert.equal(wrongTenantPassports?.length, 0, 'AUTHENTICATED_WRONG_TENANT_PASSPORT_LEAK');

const { data: anonymousPassports, error: anonymousReadError } = await anon
  .from('report_evidence_passports')
  .select('id')
  .eq('id', passport.id);

assert.ok(
  anonymousReadError,
  'ANONYMOUS_PASSPORT_SELECT_UNEXPECTED_ALLOW',
);


const fakeSnapshot = randomUUID();
const fakeJob = randomUUID();
const fakeHash = 'sha256:gate-fake-' + randomUUID().replaceAll('-', '');
const exactEvidence = {
  type: 'SOURCE_INTELLIGENCE_SIGNAL',
  reportExecutionJobId: passport.report_execution_job_id,
  sourceHash: passport.source_hash,
  evidenceSnapshotId: passport.evidence_snapshot_id,
  evidencePassportId: passport.id,
  signalId: 'gate-live-valid',
  signalTitle: 'Gate live validation',
};

const noPassportRecommendationMessage = await expectBlocked(
  'RECOMMENDATION_NO_VERIFIED_PASSPORT',
  async () => {
    const { error } = await clientA.rpc('create_runtime_recommendation', {
      p_category: 'source-intelligence',
      p_priority: 'medium',
      p_title: 'gate no passport recommendation',
      p_description: 'must block',
      p_evidence: {
        ...exactEvidence,
        reportExecutionJobId: fakeJob,
        sourceHash: fakeHash,
        evidenceSnapshotId: fakeSnapshot,
      },
      p_expected_impact: null,
      p_evidence_snapshot_id: fakeSnapshot,
      p_metric_versions: {},
    });
    if (error) throw error;
  },
  ['SOURCE_RECOMMENDATION_EVIDENCE_PASSPORT_REQUIRED'],
);

const noPassportDecisionMessage = await expectBlocked(
  'DECISION_NO_VERIFIED_PASSPORT',
  async () => {
    const { error } = await clientA.rpc('create_runtime_decision', {
      p_decision_key: 'gate-live-no-passport-' + randomUUID(),
      p_decision_type: 'SOURCE_INTELLIGENCE_SIGNAL',
      p_confidence: null,
      p_expected_impact: null,
      p_evidence: {
        ...exactEvidence,
        reportExecutionJobId: fakeJob,
        sourceHash: fakeHash,
        evidenceSnapshotId: fakeSnapshot,
      },
    });
    if (error) throw error;
  },
  ['SOURCE_DECISION_EVIDENCE_PASSPORT_REQUIRED'],
);

const unauthorizedMessage = await expectBlocked(
  'WRONG_TENANT_AUTHENTICATED',
  async () => {
    const { error } = await clientB.rpc('create_runtime_recommendation', {
      p_category: 'source-intelligence',
      p_priority: 'medium',
      p_title: 'gate wrong tenant',
      p_description: 'must block',
      p_evidence: exactEvidence,
      p_expected_impact: null,
      p_evidence_snapshot_id: passport.evidence_snapshot_id,
      p_metric_versions: {},
    });
    if (error) throw error;
  },
  ['SOURCE_RECOMMENDATION_EVIDENCE_PASSPORT_REQUIRED', 'RECOMMENDATION_EVIDENCE_NOT_FOUND_OR_FORBIDDEN'],
);

const wrongTenantRow = {
  company_id: otherCompany.id,
  category: 'source-intelligence',
  priority: 'medium',
  title: 'gate service wrong tenant ' + runTag,
  description: 'must block',
  evidence: exactEvidence,
  expected_impact: null,
  evidence_snapshot_id: passport.evidence_snapshot_id,
};
const wrongTenantMessage = await expectBlocked(
  'SERVICE_ROLE_WRONG_TENANT_PASSPORT',
  async () => {
    const { error } = await service.from('recommendations').insert(wrongTenantRow);
    if (error) throw error;
  },
  ['SOURCE_RECOMMENDATION_EVIDENCE_PASSPORT_REQUIRED'],
);

const wrongJobMessage = await expectBlocked(
  'SERVICE_ROLE_WRONG_JOB',
  async () => {
    const { error } = await service.from('recommendations').insert({
      ...wrongTenantRow,
      company_id: passport.company_id,
      title: 'gate wrong job ' + runTag,
      evidence: { ...exactEvidence, reportExecutionJobId: fakeJob },
    });
    if (error) throw error;
  },
  ['SOURCE_RECOMMENDATION_EVIDENCE_PASSPORT_REQUIRED'],
);

const wrongHashMessage = await expectBlocked(
  'SERVICE_ROLE_WRONG_HASH',
  async () => {
    const { error } = await service.from('recommendations').insert({
      ...wrongTenantRow,
      company_id: passport.company_id,
      title: 'gate wrong hash ' + runTag,
      evidence: { ...exactEvidence, sourceHash: fakeHash },
    });
    if (error) throw error;
  },
  ['SOURCE_RECOMMENDATION_EVIDENCE_PASSPORT_REQUIRED'],
);

const { data: validRecommendationId, error: validRecommendationError } = await clientA.rpc('create_runtime_recommendation', {
  p_category: 'source-intelligence',
  p_priority: 'medium',
  p_title: 'gate valid source recommendation ' + runTag,
  p_description: 'live gate proof',
  p_evidence: exactEvidence,
  p_expected_impact: null,
  p_evidence_snapshot_id: passport.evidence_snapshot_id,
  p_metric_versions: {},
});
if (validRecommendationError) throw validRecommendationError;
assert.ok(validRecommendationId);
created.recommendations.push(String(validRecommendationId));

const { data: validDecisionId, error: validDecisionError } = await clientA.rpc('create_runtime_decision', {
  p_decision_key: 'gate-live-valid-' + runTag,
  p_decision_type: 'SOURCE_INTELLIGENCE_SIGNAL',
  p_confidence: null,
  p_expected_impact: null,
  p_evidence: { ...exactEvidence, recommendationId: String(validRecommendationId) },
});
if (validDecisionError) throw validDecisionError;
assert.ok(validDecisionId);
created.decisions.push(String(validDecisionId));

const { error: linkError } = await clientA.rpc('link_recommendation_to_decision', {
  p_recommendation_id: String(validRecommendationId),
  p_decision_id: String(validDecisionId),
});
if (linkError) throw linkError;

const wrongDecisionMessage = await expectBlocked(
  'SERVICE_ROLE_DECISION_WRONG_HASH',
  async () => {
    const { error } = await service.from('business_intelligence_decisions').insert({
      company_id: passport.company_id,
      decision_key: 'gate-wrong-decision-hash-' + runTag,
      decision_type: 'SOURCE_INTELLIGENCE_SIGNAL',
      status: 'PROPOSED',
      confidence: null,
      expected_impact: null,
      evidence: { ...exactEvidence, sourceHash: fakeHash },
    });
    if (error) throw error;
  },
  ['SOURCE_DECISION_EVIDENCE_PASSPORT_REQUIRED'],
);

const { data: approvalId, error: approvalError } = await clientA.rpc('request_decision_approval', {
  p_decision_id: validDecisionId,
  p_reason: 'Live Evidence Passport gate proof',
});
if (approvalError) throw approvalError;
assert.ok(approvalId);
created.approvals.push(String(approvalId));

const { error: decideError } = await clientApprover.rpc('decide_approval', {
  p_approval_id: approvalId,
  p_approve: true,
  p_reason: 'Live gate proof approved',
});
if (decideError) throw decideError;

const wrongWorkMessage = await expectBlocked(
  'WORK_WRONG_SOURCE_IDENTITY',
  async () => {
    const { error } = await service.from('decision_work_items').insert({
      company_id: passport.company_id,
      decision_id: validDecisionId,
      recommendation_id: validRecommendationId,
      department: 'gate-test',
      title: 'gate wrong source work ' + runTag,
      priority: 'MEDIUM',
      status: 'OPEN',
      evidence_refs: [{
        type: 'SOURCE_REPORT',
        evidenceSnapshotId: passport.evidence_snapshot_id,
        reportExecutionJobId: fakeJob,
        sourceHash: passport.source_hash,
      }],
      expected_impact: null,
    });
    if (error) throw error;
  },
  ['SOURCE_WORK_EVIDENCE_PASSPORT_REQUIRED'],
);

const { data: validWorkId, error: validWorkError } = await clientA.rpc('create_decision_work_item', {
  p_decision_id: validDecisionId,
  p_recommendation_id: validRecommendationId,
  p_department: 'gate-test',
  p_assignee_id: userA.id,
  p_assignee_label: 'Gate live actor',
  p_title: 'gate valid source work ' + runTag,
  p_description: 'live gate proof',
  p_priority: 'MEDIUM',
  p_due_at: null,
  p_expected_impact: null,
  p_evidence_refs: [{
    type: 'SOURCE_REPORT',
    evidenceSnapshotId: passport.evidence_snapshot_id,
    reportExecutionJobId: passport.report_execution_job_id,
    sourceHash: passport.source_hash,
    evidencePassportId: passport.id,
  }],
});
if (validWorkError) throw validWorkError;
assert.ok(validWorkId);
created.work.push(String(validWorkId));

const { error: startWorkError } = await clientA.rpc('start_decision_work_item', {
  p_work_item_id: validWorkId,
});
if (startWorkError) throw startWorkError;

const { error: completeError } = await clientA.rpc('complete_decision_work_item', {
  p_work_item_id: validWorkId,
  p_actual_impact: null,
  p_evidence: {
    ...exactEvidence,
    evidence_snapshot_id: completionEvidenceSnapshotId,
    outcomeStatus: 'LIVE_GATE_PROOF',
  },
});
if (completeError) throw completeError;

const { data: outcomeRows, error: outcomeError } = await service
  .from('recommendation_outcomes')
  .select('id,status,evidence')
  .eq('company_id', passport.company_id)
  .eq('decision_id', validDecisionId)
  .order('observed_at', { ascending: false })
  .limit(1);
if (outcomeError) throw outcomeError;
assert.ok(outcomeRows?.[0]?.id, 'VALID_OUTCOME_NOT_CAPTURED');
created.outcomes.push(String(outcomeRows[0].id));

const anonInsert = {
  company_id: passport.company_id,
  category: 'source-intelligence',
  priority: 'medium',
  title: 'gate anonymous ' + runTag,
  evidence: exactEvidence,
  evidence_snapshot_id: passport.evidence_snapshot_id,
};
const anonymousMessage = await expectBlocked(
  'ANONYMOUS_DIRECT_INSERT',
  async () => {
    const { error } = await anon.from('recommendations').insert(anonInsert);
    if (error) throw error;
  },
  ['permission denied', '42501', 'new row violates row-level security policy'],
);

await service.from('recommendation_outcomes').delete().eq('id', outcomeRows[0].id);
await service.from('decision_work_items').delete().eq('id', validWorkId);
await service.from('decision_approvals').delete().eq('id', approvalId);
await service.from('business_intelligence_decisions').delete().eq('id', validDecisionId);
await service.from('recommendations').delete().eq('id', validRecommendationId);

for (const userId of users) {
  await service.auth.admin.deleteUser(userId);
}

console.log(JSON.stringify({
  status: 'PASS',
  live: true,
  passport: {
    id: passport.id,
    companyId: passport.company_id,
    evidenceSnapshotId: passport.evidence_snapshot_id,
    reportExecutionJobId: passport.report_execution_job_id,
    sourceHash: passport.source_hash,
    legacyPriorVerification: passport.prior_verification_state,
  },
  cases: {
    recommendationWithoutVerifiedPassport: { state: 'BLOCKED', error: noPassportRecommendationMessage },
    decisionWithoutVerifiedPassport: { state: 'BLOCKED', error: noPassportDecisionMessage },
    workWithoutVerifiedPassport: { state: 'BLOCKED', error: wrongWorkMessage },
    verifiedPassportSameTenantSource: { state: 'ALLOWED' },
    otherTenantPassport: { state: 'BLOCKED', error: wrongTenantMessage },
    sameSnapshotWrongJob: { state: 'BLOCKED', error: wrongJobMessage },
    sameSnapshotWrongHash: { state: 'BLOCKED', error: wrongHashMessage },
    authenticatedWrongTenant: { state: 'BLOCKED', error: unauthorizedMessage },
    serviceRoleValidPath: { state: 'ALLOWED_BY_EXPLICIT_SERVICE_ROLE_BOUNDARY' },
    anonymous: { state: 'BLOCKED', error: anonymousMessage },
    sourceDecisionWrongHash: { state: 'BLOCKED', error: wrongDecisionMessage },
  },
  chain: {
    recommendation: 'ALLOWED',
    decision: 'ALLOWED',
    approval: 'ALLOWED',
    work: 'ALLOWED',
    outcome: 'CAPTURED',
  },
}, null, 2));