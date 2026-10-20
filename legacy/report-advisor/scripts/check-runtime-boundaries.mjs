import assert from 'node:assert/strict';

const evidenceTypes = new Set(['STATIC','CI','SYNTHETIC_RUNTIME','LIVE_SQL','AUTHENTICATED_LIVE','PRODUCTION']);
function requireEvidence(e) {
  assert(e && evidenceTypes.has(e.type), 'invalid evidence type');
  assert(e.sha && /^[0-9a-f]{40}$/.test(e.sha), 'exact SHA required');
  assert(e.environment, 'environment required');
}
function auth(ctx) { assert(ctx?.authenticated === true, 'AUTH_REQUIRED'); assert(ctx.tenant_id, 'TENANT_REQUIRED'); }
function sameTenant(resourceTenant, actorTenant) { return resourceTenant === actorTenant; }
function tenantGuard(ctx, resource) { auth(ctx); assert(sameTenant(resource.tenant_id, ctx.tenant_id), 'TENANT_BOUNDARY'); }
function storage(ctx, op, resource) { tenantGuard(ctx, resource); assert(['read','write','delete'].includes(op), 'STORAGE_OPERATION_INVALID'); return true; }
function realtime(ctx, channel) { tenantGuard(ctx, channel); return true; }
function ai(ctx, request) { tenantGuard(ctx, request); assert(request.scope === 'tenant', 'AI_SCOPE_REQUIRED'); return true; }
function terminalTransition(current, next) { const terminal = new Set(['COMPLETED','EXECUTED','FINALIZED']); assert(!terminal.has(current), 'terminal state cannot transition'); return next; }

requireEvidence({ type: 'SYNTHETIC_RUNTIME', sha: 'a'.repeat(40), environment: 'test' });
assert.throws(() => requireEvidence({ type: 'PRODUCTION', sha: 'bad', environment: 'prod' }));
const a = { authenticated: true, tenant_id: 'tenant-a' }, b = { authenticated: true, tenant_id: 'tenant-b' };
assert(storage(a, 'read', { tenant_id: 'tenant-a' })); assert(storage(a, 'write', { tenant_id: 'tenant-a' })); assert(storage(a, 'delete', { tenant_id: 'tenant-a' }));
assert(realtime(a, { tenant_id: 'tenant-a' })); assert(ai(a, { tenant_id: 'tenant-a', scope: 'tenant' }));
for (const f of [
  () => storage(b, 'read', { tenant_id: 'tenant-a' }),
  () => realtime(b, { tenant_id: 'tenant-a' }),
  () => ai(b, { tenant_id: 'tenant-a', scope: 'tenant' }),
  () => storage({ ...a, authenticated: false }, 'read', { tenant_id: 'tenant-a' }),
  () => ai(a, { tenant_id: 'tenant-a', scope: 'global' }),
]) assert.throws(f);
assert(sameTenant('tenant-a', 'tenant-a')); assert(!sameTenant('tenant-a', 'tenant-b'));
assert.throws(() => terminalTransition('COMPLETED', 'COMPLETED'));
console.log('runtime boundaries: PASS');
