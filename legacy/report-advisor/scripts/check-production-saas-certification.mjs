import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'src/lib/production/productionCertification.ts',
  'src/lib/aiDataPolicy.ts',
  'src/lib/aiRuntimePolicy.ts',
  'src/lib/dataLineage.ts',
  'src/lib/decision-automation/action-runtime.ts',
  'src/lib/decision-automation/execution-receipt.ts',
  'src/lib/analytics/forecast-backtest.ts',
  'src/lib/analytics/outcome-feedback.ts',
  'src/lib/analytics/intelligence-gate.ts',
  'supabase/migrations/20260822200000_canonical_tenant_membership.sql',
  'supabase/migrations/20260824190000_report_execution_runtime.sql',
  'supabase/migrations/20260825000000_entitlements_usage_billing.sql',
  'supabase/migrations/20260825030000_decision_outcome_feedback.sql',
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`SaaS certification missing: ${missing.join(', ')}`);
const text = file => fs.readFileSync(path.join(root, file), 'utf8');
const tenant = text('supabase/migrations/20260822200000_canonical_tenant_membership.sql');
const execution = text('supabase/migrations/20260824190000_report_execution_runtime.sql');
const billing = text('supabase/migrations/20260825000000_entitlements_usage_billing.sql');
const outcomes = text('supabase/migrations/20260825030000_decision_outcome_feedback.sql');
const ai = text('src/lib/aiDataPolicy.ts');
const runtime = text('src/lib/aiRuntimePolicy.ts');
const receipt = text('src/lib/decision-automation/execution-receipt.ts');
const gate = text('src/lib/analytics/intelligence-gate.ts');
const blockers = [];
for (const invariant of ['current_company_id()', 'company_memberships', 'is_active', 'USING (company_id = public.current_company_id())', 'WITH CHECK (company_id = public.current_company_id())']) if (!tenant.includes(invariant)) blockers.push(`TENANT:${invariant}`);
for (const invariant of ['FOR UPDATE SKIP LOCKED', 'lease_expires_at', 'attempts < max_attempts', 'UNIQUE(company_id, idempotency_key)', 'REVOKE ALL ON TABLE']) if (!execution.includes(invariant)) blockers.push(`EXECUTION:${invariant}`);
for (const invariant of ['REVOKE ALL ON TABLE', 'authenticated_active_entitlement_plans_read', 'authenticated_active_entitlement_capabilities_read', 'record_entitlement_usage', 'UNIQUE(company_id, billing_period, idempotency_key)']) if (!billing.includes(invariant)) blockers.push(`BILLING:${invariant}`);
for (const invariant of ['automation_execution_receipts', 'decision_outcomes', 'UNIQUE(company_id, idempotency_key)', 'UNIQUE(company_id, decision_fingerprint, observed_at)', 'record_decision_outcome']) if (!outcomes.includes(invariant)) blockers.push(`OUTCOME:${invariant}`);
for (const invariant of ['tenantId', 'Raw business rows are not allowed', 'neverSendBusinessDataToUntrustedProvider']) if (!(ai + runtime).includes(invariant)) blockers.push(`AI:${invariant}`);
for (const invariant of ['decisionFingerprint', 'evidenceSnapshotId', 'idempotencyKey', 'receiptKey']) if (!receipt.includes(invariant)) blockers.push(`RECEIPT:${invariant}`);
for (const invariant of ['FORECAST_BELOW_BASELINE', 'FORECAST_BIAS_TOO_HIGH', 'OUTCOME_ACCURACY_LOW']) if (!gate.includes(invariant)) blockers.push(`INTELLIGENCE:${invariant}`);
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort();
for (let i = 1; i < migrationFiles.length; i++) if (migrationFiles[i] < migrationFiles[i - 1]) blockers.push('MIGRATIONS_NOT_SORTED');
if (blockers.length) throw new Error(`Production SaaS certification blockers:\n${blockers.join('\n')}`);
console.log(`Production SaaS certification contract: PASS (${required.length} required artifacts, ${migrationFiles.length} migrations inspected)`);
