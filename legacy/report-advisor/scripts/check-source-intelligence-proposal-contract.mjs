import fs from 'node:fs';
import assert from 'node:assert/strict';

const rpcPath = 'supabase/migrations/20261002180000_atomic_source_intelligence_proposal.sql';
const clientPath = 'src/lib/report-decisions.ts';
const uiPath = 'src/components/SmartReportAdvisorySurface.tsx';

for (const path of [rpcPath, clientPath, uiPath]) {
  assert.ok(fs.existsSync(path), 'SOURCE_PROPOSAL_CONTRACT_FILE_MISSING:' + path);
}

const rpc = fs.readFileSync(rpcPath, 'utf8');
const client = fs.readFileSync(clientPath, 'utf8');
const ui = fs.readFileSync(uiPath, 'utf8');

assert.match(rpc, /create_source_intelligence_proposal/i);
assert.match(rpc, /INSERT INTO public\.recommendations/i);
assert.match(rpc, /v_decision_id := public\.create_runtime_decision\(/i);
assert.match(rpc, /p_confidence\s+numeric/i);
assert.match(rpc, /NULL,\s*NULL,\s*v_evidence/i);
assert.match(rpc, /link_recommendation_to_decision/i);
assert.match(rpc, /p_evidence_snapshot_id uuid/i);
assert.match(rpc, /report_evidence_passports/i);
assert.match(rpc, /p\.company_id = v_company/i);
assert.match(rpc, /p\.report_execution_job_id = p_report_job_id/i);
assert.match(rpc, /p\.source_hash = p_source_hash/i);
assert.match(rpc, /p\.verification_status = 'VERIFIED'/i);
assert.match(rpc, /p\.decision_readiness = 'READY'/i);
assert.match(rpc, /SOURCE_PROPOSAL_EVIDENCE_REQUIRED/i);
assert.doesNotMatch(rpc, /p_confidence.*0\.5/i);

assert.match(client, /supabase\.rpc\('create_source_intelligence_proposal'/i);
assert.match(client, /p_evidence_snapshot_id:\s*input\.evidenceSnapshotId/i);
assert.match(client, /recommendationId:\s*string \| null/i);
assert.match(client, /recommendation_id[,)]/i);
assert.match(client, /p_recommendation_id:\s*input\.recommendationId \?\? null/i);
assert.match(ui, /recommendationId:\s*decision\.recommendationId/i);
const proposalFn = client.slice(client.indexOf('export async function createSourceDecisionProposal'), client.indexOf('export type SourceDecisionState'));
assert.doesNotMatch(proposalFn, /\.from\('business_intelligence_decisions'\)/i);
assert.doesNotMatch(client, /p_confidence:\s*0\.5/i);
assert.match(ui, /evidenceSnapshotId:\s*evidenceSnapshotId \?\? ''/i);

console.log('SOURCE_INTELLIGENCE_PROPOSAL_ATOMIC_CONTRACT_PASS');
