import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(
  'supabase/migrations/20260830032700_remove_cross_tenant_metric_governance_read_policies.sql',
  'utf8',
);

assert.match(migration, /DROP POLICY IF EXISTS metric_governance_authenticated_read/);
assert.match(migration, /DROP POLICY IF EXISTS metric_governance_audit_authenticated_read/);
assert.match(migration, /USING \(company_id = public\.current_company_id\(\)\)/g);
assert.doesNotMatch(migration, /CREATE POLICY[^;]+USING \(true\)/i);

console.log('Metric governance RLS contract: PASS (broad authenticated read bypass removed)');
