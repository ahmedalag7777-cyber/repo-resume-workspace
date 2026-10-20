import assert from 'node:assert/strict';

function applyOnce(state, requestId, operation) {
  if (state.seen.has(requestId)) return state;
  const next = { ...state, seen: new Set(state.seen), applied: state.applied + 1 };
  next.seen.add(requestId);
  operation(next);
  return next;
}

let state = { seen: new Set(), applied: 0, value: 0 };
const op = s => { s.value += 10; };
state = applyOnce(state, 'req-1', op);
state = applyOnce(state, 'req-1', op);
assert.equal(state.applied, 1);
assert.equal(state.value, 10);

state = applyOnce(state, 'req-2', op);
assert.equal(state.applied, 2);
assert.equal(state.value, 20);

// Failed operations must not consume an idempotency key.
let failed = { seen: new Set(), applied: 0 };
assert.throws(() => {
  const next = applyOnce(failed, 'req-fail', s => { throw new Error('TRANSIENT_FAILURE'); });
  failed = next;
}, /TRANSIENT_FAILURE/);
assert.equal(failed.seen.has('req-fail'), false);

console.log('reliability idempotency contract: PASS');
