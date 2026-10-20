import assert from 'node:assert/strict';
const generated = Object.freeze({ source:'server', generated_at:'2026-09-01T00:00:00Z', hash:'generated-hash' });
const requested = { source:'caller', generated_at:'caller-time', hash:'caller-hash' };
const effective = { ...requested, ...generated };
assert.equal(effective.source, 'server');
assert.equal(effective.generated_at, generated.generated_at);
assert.equal(effective.hash, generated.hash);
assert.throws(() => { generated.hash = 'overwrite'; }, TypeError);
console.log('certification immutability: PASS');
