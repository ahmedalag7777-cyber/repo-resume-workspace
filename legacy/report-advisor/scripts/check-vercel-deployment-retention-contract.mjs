import fs from 'node:fs';

const file = 'docs/VERCEL_DEPLOYMENT_RETENTION.md';
const source = fs.readFileSync(file, 'utf8');

const required = [
  ['Preview', /Preview:\s*\*\*14 days\*\*/],
  ['Canceled', /Canceled:\s*\*\*7 days\*\*/],
  ['Errored', /Errored:\s*\*\*7 days\*\*/],
  ['Production', /Production:\s*\*\*30 days\*\*/],
  ['project id', /prj_jcqgz6UKGd6tPgHZlttgFXaXvyvo/],
  ['project name', /report-advisor/],
  ['no project-wide removal', /Do not run a project-wide removal command/],
  ['production preservation', /not Production/],
  ['alias preservation', /not attached to a production\/custom-domain alias/],
  ['release preservation', /not the protected release candidate/],
  ['rollback preservation', /not required for rollback or certification evidence/],
];

for (const [label, pattern] of required) {
  if (!pattern.test(source)) throw new Error(`missing Vercel retention safety contract: ${label}`);
}

if (/vercel remove report-advisor\s+--yes/.test(source)) {
  throw new Error('unsafe project-wide Vercel removal command detected');
}

console.log('VERCEL_DEPLOYMENT_RETENTION_CONTRACT_PASS');
