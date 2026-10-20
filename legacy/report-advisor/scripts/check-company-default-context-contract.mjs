import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(
  'supabase/migrations/20260830032500_enforce_single_default_company_membership.sql',
  'utf8',
);

assert.match(
  migration,
  /CREATE UNIQUE INDEX IF NOT EXISTS uq_company_memberships_one_active_default[\s\S]*ON public\.company_memberships \(user_id\)[\s\S]*WHERE is_active = true AND is_default = true;/,
  'single active default membership invariant is not enforced',
);
assert.match(
  migration,
  /idx_company_memberships_user_active_default/,
  'default-company lookup index is missing',
);

console.log('Company default context contract: PASS');
