import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sql600 = fs.readFileSync(path.join(root, 'supabase/migrations/20260825060000_release_evidence_manifest.sql'), 'utf8');
const sql700 = fs.readFileSync(path.join(root, 'supabase/migrations/20260825070000_release_evidence_manifest.sql'), 'utf8');
const sql800 = fs.readFileSync(path.join(root, 'supabase/migrations/20260825080000_release_evidence_hardening.sql'), 'utf8');

for (const token of [
  'release_evidence_manifests',
  'source_sha',
  'migrations_fingerprint',
  'dependency_lock_fingerprint',
  'artifact_fingerprint',
  'trust_certificate_id',
  "candidate','canary','verified','blocked','rolled_back",
  'authenticated_release_evidence_tenant',
  'company_id = public.current_company_id()',
]) {
  if (!sql600.includes(token)) throw new Error(`Release evidence base contract missing: ${token}`);
}

for (const token of ['migration_fingerprint', 'dependency_fingerprint', 'certification_id', 'COALESCE']) {
  if (!sql700.includes(token)) throw new Error(`Release evidence evolution missing: ${token}`);
}

for (const token of [
  'deployment_verification_runs',
  'dependency_lock_fingerprint',
  'ALTER TABLE release_evidence_manifests',
  'release_is_verified',
  "t.status = 'valid'",
  't.blocker_count = 0',
  't.expires_at > now()',
  "status IN ('failed','blocked')",
]) {
  if (!sql800.includes(token)) throw new Error(`Release evidence hardening missing: ${token}`);
}

const workflow = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
if (!workflow.includes('test:release-resilience-manifest')) throw new Error('Release resilience gate not wired');
console.log('Release evidence contract: PASS');
