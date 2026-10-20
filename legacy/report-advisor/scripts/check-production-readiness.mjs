import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const requiredFiles = [
  'src/main.tsx','src/App.tsx','src/lib/file-engine','scripts/check-file-engine-contract.mjs','scripts/check-import-transaction-contract.mjs',
  'scripts/check-import-runtime-governance.mjs','scripts/check-tenant-security-contract.mjs','scripts/check-report-truth-contract.mjs',
  'scripts/check-production-saas-certification.mjs','src/lib/decision-automation/execution-receipt.ts','src/lib/analytics/outcome-feedback.ts',
  'src/lib/analytics/intelligence-gate.ts','src/lib/report-execution/artifact-integrity.ts',
  'supabase/migrations/20260819200000_import_engine_rpcs.sql','supabase/migrations/20260819203000_import_engine_jobs.sql',
  'supabase/migrations/20260822180000_security_hardening_imports.sql','supabase/migrations/20260822200000_canonical_tenant_membership.sql',
  'supabase/migrations/20260822200001_import_lineage_idempotency.sql','supabase/migrations/20260824190000_report_execution_runtime.sql',
  'supabase/migrations/20260825000000_entitlements_usage_billing.sql','supabase/migrations/20260825030000_decision_outcome_feedback.sql'
];
const missing = requiredFiles.filter(file => !fs.existsSync(path.join(root,file)));
if (missing.length) { console.error('Production readiness contract: FAIL'); missing.forEach(file => console.error(`- missing: ${file}`)); process.exit(1); }
const packageJson = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const workflow = fs.readFileSync(path.join(root,'.github/workflows/quality.yml'),'utf8');
const workflowScripts = [...workflow.matchAll(/run:\s+npm run ([A-Za-z0-9:_-]+)/g)].map(match => match[1]);
const missingScripts = [...new Set(workflowScripts)].filter(name => !packageJson.scripts?.[name]);
if (missingScripts.length) { console.error('Production readiness contract: FAIL'); missingScripts.forEach(name => console.error(`- missing workflow script: ${name}`)); process.exit(1); }
for (const required of ['npm run typecheck','npm run lint','npm run build','npm run test:production-saas-certification']) if (!workflow.includes(required)) { console.error(`Production readiness contract: FAIL - missing ${required}`); process.exit(1); }
console.log(`Production readiness contract: PASS (${requiredFiles.length} required paths, ${new Set(workflowScripts).size} workflow gates)`);
