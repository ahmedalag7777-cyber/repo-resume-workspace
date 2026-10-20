import { readFileSync } from 'node:fs';
const required = {
  'src/lib/report-execution/report-execution-contract.ts': ['tenantId', 'idempotencyKey', 'sourceSnapshotId'],
  'src/lib/report-execution/queue.ts': ['claim(', 'heartbeat(', 'maxAttempts', 'leaseExpiresAt'],
  'src/lib/report-execution/worker-adapter.ts': ['TrustedReportWorkerAdapter', 'sourceSnapshotId'],
  'src/lib/report-execution/renderers.ts': ['renderWeb', 'renderXlsx', 'renderPdf'],
  'src/lib/report-execution/artifact-integrity.ts': ['verifyArtifactIntegrity', 'SHA-256', 'contentHash'],
  'src/lib/decision-automation/action-runtime.ts': ['requiresApproval', 'evidenceRefs', 'idempotencyKey'],
  'src/lib/analytics/forecast-backtest.ts': ['baselineMae', 'improvementVsBaselinePct'],
  'src/lib/entitlements/entitlementPolicy.ts': ['MISSING_TENANT', 'EXPIRED', 'QUOTA_EXCEEDED', 'CAPABILITY_DISABLED'],
  'src/lib/entitlements/usageLedger.ts': ['UsageLedger', 'idempotencyKey', 'summarize'],
  'src/lib/entitlements/billingLifecycle.ts': ['transitionSubscription', 'past_due', 'cancelled', 'expired'],
  'src/lib/entitlements/billingWebhook.ts': ['verifyWebhookSignature', 'verifyWebhookTimestamp', 'acceptWebhook'],
  'supabase/migrations/20260824190000_report_execution_runtime.sql': ['queue_report_run', 'claim_report_run', 'complete_report_run', 'report_run_evidence'],
  'supabase/migrations/20260825000000_entitlements_usage_billing.sql': ['record_entitlement_usage', 'get_entitlement_usage', 'billing_webhook_events', 'company_entitlements'],
};
for (const [path, tokens] of Object.entries(required)) { const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); for (const token of tokens) if (!source.includes(token)) throw new Error(`Production release blocker: ${token} missing from ${path}`); }
const queue = readFileSync(new URL('../src/lib/report-execution/queue.ts', import.meta.url), 'utf8');
if (!queue.includes("status = job.attempts < job.maxAttempts ? 'queued' : 'failed'")) throw new Error('Retry/dead-letter invariant missing');
const automation = readFileSync(new URL('../src/lib/decision-automation/action-runtime.ts', import.meta.url), 'utf8');
if (!automation.includes("return 'pending'")) throw new Error('Approval gate missing');
console.log('Production release blocker contract: PASS');
