import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationName = '20260825090000_continuous_trust_autonomous_ops.sql';
const required = [
  'tenant_isolation_canary_runs',
  'automation_remediation_runs',
  'intelligence_safety_adjustments',
  'billing_liveness_probes',
  'artifact_verification_runs',
  'incident_regression_links',
  'is_continuous_trust_healthy',
  'is_trust_certificate_valid',
  'company_id = public.current_company_id()',
  'REVOKE ALL ON TABLE',
];
const migration = path.join(root, 'supabase/migrations', migrationName);
if (!fs.existsSync(migration)) {
  throw new Error(`Phase H blockers:\nrequired migration missing: ${migrationName}`);
}
const sql = fs.readFileSync(migration, 'utf8');
const missing = required.filter((token) => !sql.includes(token));
if (missing.length) throw new Error(`Phase H blockers:\n${missing.join('\n')}`);
const workflow = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
if (!workflow.includes('test:continuous-trust')) throw new Error('Quality workflow is missing Phase H gate');
console.log(`Phase H continuous trust contract: PASS (${migrationName})`);
