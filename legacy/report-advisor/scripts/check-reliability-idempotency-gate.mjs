import assert from 'node:assert/strict';

function operation(input, store = new Map()) {
  assert(input?.tenant_id && input.operation_id, 'OPERATION_ID_REQUIRED');
  assert(input.payload_hash, 'PAYLOAD_HASH_REQUIRED');
  const prior = store.get(input.operation_id);
  if (prior) {
    assert.equal(prior.tenant_id, input.tenant_id, 'IDEMPOTENCY_TENANT_MISMATCH');
    assert.equal(prior.payload_hash, input.payload_hash, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
    return { ...prior, replayed: true };
  }
  const result = { tenant_id: input.tenant_id, operation_id: input.operation_id, payload_hash: input.payload_hash, status: 'COMMITTED' };
  store.set(input.operation_id, result);
  return result;
}
function health(h) {
  assert.equal(h.db, 'PASS', 'DB_UNHEALTHY');
  assert.equal(h.storage, 'PASS', 'STORAGE_UNHEALTHY');
  assert.equal(h.realtime, 'PASS', 'REALTIME_UNHEALTHY');
  assert.equal(h.queue, 'PASS', 'QUEUE_UNHEALTHY');
  return 'READY';
}
const store = new Map();
assert.equal(operation({tenant_id:'tenant-a',operation_id:'op-1',payload_hash:'h1'},store).status,'COMMITTED');
assert.equal(operation({tenant_id:'tenant-a',operation_id:'op-1',payload_hash:'h1'},store).replayed,true);
assert.throws(()=>operation({tenant_id:'tenant-b',operation_id:'op-1',payload_hash:'h1'},store),/IDEMPOTENCY_TENANT_MISMATCH/);
assert.throws(()=>operation({tenant_id:'tenant-a',operation_id:'op-1',payload_hash:'h2'},store),/IDEMPOTENCY_PAYLOAD_MISMATCH/);
assert.throws(()=>operation({tenant_id:'tenant-a',operation_id:'op-2'},store),/PAYLOAD_HASH_REQUIRED/);
assert.equal(health({db:'PASS',storage:'PASS',realtime:'PASS',queue:'PASS'}),'READY');
assert.throws(()=>health({db:'FAIL',storage:'PASS',realtime:'PASS',queue:'PASS'}),/DB_UNHEALTHY/);
console.log('reliability idempotency gate: PASS');
