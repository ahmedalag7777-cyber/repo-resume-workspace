import fs from 'node:fs';
import path from 'node:path';

function loadProvenance() {
  try {
    const file = path.join(process.cwd(), 'netlify', 'functions', 'runtime-provenance.json');
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string | null>;
  } catch {
    return {};
  }
}

export default async function handler() {
  const provenance = loadProvenance();
  const sourceSha = provenance.source_sha ?? process.env.COMMIT_REF ?? null;
  const deploymentId = provenance.deployment_id ?? process.env.DEPLOY_ID ?? null;

  const body = {
    status: sourceSha && deploymentId ? 'healthy' : 'degraded',
    component: 'runtime',
    source_sha: sourceSha,
    build_sha: provenance.build_sha ?? null,
    deployment_sha: provenance.deployment_sha ?? null,
    deployment_id: deploymentId,
    target_env: provenance.target_env ?? null,
    runtime_environment: 'netlify-function',
    context: provenance.context ?? null,
    branch: provenance.branch ?? null,
    review_id: provenance.review_id ?? null,
    deploy_url: provenance.deploy_url ?? null,
    deploy_prime_url: provenance.deploy_prime_url ?? null,
    checked_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: sourceSha && deploymentId ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}
