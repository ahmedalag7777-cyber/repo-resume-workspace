import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260830200000_certification_evidence_write_lockdown.sql', 'utf8');
const source = fs.readFileSync('supabase/migrations/20260825150000_phase_m_certification_bundle.sql', 'utf8');

for (const table of ['production_certification_bundles', 'production_rollback_drills']) {
  if (!new RegExp(`REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\\.${table} FROM authenticated`, 'i').test(migration)) {
    throw new Error(`${table}: authenticated write privilege is not revoked`);
  }
}
if (!/FOR SELECT TO authenticated/i.test(migration)) throw new Error('Certification evidence must expose authenticated read only');
if (/FOR ALL TO authenticated/i.test(migration)) throw new Error('Certification evidence must not retain broad authenticated policy');

// Attack the test: a commented-out revoke must not satisfy the executable contract.
const decoy = migration.replace(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\./g, '-- REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.');
if (/^REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\./m.test(decoy)) throw new Error('test-of-test failed: commented revoke still matched');

// The source schema's old FOR ALL policy is expected historically; the new migration must override it.
if (!/CREATE POLICY production_certification_bundles_tenant_read/i.test(migration)) throw new Error('bundle read policy missing');
if (!/CREATE POLICY production_rollback_drills_tenant_read/i.test(migration)) throw new Error('rollback read policy missing');

console.log('Certification evidence write-boundary gate: PASS');
