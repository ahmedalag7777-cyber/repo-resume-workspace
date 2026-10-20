#!/usr/bin/env node
/**
 * Phase M live-certification preflight.
 *
 * This gate is intentionally fail-closed: it never pretends that live
 * infrastructure tests passed when the required target configuration is
 * absent. It only validates that the certification runner has everything
 * needed to execute the real tenant/storage/realtime/retrieval/backup/
 * rollback probes.
 */

const required = [
  'CERT_TARGET_ENV',
  'CERT_SUPABASE_URL',
  'CERT_SUPABASE_ANON_KEY',
  'CERT_TENANT_A_ID',
  'CERT_TENANT_B_ID',
  'CERT_TEST_USER_A',
  'CERT_TEST_USER_B',
];

const optional = [
  'CERT_SERVICE_ROLE_KEY',
  'CERT_STORAGE_BUCKET',
  'CERT_BACKUP_TARGET',
  'CERT_ROLLBACK_TARGET',
  'CERT_AI_RETRIEVAL_ENDPOINT',
];

const missing = required.filter((name) => !process.env[name]?.trim());
const presentOptional = optional.filter((name) => process.env[name]?.trim());

const target = process.env.CERT_TARGET_ENV?.trim() || 'UNSET';
const forbidden = /^(prod|production)$/i.test(target) && process.env.CERT_ALLOW_PRODUCTION !== 'true';

console.log(`Phase M live-certification preflight: target=${target}`);
console.log(`Required configuration: ${required.length - missing.length}/${required.length} present`);
console.log(`Optional integration configuration: ${presentOptional.length}/${optional.length} present`);

if (missing.length) {
  console.error('FAIL-CLOSED: missing required certification configuration:');
  for (const name of missing) console.error(`- ${name}`);
  process.exit(2);
}

if (forbidden) {
  console.error('FAIL-CLOSED: production target requires explicit CERT_ALLOW_PRODUCTION=true.');
  process.exit(3);
}

if (process.env.CERT_SUPABASE_URL && !/^https:\/\//.test(process.env.CERT_SUPABASE_URL)) {
  console.error('FAIL-CLOSED: CERT_SUPABASE_URL must use HTTPS.');
  process.exit(4);
}

if (process.env.CERT_TENANT_A_ID === process.env.CERT_TENANT_B_ID) {
  console.error('FAIL-CLOSED: certification tenants must be distinct.');
  process.exit(5);
}

console.log('PASS: live certification runner is configured and may proceed to real probes.');
