import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const requiredFiles = ['scripts/phase-f-live-resilience-probes.mjs','scripts/check-operational-resilience-contract.mjs','scripts/check-release-resilience-manifest.mjs','scripts/check-continuous-trust-contract.mjs','.github/workflows/phase-f-live-resilience.yml','supabase/migrations/20260825050000_operational_resilience_trust.sql','supabase/migrations/20260825090000_continuous_trust_autonomous_ops.sql'];
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Phase F runtime closure blockers:\n${missing.join('\n')}`);
const migration = fs.readFileSync(path.join(root,'supabase/migrations/20260825050000_operational_resilience_trust.sql'),'utf8');
for (const token of ['ENABLE ROW LEVEL SECURITY','company_id = public.current_company_id()','REVOKE ALL ON TABLE','expires_at > now()','blocker_count = 0']) if (!migration.includes(token)) throw new Error(`Phase F security invariant missing: ${token}`);
const workflow = fs.readFileSync(path.join(root,'.github/workflows/phase-f-live-resilience.yml'),'utf8');
for (const token of ['phase-f-live-resilience','phase-f-live-resilience-probes.mjs','RESILIENCE_BACKUP_MODE','RESILIENCE_LOGICAL_SOURCE_DB_URL','RESILIENCE_MAX_RPO_SECONDS','supabase/setup-cli@v1']) if (!workflow.includes(token)) throw new Error(`Phase F workflow invariant missing: ${token}`);
if (!workflow.includes('auth.signInWithPassword')) throw new Error('Phase F canary must use configured password authentication');
if (!workflow.includes('PHASE_F_CANARY_PASSWORD_SIGNIN_FAILED')) throw new Error('Phase F canary password auth failure boundary missing');
if (workflow.includes('admin.auth.admin.generateLink')) throw new Error('Phase F canary must not depend on Auth Admin generateLink for authenticated session resolution');
if (!workflow.includes('npm run test:operational-resilience') && !workflow.includes('check-operational-resilience-contract.mjs')) throw new Error('Phase F workflow must execute the operational resilience contract');
if (workflow.includes('deploy-preview-730--aghbari-report-advisor.netlify.app')) throw new Error('Phase F target must not use stale deploy-preview-730');
if (!workflow.includes('base="https://deploy-preview-${PR_NUMBER}--aghbari-report-advisor.netlify.app"')) throw new Error('Phase F runtime target must resolve dynamically from the PR number');
if (!workflow.includes('PR_NUMBER: ${{ github.event.pull_request.number }}')) throw new Error('Phase F runtime target must be bound to the current PR number');
if (workflow.includes('deploy-preview-754--aghbari-report-advisor.netlify.app')) throw new Error('Phase F workflow contains stale preview target deploy-preview-754');
if (!workflow.includes('workflow_dispatch')) throw new Error('Phase F live resilience must remain explicitly dispatchable');
if (!workflow.includes('ONE-PROGRAMMER-SESSION-MEMORY') || !workflow.includes('grep -vqE')) throw new Error('Phase F preview provenance must allow the required session-memory document as governance-only drift');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for (const script of ['test:operational-resilience','test:release-resilience-manifest','test:continuous-trust']) if (!pkg.scripts?.[script]) throw new Error(`Package gate missing: ${script}`);
const probe = fs.readFileSync(path.join(root,'scripts/phase-f-live-resilience-probes.mjs'),'utf8');
for (const token of [
  'EXACT_HEAD',
  'deployment_sha',
  'deployment_id',
  'DEPLOYMENT_SHA_MISMATCH',
  'logicalBackupRestore',
  'runDockerPgDump',
  'pg_dump',
  '--snapshot="$SNAPSHOT_ID"',
  'buildExportedSnapshotSql()',
  'artifact_sha256',
  'rpo_seconds',
  'rto_seconds',
  'logical-',
]) if (!probe.includes(token)) throw new Error(`Logical backup/restore runtime invariant missing: ${token}`);
if (!probe.includes("file === 'ONE-PROGRAMMER-SESSION-MEMORY.md'")) throw new Error('Phase F runtime must treat session memory as governance-only provenance');
console.log('Phase F runtime closure contract: PASS');
