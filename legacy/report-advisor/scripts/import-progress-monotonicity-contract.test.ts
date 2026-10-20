import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260903190000_harden_import_progress_monotonicity.sql'),
  'utf8',
);

assert.match(migration, /FOR UPDATE/is, 'import progress update must lock the job row');
assert.match(migration, /GREATEST\(\s*COALESCE\(v_existing_processed,\s*0\)/is, 'processed rows must be monotonic');
assert.match(migration, /GREATEST\(\s*COALESCE\(v_existing_valid,\s*0\)/is, 'valid rows must be monotonic');
assert.match(migration, /GREATEST\(\s*COALESCE\(v_existing_invalid,\s*0\)/is, 'invalid rows must be monotonic');
assert.match(migration, /GREATEST\(\s*COALESCE\(v_existing_duplicate,\s*0\)/is, 'duplicate rows must be monotonic');
assert.match(migration, /p_status.*queued.*processing/is, 'progress updates must remain non-terminal');
assert.match(migration, /current_company_id\(\)/is, 'progress updates must remain tenant scoped');

console.log('import progress monotonicity contract: PASS');
