import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260830034000_restrict_public_security_definer_helpers.sql',
  'utf8',
);

const helpers = [
  'current_company_id()',
  'can_certify_autonomous_domain(text)',
  'can_execute_bi_decision(text)',
  'can_execute_control_plane_run(text)',
  'is_continuous_trust_healthy(text)',
  'is_trust_certificate_valid(text)',
];

for (const helper of helpers) {
  const escaped = helper.replace(/[()]/g, '\\$&');
  const pattern = new RegExp(
    `REVOKE\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.${escaped}\\s+FROM\\s+authenticated\\s*;`,
    'i',
  );
  if (!pattern.test(migration)) {
    throw new Error(`Authenticated execution remains exposed for ${helper}`);
  }
}

console.log('Security-definer helper execution contract: PASS');
