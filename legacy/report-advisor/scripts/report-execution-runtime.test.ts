import { buildRenderedOutput } from '../src/lib/import/canonical-production-adapter.ts';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { advanceCheckpoint, canAdvanceCheckpoint, type ReportExecutionCheckpoint, type ReportExecutionStage } from '../src/lib/report-execution/checkpoint.ts';
import { InMemoryReportQueue } from '../src/lib/report-execution/queue.ts';
import { SupabaseReportExecutionStore } from '../src/lib/report-execution/durable-worker-adapter.ts';
import type { ReportExecutionRequest } from '../src/lib/report-execution/report-execution-contract.ts';

assert.equal(canAdvanceCheckpoint('queued','fingerprinted'), true);
assert.equal(canAdvanceCheckpoint('queued','analyzed'), false);
const initial: ReportExecutionCheckpoint = { stage:'queued', sourceHash:'sha-a', evidenceKeys:[], updatedAt:0 };
const next = advanceCheckpoint(initial, { stage:'fingerprinted', sourceHash:'sha-a', evidenceKeys:['source:sha-a'] });
assert.deepEqual(next.evidenceKeys, ['source:sha-a']);
assert.throws(() => advanceCheckpoint(next, { stage:'analyzed', sourceHash:'sha-a', evidenceKeys:[] }), /Invalid checkpoint transition/);
assert.throws(() => advanceCheckpoint(next, { stage:'extracted', sourceHash:'sha-b', evidenceKeys:[] }), /source hash/);

const request: ReportExecutionRequest = { reportId:'r', tenantId:'t', requestedBy:'u', parameters:{}, formats:['web'], idempotencyKey:'k' };
assert.equal(SupabaseReportExecutionStore.requestIdentity(request), 't:k:latest');
assert.equal(SupabaseReportExecutionStore.requestIdentity({ ...request, sourceSnapshotId:'snapshot-1' }), 't:k:snapshot-1');
assert.throws(() => SupabaseReportExecutionStore.requestIdentity({ ...request, tenantId:'' }), /tenant and idempotency context/);
assert.throws(() => SupabaseReportExecutionStore.requestIdentity({ ...request, idempotencyKey:'' }), /tenant and idempotency context/);
assert.notEqual(SupabaseReportExecutionStore.requestIdentity({ ...request, sourceSnapshotId:'snapshot-1' }), SupabaseReportExecutionStore.requestIdentity(request));

const queue = new InMemoryReportQueue();
assert.throws(() => queue.enqueue(request, 'run-1', 0), /positive integer/);
assert.throws(() => queue.enqueue(request, 'run-1', Number.NaN), /positive integer/);
assert.throws(() => queue.enqueue(request, 'run-1', Number.POSITIVE_INFINITY), /positive integer/);
assert.throws(() => queue.enqueue(request, '   '), /runId is required/);
const queued = queue.enqueue(request, 'run-1', 2);
assert.equal(queued.status, 'queued');
assert.throws(() => queue.claim('   '), /workerId is required/);
assert.throws(() => queue.claim('worker-1', 0), /at least 30000ms and finite/);
assert.throws(() => queue.claim('worker-1', 1), /at least 30000ms and finite/);
assert.throws(() => queue.claim('worker-1', Number.NaN), /at least 30000ms and finite/);
assert.throws(() => queue.claim('worker-1', Number.POSITIVE_INFINITY), /at least 30000ms and finite/);
const claimed = queue.claim('worker-1', 60_000);
assert.equal(claimed?.status, 'running');
assert.equal(claimed?.attempts, 1);
assert.ok(claimed?.leaseToken);
assert.throws(() => queue.heartbeat('run-1', 'worker-1', claimed.leaseToken!, 1), /at least 30000ms and finite/);
assert.throws(() => queue.heartbeat('run-1', 'worker-1', claimed.leaseToken!, Number.NaN), /at least 30000ms and finite/);
assert.throws(() => queue.complete('run-1', 'worker-2', claimed.leaseToken!), /lease is not owned/);
assert.throws(() => queue.complete('run-1', 'worker-1', ''), /leaseToken is required/);
assert.throws(() => queue.complete('run-1', 'worker-1', 'stale-token'), /lease is not owned/);
queue.complete('run-1', 'worker-1', claimed.leaseToken!);
assert.equal(queue.get('run-1')?.status, 'succeeded');

const leaseFailureSql = fs.readFileSync('supabase/migrations/20260825153000_runtime_lease_hardening.sql', 'utf8');
for (const token of ['attempt >= max_attempts', "'dead_letter'", "status IN ('leased','processing')", 'lease_expires_at > now()', 'company_id=public.current_company_id()']) assert.ok(leaseFailureSql.includes(token), `missing failure-state invariant: ${token}`);

const adapter = fs.readFileSync('src/lib/report-execution/durable-worker-adapter.ts', 'utf8');
for (const rpc of ["rpc('advance_report_execution_checkpoint'", "rpc('complete_report_execution_job'", "rpc('retry_report_execution_job'"]) assert.ok(adapter.includes(rpc), `missing durable worker RPC: ${rpc}`);

const runner = fs.readFileSync('src/lib/report-execution/durable-production-runner.ts', 'utf8');
for (const invariant of ['loadSourceSnapshot', 'sourceSnapshotId', 'source.sourceHash !== input.sourceHash', 'source.currentRows', 'currentRows: source.currentRows', 'sourceSnapshotId: input.request.sourceSnapshotId ?? null', 'store.heartbeat', 'store.saveCheckpoint', 'store.complete', 'store.fail']) assert.ok(runner.includes(invariant), `missing durable production invariant: ${invariant}`);
const snapshotGuard = fs.readFileSync('scripts/check-report-execution-source-snapshot-identity.mjs', 'utf8');
assert.match(snapshotGuard, /sourceSnapshotId/);

