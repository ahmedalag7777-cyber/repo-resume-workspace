import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const migration = fs.readFileSync('supabase/migrations/20260825150000_phase_m_certification_bundle.sql', 'utf8');
const contract = fs.readFileSync('scripts/check-production-certification-contract.mjs', 'utf8');
const certification = fs.readFileSync('src/lib/production/productionCertification.ts', 'utf8');
const runtimeTest = fs.readFileSync('scripts/production-certification-runtime.test.mjs', 'utf8');

const requiredColumns = [
  'tenant_isolation_passed','storage_passed','realtime_passed','ai_isolation_passed',
  'backup_restore_passed','migration_parity_passed','artifact_integrity_passed',
  'rollback_passed','security_audit_passed'
];
const requiredFunctions = [
  'can_release_production_certification',
  'is_continuous_trust_healthy'
];

for (const column of requiredColumns) {
  if (!migration.includes(column)) throw new Error(`Missing certification evidence field: ${column}`);
}
for (const fn of requiredFunctions) {
  if (!migration.includes(fn)) throw new Error(`Missing certification dependency: ${fn}`);
}
if (!/ALTER TABLE[^;]+ENABLE ROW LEVEL SECURITY/i.test(migration) &&
    !/ENABLE ROW LEVEL SECURITY/i.test(migration)) throw new Error('Certification evidence tables must enable RLS');
if (!/REVOKE ALL ON TABLE[^;]+FROM anon/i.test(migration)) throw new Error('Certification evidence tables must revoke anon access');
if (!/company_id\s*=\s*public\.current_company_id\(\)/i.test(migration)) throw new Error('Certification evidence must be tenant-authoritative');
if (!/SET search_path\s*=\s*public/i.test(migration)) throw new Error('Certification SECURITY DEFINER function must pin search_path');
if (!/status\s*=\s*'passed'/i.test(migration)) throw new Error('Certification release gate must require passed status');
if (!/PRODUCTION_CERTIFICATION_EVIDENCE_KEYS/.test(contract)) throw new Error('Certification contract must expose canonical evidence keys');
for (const token of [
  'complete', 'missing', 'failed', 'duplicate', 'unrelated',
  "passed: 'false'", "severity: 'PASS'", 'key: \'\'', 'certifyProduction(null)',
]) {
  if (!runtimeTest.includes(token)) throw new Error(`Certification runtime harness lost adversarial coverage: ${token}`);
}
for (const key of ['tenant','backup','rollback','artifact','security']) {
  if (!new RegExp(`['\\\"]${key}['\\\"]`).test(certification)) throw new Error(`Certification source lost mandatory evidence key: ${key}`);
}
if (!certification.includes('MISSING_EVIDENCE:')) throw new Error('Certification must reject missing mandatory evidence');
if (!certification.includes('FAILED_EVIDENCE:')) throw new Error('Certification must reject failed mandatory evidence');
if (!certification.includes('MALFORMED_CERTIFICATION_CHECK')) throw new Error('Certification must reject malformed evidence checks');
if (!certification.includes('duplicateMandatoryEvidence')) throw new Error('Certification must reject duplicate mandatory evidence');

execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/production-certification-runtime.test.mjs'], { stdio: 'inherit' });
console.log('PRODUCTION_CERTIFICATION_EVIDENCE_INTEGRITY_PASS');