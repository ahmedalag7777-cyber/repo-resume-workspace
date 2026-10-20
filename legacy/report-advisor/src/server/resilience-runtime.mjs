import { createHash, timingSafeEqual } from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';

export const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

export function requireMethod(req, res, method) {
  if (req.method !== method) {
    json(res, 405, { status: 'failed', error: 'method_not_allowed' });
    return false;
  }
  return true;
}

export function requireOperationalToken(req, res) {
  const expected = process.env.RESILIENCE_OPERATIONAL_TOKEN?.trim();
  const supplied = req.headers['x-resilience-token'];
  if (!expected || typeof supplied !== 'string') {
    json(res, 503, { status: 'blocked', error: 'operational_token_not_configured' });
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    json(res, 401, { status: 'failed', error: 'invalid_operational_token' });
    return false;
  }
  return true;
}

export function runtimeIdentity() {
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim()
    || process.env.NETLIFY_DEPLOY_ID?.trim()
    || process.env.DEPLOY_ID?.trim()
    || null;
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim()
    || process.env.COMMIT_REF?.trim()
    || process.env.CACHED_COMMIT_REF?.trim()
    || null;
  const runtimeEnvironment = process.env.VERCEL_ENV?.trim()
    || process.env.CONTEXT?.trim()
    || null;
  return {
    deployment_id: deploymentId,
    deployment_sha: deploymentSha,
    target_env: process.env.RESILIENCE_TARGET_ENV?.trim() || runtimeEnvironment,
    runtime_environment: runtimeEnvironment,
    provenance_contract_version: '4',
  };
}

export function requireConfig(res, keys) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    json(res, 503, { status: 'blocked', error: 'missing_runtime_configuration', missing });
    return false;
  }
  return true;
}

export async function supabaseRequest(path, options = {}) {
  const base = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!base || !key) throw new Error('missing_supabase_server_configuration');
  return fetch(`${base.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export async function supabaseUserRequest(path, token, options = {}) {
  const base = process.env.SUPABASE_URL?.trim();
  if (!base) throw new Error('missing_supabase_url');
  return fetch(`${base.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
}

export async function managementRequest(path, options = {}) {
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN?.trim();
  if (!token) throw new Error('missing_supabase_management_token');
  return fetch(`https://api.supabase.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

function ipv4ToInt(value) {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function ipv4InRange(value, base, maskBits) {
  const address = ipv4ToInt(value);
  const network = ipv4ToInt(base);
  if (address === null || network === null) return false;
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (address & mask) === (network & mask);
}

function expandIpv6(value) {
  const lower = value.toLowerCase();
  if (!lower.includes('::')) {
    const groups = lower.split(':');
    return groups.length === 8 && groups.every((group) => /^[0-9a-f]{1,4}$/.test(group)) ? groups : null;
  }
  if (lower.indexOf('::') !== lower.lastIndexOf('::')) return null;
  const [left, right] = lower.split('::');
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  if ([...leftGroups, ...rightGroups].some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  const missing = 8 - leftGroups.length - rightGroups.length;
  if (missing < 1) return null;
  return [...leftGroups, ...Array(missing).fill('0'), ...rightGroups];
}

function ipv6ToBigInt(value) {
  const groups = expandIpv6(value);
  if (!groups) return null;
  return groups.reduce((acc, group) => (acc << 16n) | BigInt(parseInt(group, 16)), 0n);
}

function ipv6InRange(value, base, prefixBits) {
  const address = ipv6ToBigInt(value);
  const network = ipv6ToBigInt(base);
  if (address === null || network === null) return false;
  const shift = 128n - BigInt(prefixBits);
  return shift === 128n ? true : (address >> shift) === (network >> shift);
}

export function isDisallowedOutboundAddress(address) {
  if (net.isIPv4(address)) {
    return [
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
      ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
      ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
      ['224.0.0.0', 4], ['240.0.0.0', 4],
    ].some(([base, bits]) => ipv4InRange(address, base, bits));
  }
  if (net.isIPv6(address)) {
    const mappedDecimal = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mappedDecimal && net.isIPv4(mappedDecimal[1])) return isDisallowedOutboundAddress(mappedDecimal[1]);
    const mappedHex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (mappedHex) {
      const high = parseInt(mappedHex[1], 16);
      const low = parseInt(mappedHex[2], 16);
      const mappedIpv4 = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
      return isDisallowedOutboundAddress(mappedIpv4);
    }
    return [
      ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
      ['2001:db8::', 32], ['2001::', 32],
    ].some(([base, bits]) => ipv6InRange(address, base, bits));
  }
  return false;
}

function normalizedHostname(url) {
  return url.hostname.startsWith('[') && url.hostname.endsWith(']') ? url.hostname.slice(1, -1) : url.hostname;
}

export function parseSecureOutboundUrl(value, configName) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`invalid_${configName}`);
  }
  if (url.protocol !== 'https:') throw new Error(`insecure_${configName}`);
  if (url.username || url.password) throw new Error(`credentialed_${configName}`);
  if (net.isIP(normalizedHostname(url)) && isDisallowedOutboundAddress(normalizedHostname(url))) {
    throw new Error(`private_${configName}`);
  }
  return url;
}

export async function secureOutboundFetch(value, configName, options = {}) {
  const url = parseSecureOutboundUrl(value, configName);
  const hostname = normalizedHostname(url);
  const controller = new AbortController();
  const timeoutMs = Number(process.env.RESILIENCE_OUTBOUND_TIMEOUT_MS || 15000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    throw new Error('invalid_resilience_outbound_timeout_ms');
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (!net.isIP(hostname)) {
      let addresses;
      try {
        addresses = await dns.lookup(hostname, { all: true, order: 'verbatim' });
      } catch {
        throw new Error(`dns_resolution_failed_${configName}`);
      }
      if (!addresses.length || addresses.some(({ address }) => isDisallowedOutboundAddress(address))) {
        throw new Error(`private_${configName}`);
      }
    }
    return await fetch(url, { ...options, redirect: 'error', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function persistHealth(companyId, component, status, latencyMs, metadata = {}) {
  const r = await supabaseRequest('/rest/v1/operational_health_snapshots', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, component, status, latency_ms: latencyMs, metadata }),
  });
  if (!r.ok) throw new Error(`health_evidence_persist_failed:${r.status}`);
}

export async function persistBackupEvidence(companyId, evidence) {
  const r = await supabaseRequest('/rest/v1/backup_verification_runs', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, ...evidence }),
  });
  if (!r.ok) throw new Error(`backup_evidence_persist_failed:${r.status}`);
}

export async function persistIncidentEvidence(companyId, evidence) {
  const r = await supabaseRequest('/rest/v1/incident_evidence', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, ...evidence }),
  });
  if (!r.ok) throw new Error(`incident_evidence_persist_failed:${r.status}`);
}

export async function sha256ResponseBody(response) {
  if (!response.body) return { sha256: createHash('sha256').digest('hex'), bytes: 0 };
  const hash = createHash('sha256');
  const reader = response.body.getReader();
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      bytes += value.byteLength;
      hash.update(value);
    }
  }
  return { sha256: hash.digest('hex'), bytes };
}

export function isProductionEnv() {
  return /^(prod|production)$/i.test(process.env.RESILIENCE_TARGET_ENV?.trim() || '');
}

export function isSafeRestoreTargetEnv() {
  const target = process.env.RESILIENCE_TARGET_ENV?.trim() || '';
  return /^(staging|preview|test|testing|qa|development|dev|recovery|dr)([-_].*)?$/i.test(target);
}
