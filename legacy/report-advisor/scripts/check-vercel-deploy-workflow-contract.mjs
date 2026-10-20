import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/vercel-production-deploy.yml', 'utf8');
const required = [
  // These identifiers are public project metadata, not credentials. Prefer owner-configured vars or secrets.
  "VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID || secrets.VERCEL_ORG_ID || 'team_7BSJnGvDzIC6bXMakIOeAYle' }}",
  "VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID || secrets.VERCEL_PROJECT_ID || 'prj_jcqgz6UKGd6tPgHZlttgFXaXvyvo' }}",
  'VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}',
  'RESILIENCE_OPERATIONAL_TOKEN: ${{ secrets.RESILIENCE_OPERATIONAL_TOKEN }}',
  'Require deploy credentials',
  'Synchronize operational token into Vercel production environment',
  "body.deployment_sha === expected && body.deployment_id",
  'cancel-in-progress: false',
];
const missing = required.filter((value) => !workflow.includes(value));
if (missing.length) {
  throw new Error(`Vercel production deploy workflow contract failed; missing: ${missing.join(', ')}`);
}
if (!workflow.includes('for name in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID RESILIENCE_OPERATIONAL_TOKEN; do')
    || !workflow.includes('if [ -z "${!name:-}" ]; then')) {
  throw new Error('Vercel production workflow must fail closed when any required credential is absent.');
}
console.log('Vercel production deploy workflow contract: PASS (public IDs have safe defaults; tokens remain mandatory; exact-SHA health proof preserved).');
