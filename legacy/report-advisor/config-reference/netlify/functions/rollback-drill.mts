import fs from 'node:fs';
import path from 'node:path';

function loadProvenance() {
  try {
    const file = path.join(process.cwd(), 'netlify', 'functions', 'runtime-provenance.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export default async function handler(request) {
  const readOnlyProof = request.method === 'GET';
  if (!readOnlyProof && request.method !== 'POST') return json({ status: 'method_not_allowed', allowed: ['GET', 'POST'] }, 405);

  if (!readOnlyProof) {
    const operationalToken = process.env.RESILIENCE_OPERATIONAL_TOKEN?.trim() || '';
    const canaryToken = process.env.RESILIENCE_CANARY_AUTH_TOKEN?.trim() || '';
    const receivedOperationalToken = request.headers.get('x-resilience-token')?.trim() || '';
    const receivedCanaryToken = request.headers.get('x-canary-auth-token')?.trim() || '';
    const authorized =
      (operationalToken && receivedOperationalToken === operationalToken)
      || (canaryToken && receivedCanaryToken === canaryToken);
    if (!operationalToken && !canaryToken) {
      return json({ status: 'unavailable', reason: 'rollback_drill_token_not_configured' }, 503);
    }
    if (!authorized) return json({ status: 'unauthorized' }, 401);
  }

  if (!readOnlyProof) {
    try {
      const payload = request.body ? await request.json() : {};
      if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) return json({ status: 'invalid_request', reason: 'expected_json_object' }, 400);
    } catch {
      return json({ status: 'invalid_request', reason: 'invalid_json' }, 400);
    }
  }

  const provenance = loadProvenance();
  const sourceSha = String(provenance.source_sha ?? process.env.COMMIT_REF ?? '').trim();
  const deploymentSha = String(provenance.deployment_sha ?? process.env.COMMIT_REF ?? '').trim();
  const deploymentId = String(provenance.deployment_id ?? process.env.DEPLOY_ID ?? '').trim();
  const targetEnv = String(provenance.target_env ?? '').trim() || null;

  if (!sourceSha || !deploymentSha || !deploymentId) return json({ status: 'blocked', reason: 'runtime_provenance_incomplete', source_sha: sourceSha || null, deployment_sha: deploymentSha || null, deployment_id: deploymentId || null, target_env: targetEnv }, 503);
  if (deploymentSha !== sourceSha) return json({ status: 'blocked', reason: 'runtime_deployment_sha_mismatch', source_sha: sourceSha, deployment_sha: deploymentSha, deployment_id: deploymentId, target_env: targetEnv }, 409);

  return json({
    status: 'verified',
    operation: 'rollback-forward-fix',
    mode: 'non-destructive-preflight',
    source_sha: sourceSha,
    deployment_sha: deploymentSha,
    deployment_id: deploymentId,
    target_env: targetEnv,
    checked_at: new Date().toISOString(),
  }, 200);
}
