import fs from 'node:fs';
import path from 'node:path';

const values = {
  source_sha: process.env.COMMIT_REF ?? process.env.HEAD ?? null,
  build_sha: process.env.COMMIT_REF ?? process.env.HEAD ?? null,
  deployment_sha: process.env.COMMIT_REF ?? process.env.HEAD ?? null,
  deployment_id: process.env.DEPLOY_ID ?? null,
  target_env: process.env.CONTEXT === 'production'
    ? 'production'
    : process.env.CONTEXT === 'deploy-preview'
      ? 'preview'
      : process.env.CONTEXT === 'branch-deploy'
        ? 'branch'
        : process.env.CONTEXT === 'dev'
          ? 'development'
          : process.env.CONTEXT ?? null,
  runtime_environment: 'netlify-function',
  context: process.env.CONTEXT ?? null,
  branch: process.env.BRANCH ?? null,
  review_id: process.env.REVIEW_ID ?? null,
  deploy_url: process.env.DEPLOY_URL ?? null,
  deploy_prime_url: process.env.DEPLOY_PRIME_URL ?? null,
};

const output = path.resolve('netlify/functions/runtime-provenance.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(values, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ output, ...values }));
