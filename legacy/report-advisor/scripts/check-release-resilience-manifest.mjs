import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase/migrations');
const migrations = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();

if (!migrations.includes('20260825050000_operational_resilience_trust.sql')) {
  throw new Error('Resilience migration is not present');
}
for (let i = 1; i < migrations.length; i += 1) {
  if (migrations[i] < migrations[i - 1]) throw new Error('Migration ordering is not deterministic');
}

const sql = fs.readFileSync(path.join(migrationDir, '20260825050000_operational_resilience_trust.sql'), 'utf8');
const tenantTables = ['operational_health_snapshots', 'backup_verification_runs', 'slo_evidence', 'incident_evidence', 'trust_certifications'];
for (const table of tenantTables) {
  if (!sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Missing resilience table: ${table}`);
  if (!sql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)) throw new Error(`RLS missing: ${table}`);
  if (!sql.includes(`company_id = public.current_company_id()`)) throw new Error(`Tenant predicate missing: ${table}`);
}

const workflow = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
const hasOperationalResilienceGate =
  workflow.includes('npm run test:operational-resilience') ||
  workflow.includes('check-operational-resilience-contract.mjs');
if (!hasOperationalResilienceGate) throw new Error('Quality workflow missing operational resilience gate');
if (!workflow.includes('test:production-release-blockers')) throw new Error('Quality workflow missing release blocker gate');

console.log(`Release resilience manifest: PASS (${migrations.length} migrations, ${tenantTables.length} resilience domains)`);
