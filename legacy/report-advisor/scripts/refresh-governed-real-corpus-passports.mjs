import process from 'node:process';
import { isGovernedRealFileRecord } from './real-source-provenance.mjs';

const SUPABASE_URL = process.env.REPORT_ADVISOR_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXACT_HEAD = process.env.EXACT_HEAD || 'UNKNOWN';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('REAL_CORPUS_PASSPORT_REFRESH_ENV_MISSING');
}

async function rest(path, init = {}) {
  const response = await fetch(SUPABASE_URL + path, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: 'Bearer ' + SERVICE_ROLE,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    throw new Error('SUPABASE_HTTP_' + response.status + ':' + text.slice(0, 1000));
  }
  return body;
}

const configuredTenantIds = [...new Set(
  String(process.env.E2E_CORPUS_TENANT_IDS || process.env.E2E_CORPUS_TENANT_ID || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)];
const targetTenantIds = configuredTenantIds.length ? configuredTenantIds : [];
if (!targetTenantIds.length) {
  throw new Error('REAL_CORPUS_TENANT_IDS_REQUIRED');
}

const tenantResults = [];
const results = [];

for (const tenantId of targetTenantIds) {
  const companies = await rest('/rest/v1/companies?select=id,name,created_at&id=eq.' + encodeURIComponent(tenantId) + '&limit=1');
  const company = companies?.[0];
  if (!company?.id) throw new Error('REAL_CORPUS_TENANT_NOT_FOUND:' + tenantId);

  const files = await rest(
    '/rest/v1/file_records?company_id=eq.' + encodeURIComponent(company.id) +
    '&metadata-%3E%3Ereport_corpus=eq.true' +
    '&select=id,file_name,file_hash,status,metadata' +
    '&order=created_at.asc&limit=500'
  );
  // Discover jobs for candidate report-corpus hashes, then apply the shared
  // provenance rule against each exact job source_path before refreshing evidence.
  const candidateFiles = (files || []).filter(file =>
    (file?.metadata?.report_corpus === true || String(file?.metadata?.report_corpus ?? '').toLowerCase() === 'true')
      && String(file?.file_hash || '').trim()
  );
  const candidateHashes = new Set(candidateFiles.map(file => String(file.file_hash || '').trim()).filter(Boolean));
  const jobsByHash = new Map();

  // Batch tenant-scoped job discovery; the former per-file query caused repeated scans and statement timeouts.
  if (candidateHashes.size > 0) {
    const pageSize = 200;
    let offset = 0;
    while (true) {
      const page = await rest(
        '/rest/v1/report_execution_jobs?company_id=eq.' + encodeURIComponent(company.id) +
        '&status=eq.completed' +
        '&checkpoint-%3E%3Estage=eq.rendered' +
        '&select=id,company_id,source_path,source_hash,status,checkpoint' +
        '&order=created_at.desc,id.asc&limit=' + pageSize + '&offset=' + offset
      );
      const jobs = Array.isArray(page) ? page : [];
      for (const job of jobs) {
        const sourceHash = String(job.source_hash || '').trim();
        if (!candidateHashes.has(sourceHash)) continue;
        const matching = jobsByHash.get(sourceHash) ?? [];
        matching.push(job);
        jobsByHash.set(sourceHash, matching);
      }
      if (jobs.length < pageSize) break;
      offset += pageSize;
      if (offset > 10000) throw new Error('REAL_CORPUS_RENDERED_JOB_SCAN_BOUND_EXCEEDED:' + company.id);
    }
  }

  const governedFileIds = new Set();
  for (const file of candidateFiles) {
    const jobs = jobsByHash.get(String(file.file_hash || '').trim()) ?? [];
    for (const job of jobs) {
      if (!isGovernedRealFileRecord(file, job.source_path)) continue;
      governedFileIds.add(String(file.id));
      try {
        const refreshed = await rest('/rest/v1/rpc/refresh_report_evidence_passport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_company_id: company.id, p_job_id: job.id }),
        });
        results.push({
          tenantId: company.id,
          tenantName: company.name,
          fileRecordId: file.id,
          fileName: file.file_name,
          reportJobId: job.id,
          sourceHash: file.file_hash,
          verificationStatus: refreshed?.verificationStatus ?? null,
          decisionReadiness: refreshed?.decisionReadiness ?? null,
          canonicalCoverage: refreshed?.canonicalCoverage ?? null,
          status: 'REFRESHED',
        });
      } catch (error) {
        results.push({
          tenantId: company.id,
          tenantName: company.name,
          fileRecordId: file.id,
          fileName: file.file_name,
          reportJobId: job.id,
          sourceHash: file.file_hash,
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  tenantResults.push({
    tenantId: company.id,
    tenantName: company.name,
    governedRealFiles: governedFileIds.size,
    renderedCompletedJobsVisited: results.filter(row => row.tenantId === company.id).length,
  });
}const ready = results.filter(row => row.status === 'REFRESHED' && row.verificationStatus === 'VERIFIED' && row.decisionReadiness === 'READY');
const failed = results.filter(row => row.status === 'FAILED');

const summary = {
  exactHead: EXACT_HEAD,
  tenants: tenantResults,
  discoveredGovernedRealFiles: tenantResults.reduce((sum, tenant) => sum + tenant.governedRealFiles, 0),
  renderedCompletedJobsVisited: results.length,
  readyPassports: ready.length,
  failedRefreshes: failed.length,
  results,
};

console.log(JSON.stringify(summary, null, 2));
if (failed.length > 0) process.exitCode = 1;
