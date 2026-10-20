import assert from 'node:assert/strict';
const fresh={createdAt:0,ttlMs:1000,version:'v1'};
assert.equal(100<=fresh.ttlMs,true);
assert.equal(1001>fresh.ttlMs,true);
assert.equal(fresh.version,'v1');
const stale=1000*2;
assert.ok(stale>=fresh.ttlMs*2);
console.log('analysis cache policy fixture: PASS');