console.log('Report execution runtime: PASS (checkpoint + lease/dead-letter + tenant/idempotency + verified source snapshot lifecycle invariants)');


const durableRunner = await import('../src/lib/report-execution/durable-production-runner.ts');
const renderStages: string[] = [];
const checkpointStages: string[] = [];
const completionEvidence: Record<string, unknown>[] = [];
const fakeStore = {
  claim: async () => ({
    id: 'job-render-test', tenantId: 'tenant-test', status: 'queued',
    checkpoint: { stage: 'queued', sourceHash: 'sha-render-test', evidenceKeys: [], updatedAt: Date.now() },
    attempt: 1, maxAttempts: 3, leaseOwner: 'worker', leaseToken: 'lease-token',
    leaseExpiresAt: new Date(Date.now() + 300_000).toISOString(),
  }),
  heartbeat: async () => {},
  saveCheckpoint: async (_jobId: string, checkpoint: ReportExecutionCheckpoint) => checkpointStages.push(checkpoint.stage),
  complete: async (_jobId: string, _workerId: string, evidence: Record<string, unknown>) => completionEvidence.push(evidence),
  fail: async () => {},
};
const renderResult = await durableRunner.runDurableProductionLifecycle({
  jobId: 'job-render-test', workerId: 'worker', sourceHash: 'sha-render-test', rows: [{ total: 10, invoice_number: 101, customer_name: 'عميل', invoice_type: 'آجل', date: '2026-01-02' }],
  request: { reportId: 'report-render-test', tenantId: 'tenant-test', requestedBy: 'user-test', parameters: {}, formats: ['web'], idempotencyKey: 'render-test' },
  lifecycle: {
    previousRows: [],
    currentRows: [{ key: 'row-1', hash: 'row-hash', value: { total: 10, invoice_number: 101, customer_name: 'عميل', invoice_type: 'آجل', date: '2026-01-02' } }],
    sourceCandidates: [{ businessKey: 'row-1', sourceId: 'sha-render-test', precedence: 0, observedAt: new Date().toISOString(), value: { amount: 10 } }],
    scenarioOptions: [{ key: 'report-render-test', expectedImpact: 1, risk: 1, liquidityRequired: 0, serviceLevel: 1 }],
    riskBudget: { maxRisk: 1, protectedLiquidity: 1, minimumServiceLevel: 0 },
    portfolioCandidates: [{ key: 'report-render-test', materiality: 0.5, confidence: 0.9, urgency: 0.5, risk: 1 }],
    autonomy: { trustHealthy: false, evidenceQuality: 0.9, confidence: 0.9, riskBudgetValid: true, criticalDrift: false, rollbackVerified: false, isolationVerified: false },
    evidence: [{ key: 'evidence-1', source: 'sha-render-test', observedAt: new Date().toISOString(), quality: 0.9 }],
  },
  executeStage: async (stage: ReportExecutionStage) => {
    renderStages.push('execute:' + stage);
    if (stage === 'rendered') return { sourceHash: 'sha-render-test', sourceBound: true, outputs: [{ key: 'executive', path: '/reports/executive' }] };
  },
}, fakeStore as unknown as SupabaseReportExecutionStore);
assert.deepEqual(renderStages, ['execute:fingerprinted', 'execute:extracted', 'execute:canonicalized', 'execute:validated', 'execute:analyzed', 'execute:decisioned', 'execute:committed', 'execute:rendered']);
assert.deepEqual(checkpointStages, ['fingerprinted', 'extracted', 'canonicalized', 'validated', 'analyzed', 'decisioned', 'committed', 'rendered']);
assert.ok(Array.isArray(completionEvidence[0]?.renderedOutput?.outputs));
assert.equal((renderResult as { renderedOutput: { sourceBound: boolean } }).renderedOutput.sourceBound, true);

const renderedSource = buildRenderedOutput({
  importId: 'import-render-test',
  fileName: 'فواتير المبيعات.pdf',
  sourceHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  entityType: 'sales_invoices',
  qualityScore: 92,
  qualityApproved: true,
  rows: Array.from({ length: 12 }, (_, index) => ({
    rowNumber: index + 1,
    data: {
      total: index === 0 ? 10 : 0,
      net_sales: index === 0 ? 10 : 0,
      invoice_number: 101,
      customer_name: 'عميل',
      invoice_type: 'آجل',
      date: '2026-01-02',
      documentNo: 'INV-101',
      documentDate: '2026-01-02',
      netAmount: 10,
      unitPrice: 10,
      grossAmount: 10,
      discount: 0,
      cost: 6,
    },
    provenance: {
      sourceHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sourceId: 'source-' + String(index + 1),
      sourceDocumentId: 'doc-' + String(index + 1),
      evidenceId: 'evidence-' + String(index + 1),
      tenantId: 'tenant-test',
      lineageId: 'line-' + String(index + 1),
    },
  })),
});
assert.equal(renderedSource.sourceMetrics.totalAmount, 10);
assert.equal(renderedSource.sourceMetrics.uniqueInvoiceCount, 1);
assert.equal(renderedSource.sourceMetrics.receivableCandidate, 10);
assert.equal(renderedSource.sourceMetrics.asOfStart, '2026-01-02');
assert.equal(renderedSource.sourceMetrics.asOfEnd, '2026-01-02');
assert.equal(renderedSource.archetypeId, 'sales.invoice-detail');
assert.equal(renderedSource.archetypeVersion, 1);
assert.equal(renderedSource.profileVersion, 1);
assert.equal(renderedSource.archetypeState, 'SUPPORTED');
assert.equal(typeof renderedSource.archetypeReason, 'string');
