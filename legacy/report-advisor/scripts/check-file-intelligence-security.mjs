import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const files = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'))
  : [];

const intelligenceFiles = files.filter((f) => /file.*intelligence|import|intelligence/i.test(f));
if (intelligenceFiles.length === 0) throw new Error('No File Intelligence migrations found');

const legacyPrototype = '20260817185322_02_file_intelligence_schema.sql';
const postPrototypeFiles = intelligenceFiles.filter((f) => f !== legacyPrototype);

// The legacy prototype migration intentionally contains the historical anon CRUD
// definitions. Security is enforced by the subsequent hardening migration, so
// the gate validates the final security layer rather than rejecting historical
// migration text that has already been superseded.
const forbiddenAnonPolicy = /CREATE\s+POLICY[\s\S]{0,500}?TO\s+anon(?:\s*,|\s+)(?:[\s\S]{0,500}?)(?:USING\s*\(\s*true\s*\)|WITH\s+CHECK\s*\(\s*true\s*\))/i;
for (const file of postPrototypeFiles) {
  const body = fs.readFileSync(path.join(migrationDir, file), 'utf8');
  if (forbiddenAnonPolicy.test(body)) {
    throw new Error(`Anonymous File Intelligence CRUD policy detected in ${file}`);
  }
}

const lockdownName = files.find((f) => /file_intelligence_anon_lockdown/i.test(f));
if (!lockdownName) throw new Error('File Intelligence anonymous-lockdown migration is missing');
const lockdown = fs.readFileSync(path.join(migrationDir, lockdownName), 'utf8');

const lockdownDropsAnonPolicies = [
  'anon_select_',
  'anon_insert_',
  'anon_update_',
  'anon_delete_',
].every((marker) => lockdown.includes(marker));

const lockdownRevokesAnonTables =
  /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.%I\s+FROM\s+anon/i.test(lockdown)
  || (
    lockdown.includes('REVOKE ALL ON TABLE public.file_records FROM anon')
    && lockdown.includes('REVOKE ALL ON TABLE public.import_jobs FROM anon')
  );

if (!lockdownDropsAnonPolicies || !lockdownRevokesAnonTables) {
  throw new Error('Anonymous File Intelligence lockdown is missing');
}

console.log('File Intelligence security contract: PASS');
