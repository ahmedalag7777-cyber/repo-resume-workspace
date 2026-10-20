import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260830172500_revoke_certification_rpc_execute.sql', 'utf8');
if (!/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.can_release_production_certification\(text\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i.test(migration)) {
  throw new Error('CERTIFICATION_RPC_EXPOSURE: release certification RPC must not be callable by API roles');
}
console.log('CERTIFICATION_RPC_EXPOSURE_PASS');
